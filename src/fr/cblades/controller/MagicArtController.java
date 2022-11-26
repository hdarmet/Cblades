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
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Controller
public class MagicArtController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {
	static final Logger log = Logger.getLogger("summer");

	@MIME(url="/api/magicart/documents/:docname")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("docname");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String docName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
				.setName(docName)
				.setStream(PlatformManager.get().getInputStream("/magics/"+docName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeMagicArtImages(Map<String, Object> params, MagicArt magicArt) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		for (FileSpecification file : files) {
			int ordinalIdx = file.getName().indexOf("-");
			if (ordinalIdx<0) {
				String magicArtFileName = "magicart" + magicArt.getId() + "." + file.getExtension();
				String magicArtWebName = "magicart" + magicArt.getId() + "-" + System.currentTimeMillis() + "." + file.getExtension();
				copyStream(file.getStream(), PlatformManager.get().getOutputStream("/magics/" + magicArtFileName));
				magicArt.setIllustration("/api/magicart/documents/" +magicArtWebName);
			}
			else {
				boolean isIcon = file.getName().indexOf("icon-")==0;
				int ordinal = Integer.parseInt(file.getName().substring(ordinalIdx+1));
				if (isIcon) {
					String sheetFileIconName = "sheeticon" + magicArt.getId() + "_" + ordinal + "." + file.getExtension();
					String sheetWebIconName = "sheeticon" + magicArt.getId() + "_" + ordinal + "-" + System.currentTimeMillis() + "." + file.getExtension();
					copyStream(file.getStream(), PlatformManager.get().getOutputStream("/magics/" + sheetFileIconName));
					magicArt.getSheet(ordinal).setIcon("/api/magicart/documents/" + sheetWebIconName);
				}
				else {
					String sheetFileName = "sheet" + magicArt.getId() + "_" + ordinal + "." + file.getExtension();
					String sheetWebName = "sheet" + magicArt.getId() + "_" + ordinal + "-" + System.currentTimeMillis() + "." + file.getExtension();
					copyStream(file.getStream(), PlatformManager.get().getOutputStream("/magics/" + sheetFileName));
					magicArt.getSheet(ordinal).setPath("/api/magicart/documents/" + sheetWebName);
				}
			}
		}
	}

	@REST(url="/api/magicart/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			MagicArt newMagicArt = writeToProposedMagicArt(em, request, new MagicArt());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						addComment(request, newMagicArt, author);
						newMagicArt.setStatus(MagicArtStatus.PROPOSED);
						newMagicArt.setAuthor(author);
						persist(em, newMagicArt);
						storeMagicArtImages(params, newMagicArt);
						result.set(readFromMagicArt(newMagicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Magic Art with name (%s) already exists",
							request.get("name"), null
						);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	@REST(url="/api/magicart/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			MagicArt magicArt = findMagicArt(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToProposedMagicArt(em, request, magicArt);
						addComment(request, magicArt, author);
						storeMagicArtImages(params, magicArt);
						flush(em);
						result.set(readFromMagicArt(magicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				},
				verifyIfAdminOrOwner(magicArt)
			);
		});
		return result.get();
	}

	@REST(url="/api/magicart/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			MagicArt newMagicArt = writeToMagicArt(em, request, new MagicArt());
			ifAuthorized(
				user->{
					try {
						persist(em, newMagicArt);
						storeMagicArtImages(params, newMagicArt);
						result.set(readFromMagicArt(newMagicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Magic Art with name (%s) already exists",
							request.get("name"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/magicart/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(m) from MagicArt m";
				String queryString = "select m from MagicArt m left outer join fetch m.author a left outer join fetch a.access w";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" where fts('pg_catalog.english', " +
						"m.name||' '||" +
						"m.description||' '||" +
						"m.document.text ||' '||" +
						"m.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long magicArtCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<MagicArt> magicArts = (search == null) ?
					findPagedMagicArts(em.createQuery(queryString), pageNo):
					findPagedMagicArts(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("magicArts", readFromMagicArtSummaries(magicArts))
					.put("count", magicArtCount)
					.put("page", pageNo)
					.put("pageSize", MagicArtController.MAGIC_ARTS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/magicart/live", method=Method.GET)
	public Json getLive(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Collection<MagicArt> magicArts = findMagicArts(em.createQuery("select m from MagicArt m where m.status=:status"),
				"status", MagicArtStatus.LIVE);
			result.set(readFromMagicArtSummaries(magicArts));
		});
		return result.get();
	}

	@REST(url="/api/magicart/by-name/:name", method=Method.GET)
	public Json getByTitle(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String name = (String)params.get("name");
			MagicArt magicArt = getSingleResult(em,
				"select m from MagicArt m " +
					"join fetch m.firstSheet s " +
					"join fetch m.author w " +
					"join fetch w.access " +
					"where m.name=:name",
				"name", name);
			if (magicArt==null) {
				throw new SummerControllerException(404,
					"Unknown Magic Art with name %s", name
				);
			}
			ifAuthorized(user->{
				result.set(readFromMagicArt(magicArt));
			},
			verifyIfAdminOrOwner(magicArt));
		});
		return result.get();
	}

	@REST(url="/api/magicart/load/:id", method=Method.GET)
	public Json getMagicArtWithComments(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			MagicArt magicArt = findMagicArt(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromMagicArt(magicArt));
			},
			verifyIfAdminOrOwner(magicArt));
		});
		return result.get();
	}

	@REST(url="/api/magicart/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			MagicArt magicArt = findMagicArt(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, magicArt);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				verifyIfAdminOrOwner(magicArt)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/magicart/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			MagicArt magicArt = findMagicArt(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToMagicArtStatus(em, request, magicArt);
						flush(em);
						result.set(readFromMagicArt(magicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/magicart/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			MagicArt magicArt = findMagicArt(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToMagicArt(em, request, magicArt);
						storeMagicArtImages(params, magicArt);
						flush(em);
						result.set(readFromMagicArt(magicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/magicart/published/:id", method=Method.GET)
	public Json getPublishedMagicArt(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			MagicArt magicArt = findMagicArt(em, new Long(id));
			if (magicArt.getStatus() != MagicArtStatus.LIVE) {
				throw new SummerControllerException(409, "MagicArt is not live.");
			}
			result.set(readFromPublishedMagicArt(magicArt));
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(MagicArt magicArt) {
		return (user, roles) -> {
			if (magicArt.getAuthor() != null && magicArt.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	MagicArt writeToProposedMagicArt(EntityManager em, Json json, MagicArt magicArt) {
		try {
			verify(json)
				.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 200)
				.checkPattern("name", "[\\d\\s\\w]+")
				.checkMinSize("newComment", 2).checkMaxSize("newComment", 200)
				.checkRequired("illustration")
				.checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
				.checkRequired("description")
				.checkMinSize("description", 2)
				.checkMaxSize("description", 19995)
				.each("sheets", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("ordinal")
					.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 200)
					.checkPattern("name", "[\\d\\s\\w]+")
					.checkRequired("description")
					.checkMinSize("description", 2)
					.checkMaxSize("description", 19995)
					.checkRequired("icon")
					.checkMinSize("icon", 2).checkMaxSize("icon", 200)
				)
				.ensure();
			sync(json, magicArt)
				.write("version")
				.write("name")
				.write("description")
				.syncEach("sheets", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.write("ordinal")
					.write("name")
					.write("description")
					.write("icon")
					.write("path")
					.write("description")
				);
			magicArt.setFirstSheet(magicArt.getSheet(0));
			magicArt.buildDocument();
			return magicArt;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	void addComment(Json json, MagicArt magicArt, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			magicArt.addComment(new Comment().setDate(new Date()).setText(comment).setAuthor(author));
		}
	}

	MagicArt writeToMagicArtStatus(EntityManager em, Json json, MagicArt magicArt) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", MagicArtStatus.byLabels().keySet())
			.ensure();
		sync(json, magicArt)
			.write("status", label->MagicArtStatus.byLabels().get(label));
		return magicArt;
	}

	MagicArt writeToMagicArt(EntityManager em, Json json, MagicArt magicArt) {
		try {
			verify(json)
				.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 200)
				.checkPattern("name", "[\\d\\s\\w]+")
				.check("status", ThemeStatus.byLabels().keySet())
				.checkRequired("illustration")
				.checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
				.checkRequired("description")
				.checkMinSize("description", 2)
				.checkMaxSize("description", 19995)
				.each("sheets", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("ordinal")
					.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 200)
					.checkPattern("name", "[\\d\\s\\w]+")
					.checkRequired("description")
					.checkMinSize("description", 2)
					.checkMaxSize("description", 19995)
					.checkRequired("icon")
					.checkMinSize("icon", 2).checkMaxSize("icon", 200)
					.checkRequired("path")
					.checkMinSize("path", 2).checkMaxSize("path", 200)
				)
				.each("comments", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, magicArt)
				.write("version")
				.write("name")
				.write("illustration")
				.write("description")
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
				.write("status", label->MagicArtStatus.byLabels().get(label))
				.syncEach("sheets", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.write("ordinal")
					.write("name")
					.write("description")
					.write("icon")
					.write("path")
				)
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			magicArt.setFirstSheet(magicArt.getSheet(0));
			magicArt.buildDocument();
			return magicArt;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Json readFromMagicArtSummary(MagicArt magicArt) {
		Json json = Json.createJsonObject();
		sync(json, magicArt)
			.read("id")
			.read("version")
			.read("name")
			.read("illustration")
			.read("description")
			.read("status", MagicArtStatus::getLabel)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		return json;
	}

	Json readFromMagicArt(MagicArt magicArt) {
		Json json = Json.createJsonObject();
		sync(json, magicArt)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("illustration")
			.read("status", MagicArtStatus::getLabel)
			.readEach("sheets", (pJson, sheet)->sync(pJson, sheet)
				.read("id")
				.read("version")
				.read("name")
				.read("description")
				.read("icon")
				.read("path")
			)
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

	Json readFromPublishedMagicArt(MagicArt magicArt) {
		Json json = Json.createJsonObject();
		sync(json, magicArt)
			.read("id")
			.read("name")
			.read("description")
			.read("illustration")
			.readEach("sheets", (pJson, sheet)->sync(pJson, sheet)
				.read("id")
				.read("name")
				.read("description")
				.read("icon")
				.read("path")
			);
		return json;
	}

	MagicArt findMagicArt(EntityManager em, long id) {
		MagicArt magicArt = find(em, MagicArt.class, id);
		if (magicArt==null) {
			throw new SummerControllerException(404,
				"Unknown Magic Art with id %d", id
			);
		}
		return magicArt;
	}

	Collection<MagicArt> findMagicArts(Query query, Object... params) {
		setParams(query, params);
		List<MagicArt> magicArts = getResultList(query);
		return magicArts.stream().distinct().collect(Collectors.toList());
	}

	Collection<MagicArt> findPagedMagicArts(Query query, int page, Object... params) {
		setParams(query, params);
		List<MagicArt> magicArts = getPagedResultList(query, page* MagicArtController.MAGIC_ARTS_BY_PAGE, MagicArtController.MAGIC_ARTS_BY_PAGE);
		return magicArts.stream().distinct().collect(Collectors.toList());
	}

	Json readFromMagicArtSummaries(Collection<MagicArt> magicArts) {
		Json list = Json.createJsonArray();
		magicArts.stream().forEach(magicArt->list.push(readFromMagicArtSummary(magicArt)));
		return list;
	}

	static int MAGIC_ARTS_BY_PAGE = 10;
}