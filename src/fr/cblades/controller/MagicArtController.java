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
import org.summer.data.Synchronizer;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler arts de magie
 */
@Controller
public class MagicArtController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam,
		ControllerSunbeam, StandardUsers, CommonEntities {
	static final Logger log = Logger.getLogger("summer");

	/**
	 * Endpoint (accessible via "/api/magicart/documents/:docname") permettant de télécharger depuis le navigateur
	 * une image associée à un art de magie.
	 * @param params paramètres de l'URL (on utilisera le paraètre "docname" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/magicart/documents/:docname")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/magics/");
	}

	void storeMagicArtImages(Map<String, Object> params, MagicArt magicArt) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		FileSpecification magicArtImage = storeSheetImages(
			files, magicArt.getId(), magicArt.getSheets(),
			"MagicArt", "/magics/", "/api/magicart/documents/"
		);
		if (magicArtImage != null) {
			magicArt.setIllustration(saveFile(magicArtImage,
				"magicart" + magicArt.getId(),
				"/magics/", "/api/magicart/documents/"
			));
		}
	}

	@REST(url="/api/magicart/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		checkJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						MagicArt newMagicArt = writeToMagicArt(em, request, new MagicArt(), Usage.PROPOSE);
						Account author = Account.find(em, user);
						addComment(request, newMagicArt, author);
						newMagicArt.setStatus(MagicArtStatus.PROPOSED);
						newMagicArt.setAuthor(author);
						persist(em, newMagicArt);
						storeMagicArtImages(params, newMagicArt);
						flush(em);
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
		long id = getLongParam(params, "id", "The Magic Art ID is missing or invalid (%s)");
		checkJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			MagicArt magicArt = findMagicArt(em, id);
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToMagicArt(em, request, magicArt, Usage.AMEND);
						addComment(request, magicArt, author);
						storeMagicArtImages(params, magicArt);
						flush(em);
						result.set(readFromMagicArt(magicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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
		checkJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						MagicArt newMagicArt = writeToMagicArt(em, request, new MagicArt(), Usage.CREATE);
						persist(em, newMagicArt);
						storeMagicArtImages(params, newMagicArt);
						flush(em);
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


	@REST(url="/api/magicart/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Magic Art ID is missing or invalid (%s)");
		checkJson(request, Usage.UPDATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(
				user -> {
					try {
						MagicArt magicArt = findMagicArt(em, id);
						writeToMagicArt(em, request, magicArt, Usage.UPDATE);
						storeMagicArtImages(params, magicArt);
						flush(em);
						result.set(readFromMagicArt(magicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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
			inReadTransaction(em->{
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
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Collection<MagicArt> magicArts = findMagicArts(em.createQuery("select m from MagicArt m where m.status=:status"),
				"status", MagicArtStatus.LIVE);
			result.set(readFromMagicArtSummaries(magicArts));
		});
		return result.get();
	}

	@REST(url="/api/magicart/by-name/:name", method=Method.GET)
	public Json getByName(Map<String, Object> params, Json request) {
		String name = getStringParam(params, "name", null,"The Magic Art's name is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
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
		long id = getLongParam(params, "id", "The Magic Art ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			MagicArt magicArt = findMagicArt(em, id);
			ifAuthorized(user->{
				result.set(readFromMagicArt(magicArt));
			},
			verifyIfAdminOrOwner(magicArt));
		});
		return result.get();
	}

	@REST(url="/api/magicart/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Magic Art ID is missing or invalid (%s)");
		inTransaction(em->{
			try {
				MagicArt magicArt = findMagicArt(em, id);
				ifAuthorized(
					user->remove(em, magicArt),
					verifyIfAdminOrOwner(magicArt)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/magicart/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Magic Art ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(
				user -> {
					try {
						MagicArt magicArt = findMagicArt(em, id);
						writeToMagicArtStatus(em, request, magicArt);
						flush(em);
						result.set(readFromMagicArt(magicArt));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/magicart/published/:id", method=Method.GET)
	public Json getPublishedMagicArt(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Magic Art ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			MagicArt magicArt = findMagicArt(em, id);
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

	void addComment(Json json, MagicArt magicArt, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			magicArt.addComment(new Comment()
                .setDate(PlatformManager.get().today())
                .setText(comment)
                .setAuthor(author));
		}
	}

	MagicArt writeToMagicArtStatus(EntityManager em, Json json, MagicArt magicArt) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", MagicArtStatus.byLabels().keySet())
			.ensure();
		sync(json, magicArt)
			.write("status", label->MagicArtStatus.byLabels().get(label));
		return magicArt;
	}

	void checkJson(Json json, Usage usage) {
		verify(json)
            .process(v-> {
                if (usage.creation) {v
                    .checkRequired("name")
                    .checkRequired("description");
                }
            })
			.checkMinSize("name", 2).checkMaxSize("name", 200)
			.checkPattern("name", "[\\d\\s\\w]+")
			.checkMinSize("description", 2)
			.checkMaxSize("description", 19995)
		    .process(this::checkSheets)
            .process(v-> {
				if (usage.propose)
					checkNewComment(v);
				else {
					v.check("status", MagicArtStatus.byLabels().keySet());
					checkComments(v);
				}
            })
            .ensure();
	}

	MagicArt writeToMagicArt(EntityManager em, Json json, MagicArt magicArt, Usage usage) {
		Synchronizer synchronizer = sync(json, magicArt)
			.write("version")
			.write("name")
			.write("description")
			.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
			.write("status", label->MagicArtStatus.byLabels().get(label));
		writeSheets(synchronizer);
		if (!usage.propose) {
			synchronizer
					.write("status", label -> MagicArtStatus.byLabels().get(label));
			writeComments(synchronizer);
		}
		magicArt.setFirstSheet(magicArt.getSheet(0));
		magicArt.buildDocument();
		return magicArt;
	}

	Json readFromMagicArtSummary(MagicArt magicArt) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, magicArt)
			.read("id")
			.read("version")
			.read("name")
			.read("illustration")
			.read("description")
			.read("status", MagicArtStatus::getLabel);
		readAuthor(synchronizer);
		return json;
	}

	Json readFromMagicArt(MagicArt magicArt) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, magicArt)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("illustration")
			.read("status", MagicArtStatus::getLabel);
		readAuthor(synchronizer);
		readSheets(synchronizer);
		readComments(synchronizer);
		return json;
	}

	Json readFromPublishedMagicArt(MagicArt magicArt) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, magicArt)
			.read("id")
			.read("name")
			.read("description")
			.read("illustration");
		readSheets(synchronizer);
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