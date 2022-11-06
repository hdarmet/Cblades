package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.summer.FileSpecification;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.MIME;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

@Controller
public class ThemeController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@MIME(url="/api/theme/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("imagename");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String imageName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
				.setName(imageName)
				.setStream(PlatformManager.get().getInputStream("/themes/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeThemeImages(Map<String, Object> params, Theme theme) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files.length > 0) {
			if (files.length!= 1) throw new SummerControllerException(400, "One Theme file must be loaded.");
			String fileName = "theme" + theme.getId() + "." + files[0].getExtension();
			String webName = "theme" + theme.getId() + "-" + System.currentTimeMillis() + "." + files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/themes/" + fileName));
			theme.setIllustration("/api/theme/images/" + webName);
		}
	}

	@REST(url="/api/theme/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Theme newTheme = writeToProposedTheme(request, new Theme());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						addComment(request, newTheme, author);
						newTheme.setStatus(ThemeStatus.PROPOSED);
						newTheme.setAuthor(author);
						persist(em, newTheme);
						storeThemeImages(params, newTheme);
						result.set(readFromTheme(newTheme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Theme with title (%s) already exists",
							request.get("title"), null
						);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	@REST(url="/api/theme/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Theme theme = findTheme(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToProposedTheme(request, theme);
						addComment(request, theme, author);
						storeThemeImages(params, theme);
						flush(em);
						result.set(readFromTheme(theme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				},
				verifyIfAdminOrOwner(theme)
			);
		});
		return result.get();
	}

	@REST(url="/api/theme/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Theme newTheme = writeToTheme(em, request, new Theme());
			ifAuthorized(
				user->{
					try {
						persist(em, newTheme);
						storeThemeImages(params, newTheme);
						result.set(readFromTheme(newTheme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Theme with title (%s) already exists",
							request.get("title"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/theme/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(t) from Theme t";
				String queryString = "select t from Theme t";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" where fts('pg_catalog.english', " +
						"t.title||' '||" +
						"t.category||' '||" +
						"t.description||' '||" +
						"t.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long themeCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Theme> themes = (search == null) ?
					findPagedThemes(em.createQuery(queryString), pageNo):
					findPagedThemes(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("themes", readFromThemeSummaries(themes))
					.put("count", themeCount)
					.put("page", pageNo)
					.put("pageSize", ThemeController.THEMES_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/theme/live", method=Method.GET)
	public Json getLive(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Collection<Theme> themes = findThemes(em.createQuery(
					"select t from Theme t where t.status=:status"
				),
				"status", ThemeStatus.LIVE);
			result.set(readFromThemeSummaries(themes));
		});
		return result.get();
	}

	@REST(url="/api/theme/category/:category", method=Method.GET)
	public Json getByCategory(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			String category = (String)params.get("category");
			String search = (String)params.get("search");
			String queryString = "select t from Theme t where t.category=:category";
			if (search!=null) {
				/*
				search = StringReplacer.replace(search,
						"tester", "test");
				 */
				String whereClause =" and fts('pg_catalog.english', " +
					"t.title||' '||" +
					"t.category||' '||" +
					"t.description||' '||" +
					"t.status, :search) = true";
				queryString+=whereClause;
			}
			Collection<Theme> themes = (search == null) ?
				findPagedThemes(em.createQuery(queryString), pageNo, "category", ThemeCategory.getByName(category)):
				findPagedThemes(em.createQuery(queryString), pageNo, "category", ThemeCategory.getByName(category),
						"search", search);
			result.set(readFromPublishedThemes(themes));
		});
		return result.get();
	}

	@REST(url="/api/theme/by-title/:title", method=Method.GET)
	public Json getByTitle(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String title = (String)params.get("title");
			Theme theme = getSingleResult(em,
				"select t from Theme t " +
						"left outer join fetch t.author a " +
						"left outer join fetch a.access " +
						"where t.title = :title",
				"title", title);
			if (theme==null) {
				throw new SummerControllerException(404,
					"Unknown Theme with title %s", title
				);
			}
			ifAuthorized(user->{
				result.set(readFromTheme(theme));
			},
			verifyIfAdminOrOwner(theme));
		});
		return result.get();
	}

	@REST(url="/api/theme/load/:id", method=Method.GET)
	public Json getThemeWithComments(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Theme theme = findTheme(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromTheme(theme));
			},
			verifyIfAdminOrOwner(theme));
		});
		return result.get();
	}

	@REST(url="/api/theme/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			Theme theme = findTheme(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, theme);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				verifyIfAdminOrOwner(theme)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/theme/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Theme theme = findTheme(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToTheme(em, request, theme);
						storeThemeImages(params, theme);
						flush(em);
						result.set(readFromTheme(theme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/theme/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Theme theme = findTheme(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToThemeStatus(em, request, theme);
						flush(em);
						result.set(readFromTheme(theme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(Theme theme) {
		return (user, roles) -> {
			if (theme.getAuthor() != null && theme.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	Theme writeToProposedTheme(Json json, Theme theme) {
		verify(json)
			.check("category", ThemeCategory.byLabels().keySet())
			.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkRequired("description").checkMinSize("description", 2).checkMaxSize("description", 1000)
			.checkRequired("illustration").checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
			.checkMinSize("newComment", 2).checkMaxSize("newComment", 200)
			.ensure();
		sync(json, theme)
			.write("version")
			.write("category", label->ThemeCategory.byLabels().get(label))
			.write("title")
			.write("description")
			.write("illustration");
		return theme;
	}

	void addComment(Json json, Theme theme, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			theme.addComment(new Comment().setDate(new Date()).setText(comment).setAuthor(author));
		}
	}

	Theme writeToTheme(EntityManager em, Json json, Theme theme) {
		try {
			verify(json)
				.check("category", ThemeCategory.byLabels().keySet())
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("description").checkMinSize("description", 2).checkMaxSize("description", 1000)
				.checkRequired("illustration").checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
				.check("status", ThemeStatus.byLabels().keySet())
				.each("comments", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, theme)
				.write("version")
				.write("category", label->ThemeCategory.byLabels().get(label))
				.write("title")
				.write("description")
				.write("illustration")
				.write("status", label->ThemeStatus.byLabels().get(label))
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			return theme;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Theme writeToThemeStatus(EntityManager em, Json json, Theme theme) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", ThemeStatus.byLabels().keySet())
			.ensure();
		sync(json, theme)
			.write("status", label->ThemeStatus.byLabels().get(label));
		return theme;
	}

	Json readFromThemeSummary(Theme theme) {
		Json json = Json.createJsonObject();
		sync(json, theme)
			.read("id")
			.read("version")
			.read("category", ThemeCategory::getLabel)
			.read("title")
			.read("description")
			.read("illustration")
			.read("status", ThemeStatus::getLabel)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		return json;
	}

	Json readFromPublishedTheme(Theme theme) {
		Json json = Json.createJsonObject();
		sync(json, theme)
			.read("id")
			.read("title")
			.read("description")
			.read("illustration");
		return json;
	}

	Json readFromTheme(Theme theme) {
		Json json = Json.createJsonObject();
		sync(json, theme)
			.read("id")
			.read("version")
			.read("category", ThemeCategory::getLabel)
			.read("title")
			.read("description")
			.read("illustration")
			.read("status", ThemeStatus::getLabel)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			)
			.readEach("comments", (hJson, hex)->sync(hJson, hex)
				.read("id")
				.read("version")
				.readDate("date")
				.read("text")
			);
		return json;
	}

	Theme findTheme(EntityManager em, long id) {
		Theme theme = find(em, Theme.class, id);
		if (theme==null) {
			throw new SummerControllerException(404,
				"Unknown Theme with id %d", id
			);
		}
		return theme;
	}

	Collection<Theme> findThemes(Query query, Object... params) {
		setParams(query, params);
		List<Theme> themes = getResultList(query);
		return themes.stream().distinct().collect(Collectors.toList());
	}

	Collection<Theme> findPagedThemes(Query query, int page, Object... params) {
		setParams(query, params);
		List<Theme> themes = getPagedResultList(query, page* ThemeController.THEMES_BY_PAGE, ThemeController.THEMES_BY_PAGE);
		return themes.stream().distinct().collect(Collectors.toList());
	}

	Json readFromThemeSummaries(Collection<Theme> themes) {
		Json list = Json.createJsonArray();
		themes.stream().forEach(theme->list.push(readFromThemeSummary(theme)));
		return list;
	}

	Json readFromPublishedThemes(Collection<Theme> themes) {
		Json list = Json.createJsonArray();
		themes.stream().forEach(theme->list.push(readFromPublishedTheme(theme)));
		return list;
	}

	static int THEMES_BY_PAGE = 10;
}
