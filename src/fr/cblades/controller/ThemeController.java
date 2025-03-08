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
import org.summer.controller.Verifier;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des thèmes
 */
@Controller
public class ThemeController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam,
	StandardUsers,CommonEntities {

	/**
	 * Endpoint (accessible via "/api/theme/images/:imagename") permettant de télécharger depuis le navigateur
	 * une image associée à un thème.
	 * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/theme/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/themes/");
	}

	/**
	 * Stocke sur le système de fichiers/blob Cloud, l'image associée à un thème (il ne peut y en avoir qu'une) et
	 * l'associe au thème (en précisant l'URL de l'image dans le champ "illustration" du thème). Le contenu de l'image
	 * a été, au préalable, extrait du message HTTP (par Summer) et passé dans le paramètre params sous l'étiquette
	 * MULTIPART_FILES (un tableau qui ne doit contenir au plus qu'un élément)<br>
	 * L'image sera stockée dans le sous répertoire/blob nommé "/themes" sous un nom qui est la concaténation
	 * de "theme" et l'ID du thème.
	 * @param params paramètres d'appel HTTP (l'image a stocker si elle existe, est accessible via l'étiquette
	 *               MULTIPART_FILES)
	 * @param theme thème auquel il faut associer l'image.
	 */
	void storeThemeImages(Map<String, Object> params, Theme theme) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files!=null) {
			if (files.length!= 1) throw new SummerControllerException(400, "One Theme file must be loaded.");
			theme.setIllustration(saveFile(files[0],
				"theme" + theme.getId(),
				"/themes/", "/api/theme/images/"
			));
		}
	}

	@REST(url="/api/theme/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		checkJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Theme newTheme = writeToTheme(em, request, new Theme(), Usage.PROPOSE);
						Account author = Account.find(em, user);
						addComment(request, newTheme, author);
						newTheme.setStatus(ThemeStatus.PROPOSED);
						newTheme.setAuthor(author);
						persist(em, newTheme);
						storeThemeImages(params, newTheme);
						flush(em);
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
		long id = getLongParam(params, "id", "The Theme ID is missing or invalid (%s)");
		checkJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransactionUntilSuccessful(em-> {
			Theme theme = findTheme(em, id);
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToTheme(em, request, theme, Usage.AMEND);
						addComment(request, theme, author);
						storeThemeImages(params, theme);
						flush(em);
						result.set(readFromTheme(theme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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
		checkJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
					try {
						Theme newTheme = writeToTheme(em, request, new Theme(), Usage.CREATE);
						persist(em, newTheme);
						storeThemeImages(params, newTheme);
						flush(em);
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
			inReadTransaction(em->{
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
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
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
		inReadTransaction(em->{
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			String category = getStringParam(params, "category",  null,"The requested category is invalid (%s)");
			String search = (String)params.get("search");
			String queryString = "select t from Theme t" +
				" where t.category=:category" +
				" and t.status=:status";
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
				findPagedThemes(em.createQuery(queryString), pageNo, "category",
					ThemeCategory.byLabel(category),
					"status", ThemeStatus.LIVE):
				findPagedThemes(em.createQuery(queryString), pageNo, "category",
					ThemeCategory.byLabel(category),
					"status", ThemeStatus.LIVE,
					"search", search);
			result.set(readFromPublishedThemes(themes));
		});
		return result.get();
	}

	@REST(url="/api/theme/by-title/:title", method=Method.GET)
	public Json getByTitle(Map<String, Object> params, Json request) {
		String title = getStringParam(params,"title", null, "The Title of the Theme is missing (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
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
		long id = getLongParam(params, "id", "The Theme ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Theme theme = findTheme(em, id);
			ifAuthorized(user->{
				result.set(readFromTheme(theme));
			},
			verifyIfAdminOrOwner(theme));
		});
		return result.get();
	}

	@REST(url="/api/theme/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Theme ID is missing or invalid (%s)");
		inTransactionUntilSuccessful(em->{
			try {
				Theme theme = findTheme(em, id);
				ifAuthorized(
					user->{
							remove(em, theme);
					},
					verifyIfAdminOrOwner(theme)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/theme/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Theme ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Theme theme = findTheme(em, id);
			ifAuthorized(
				user -> {
					try {
						checkJson(request, Usage.UPDATE);
						writeToTheme(em, request, theme, Usage.UPDATE);
						storeThemeImages(params, theme);
						flush(em);
						result.set(readFromTheme(theme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/theme/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Theme ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransactionUntilSuccessful(em-> {
			ifAuthorized(
				user -> {
					try {
						Theme theme = findTheme(em, id);
						writeToThemeStatus(em, request, theme);
						flush(em);
						result.set(readFromTheme(theme));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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

	void addComment(Json json, Theme theme, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			theme.addComment(new Comment()
				.setDate(PlatformManager.get().today())
				.setText(comment)
				.setAuthor(author));
		}
	}

	void checkJson(Json json, Usage usage) {
		verify(json)
			.process(v->{
				if (usage.creation) {v
					.checkRequired("title")
					.checkRequired("description");
				}
			})
			.check("category", ThemeCategory.byLabels().keySet())
			.checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkMinSize("description", 2).checkMaxSize("description", 1000)
			.check("status", ThemeStatus.byLabels().keySet())
			.process(v->{
				if (usage.propose) {
					v.checkMinSize("newComment", 2).checkMaxSize("newComment", 200);
				}
				else {
					v.check("status", ThemeStatus.byLabels().keySet());
					checkComments(v);
				}
			})
			.ensure();
	}

	Theme writeToTheme(EntityManager em, Json json, Theme theme, Usage usage) {
		sync(json, theme)
			.write("version")
			.write("category", label->ThemeCategory.byLabels().get(label))
			.write("title")
			.write("description")
			.write("status", label->ThemeStatus.byLabels().get(label))
			.process(s->{
				if (!usage.propose) {s
				.write("status", label -> ThemeStatus.byLabels().get(label));
					writeComments(s);
				}
			});
		return theme;
	}

	Theme writeToThemeStatus(EntityManager em, Json json, Theme theme) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", ThemeStatus.byLabels().keySet())
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
			.process(s->readAuthor(s));
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
			.process(s->readAuthor(s))
			.process(s->readComments(s));
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
