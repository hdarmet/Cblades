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
import java.util.*;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des factions
 */
@Controller
public class FactionController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam,
		StandardUsers, CommonEntities {
	static final Logger log = Logger.getLogger("summer");

	/**
	 * Endpoint (accessible via "/api/faction/documents/:docname") permettant de télécharger depuis le navigateur
	 * une image associée à une faction.
	 * @param params paramètres de l'URL (on utilisera le paraètre "docname" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/faction/documents/:docname")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/factions/");
	}

	/**
	 *
	 * @param params
	 * @param faction
	 */
	void storeFactionImages(Map<String, Object> params, Faction faction) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		FileSpecification factionImage = storeSheetImages(
			files, faction.getId(), faction.getSheets(),
			"Faction", "/factions/", "/api/faction/documents/"
		);
		if (factionImage != null) {
			faction.setIllustration(saveFile(factionImage,
				"faction" + faction.getId(),
				"/factions/", "/api/faction/documents/"
			));
		}
	}

	@REST(url="/api/faction/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		checkJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Faction newFaction = writeToFaction(em, request, new Faction(), Usage.PROPOSE);
						Account author = Account.find(em, user);
						addComment(request, newFaction, author);
						newFaction.setStatus(FactionStatus.PROPOSED);
						newFaction.setAuthor(author);
						persist(em, newFaction);
						storeFactionImages(params, newFaction);
						flush(em);
						result.set(readFromFaction(newFaction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Faction with name (%s) already exists",
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

	@REST(url="/api/faction/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Faction ID is missing or invalid (%s)");
		checkJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Faction faction = findFaction(em, id);
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToFaction(em, request, faction, Usage.AMEND);
						addComment(request, faction, author);
						storeFactionImages(params, faction);
						flush(em);
						result.set(readFromFaction(faction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				},
				verifyIfAdminOrOwner(faction)
			);
		});
		return result.get();
	}

	@REST(url="/api/faction/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		checkJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Faction newFaction = writeToFaction(em, request, new Faction(), Usage.CREATE);
			ifAuthorized(
				user->{
					try {
						persist(em, newFaction);
						storeFactionImages(params, newFaction);
						flush(em);
						result.set(readFromFaction(newFaction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Faction with name (%s) already exists",
							request.get("name"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/faction/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {

		long id = getLongParam(params, "id", "The Faction ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Faction faction = findFaction(em, id);
			ifAuthorized(
				user -> {
					try {
						writeToFactionStatus(em, request, faction);
						flush(em);
						result.set(readFromFaction(faction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/faction/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(f) from Faction f";
				String queryString = "select f from Faction f left outer join fetch f.author a left outer join fetch a.access w";
				if (search!=null) {
					String whereClause =" where fts('pg_catalog.english', " +
						"f.name||' '||" +
						"f.description||' '||" +
						"f.document.text ||' '||" +
						"f.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long factionCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Faction> factions = (search == null) ?
					findPagedFactions(em.createQuery(queryString), pageNo):
					findPagedFactions(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("factions", readFromFactionSummaries(factions))
					.put("count", factionCount)
					.put("page", pageNo)
					.put("pageSize", FactionController.FACTIONS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/faction/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Collection<Faction> factions = findFactions(em.createQuery("select f from Faction f where f.status=:status"),
				"status", FactionStatus.LIVE);
			result.set(readFromFactionSummaries(factions));
		});
		return result.get();
	}

	@REST(url="/api/faction/by-name/:name", method=Method.GET)
	public Json getByTitle(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String name = (String)params.get("name");
			Faction faction = getSingleResult(em,
				"select f from Faction f " +
					"join fetch f.firstSheet s " +
					"join fetch f.author w " +
					"join fetch w.access " +
					"where f.name=:name",
				"name", name);
			if (faction==null) {
				throw new SummerControllerException(404,
					"Unknown Faction with name %s", name
				);
			}
			ifAuthorized(user->{
				result.set(readFromFaction(faction));
			},
			verifyIfAdminOrOwner(faction));
		});
		return result.get();
	}

	@REST(url="/api/faction/load/:id", method=Method.GET)
	public Json getFactionWithComments(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Faction ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Faction faction = findFaction(em, id);
			ifAuthorized(user->{
				result.set(readFromFaction(faction));
			},
			verifyIfAdminOrOwner(faction));
		});
		return result.get();
	}

	@REST(url="/api/faction/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Faction ID is missing or invalid (%s)");
		inTransaction(em->{
			Faction faction = findFaction(em, id);
			ifAuthorized(
				user->{
					try {
						remove(em, faction);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				verifyIfAdminOrOwner(faction)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/faction/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Faction ID is missing or invalid (%s)");
		checkJson(request, Usage.UPDATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Faction faction = findFaction(em, id);
			ifAuthorized(
				user -> {
					try {
						writeToFaction(em, request, faction, Usage.UPDATE);
						storeFactionImages(params, faction);
						flush(em);
						result.set(readFromFaction(faction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/faction/published/:id", method=Method.GET)
	public Json getPublishedFaction(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Faction ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Faction faction = findFaction(em, id);
			if (faction.getStatus() != FactionStatus.LIVE) {
				throw new SummerControllerException(409, "Faction is not live.");
			}
			result.set(readFromPublishedFaction(faction));
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(Faction faction) {
		return (user, roles) -> {
			if (faction.getAuthor() != null && faction.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	void addComment(Json json, Faction faction, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			faction.addComment(new Comment().setDate(PlatformManager.get().today()).setText(comment).setAuthor(author));
		}
	}

	Faction writeToFactionStatus(EntityManager em, Json json, Faction faction) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", FactionStatus.byLabels().keySet())
			.ensure();
		sync(json, faction)
			.write("status", label->FactionStatus.byLabels().get(label));
		return faction;
	}

	void checkJson(Json json, Usage usage) {
		verify(json)
			.process(v->{
				if (usage.creation) {v
							.checkRequired("name")
							.checkRequired("description");
				}
			})
			.checkMinSize("name", 2).checkMaxSize("name", 200)
			.checkPattern("name", "[\\d\\s\\w]+")
			.checkMinSize("description", 2)
			.checkMaxSize("description", 19995)
			.process(v->checkSheets(v))
			.process(v->{
				if (usage.propose) {v
					.checkMinSize("newComment", 2).checkMaxSize("newComment", 200);
				}
				else {v
					.check("status", FactionStatus.byLabels().keySet());
					checkComments(v);
				}
			})
			.ensure();
	}

	Faction writeToFaction(EntityManager em, Json json, Faction faction, Usage usage) {
		try {
			sync(json, faction)
				.write("version")
				.write("name")
				.write("description")
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
				.process(s->{
					if (!usage.propose) {s
						.write("status", label -> FactionStatus.byLabels().get(label));
						writeComments(s);
					}
				})
				.process(s->writeSheets(s))
				.process(s->writeComments(s));
			faction.setFirstSheet(faction.getSheet(0));
			faction.buildDocument();
			return faction;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Json readFromFactionSummary(Faction faction) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, faction)
			.read("id")
			.read("version")
			.read("name")
			.read("illustration")
			.read("description")
			.read("status", FactionStatus::getLabel)
			.process(s->readAuthor(s));
		return json;
	}

	Json readFromFaction(Faction faction) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, faction)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("illustration")
			.read("status", FactionStatus::getLabel)
			.process(s->readAuthor(s))
			.process(s->readSheets(s))
			.process(s->readComments(s));
		return json;
	}

	Json readFromPublishedFaction(Faction faction) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, faction)
			.read("id")
			.read("name")
			.read("description")
			.read("illustration")
			.process(s->readSheets(s));
		return json;
	}

	Faction findFaction(EntityManager em, long id) {
		Faction faction = find(em, Faction.class, id);
		if (faction==null) {
			throw new SummerControllerException(404,
				"Unknown Faction with id %d", id
			);
		}
		return faction;
	}

	Collection<Faction> findFactions(Query query, Object... params) {
		setParams(query, params);
		List<Faction> factions = getResultList(query);
		return factions.stream().distinct().collect(Collectors.toList());
	}

	Collection<Faction> findPagedFactions(Query query, int page, Object... params) {
		setParams(query, params);
		List<Faction> factions = getPagedResultList(query, page* FactionController.FACTIONS_BY_PAGE, FactionController.FACTIONS_BY_PAGE);
		return factions.stream().distinct().collect(Collectors.toList());
	}

	Json readFromFactionSummaries(Collection<Faction> factions) {
		Json list = Json.createJsonArray();
		factions.stream().forEach(faction->list.push(readFromFactionSummary(faction)));
		return list;
	}

	static int FACTIONS_BY_PAGE = 10;
}