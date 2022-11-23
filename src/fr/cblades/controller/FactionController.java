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
public class FactionController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {
	static final Logger log = Logger.getLogger("summer");

	@MIME(url="/api/faction/documents/:docname")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("docname");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String docName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
				.setName(docName)
				.setStream(PlatformManager.get().getInputStream("/factions/"+docName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeFactionImages(Map<String, Object> params, Faction faction) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		for (FileSpecification file : files) {
			int ordinalIdx = file.getName().indexOf("-");
			if (ordinalIdx<0) {
				String factionFileName = "faction" + faction.getId() + "." + file.getExtension();
				String factionWebName = "faction" + faction.getId() + "-" + System.currentTimeMillis() + "." + file.getExtension();
				copyStream(file.getStream(), PlatformManager.get().getOutputStream("/factions/" + factionFileName));
				faction.setIllustration("/api/faction/documents/" + factionWebName);
			}
			else {
				boolean isIcon = file.getName().indexOf("icon-")==0;
				int ordinal = Integer.parseInt(file.getName().substring(ordinalIdx+1));
				if (isIcon) {
					String sheetFileIconName = "sheeticon" + faction.getId() + "_" + ordinal + "." + file.getExtension();
					String sheetWebIconName = "sheeticon" + faction.getId() + "_" + ordinal + "-" + System.currentTimeMillis() + "." + file.getExtension();
					copyStream(file.getStream(), PlatformManager.get().getOutputStream("/factions/" + sheetFileIconName));
					faction.getSheet(ordinal).setIcon("/api/faction/documents/" + sheetWebIconName);
				}
				else {
					String sheetFileName = "sheet" + faction.getId() + "_" + ordinal + "." + file.getExtension();
					String sheetWebName = "sheet" + faction.getId() + "_" + ordinal + "-" + System.currentTimeMillis() + "." + file.getExtension();
					copyStream(file.getStream(), PlatformManager.get().getOutputStream("/factions/" + sheetFileName));
					faction.getSheet(ordinal).setPath("/api/faction/documents/" + sheetWebName);
				}
			}
		}
	}

	@REST(url="/api/faction/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Faction newFaction = writeToProposedFaction(em, request, new Faction());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						addComment(request, newFaction, author);
						newFaction.setStatus(FactionStatus.PROPOSED);
						newFaction.setAuthor(author);
						persist(em, newFaction);
						storeFactionImages(params, newFaction);
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
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Faction faction = findFaction(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToProposedFaction(em, request, faction);
						addComment(request, faction, author);
						storeFactionImages(params, faction);
						flush(em);
						result.set(readFromFaction(faction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Faction newFaction = writeToFaction(em, request, new Faction());
			ifAuthorized(
				user->{
					try {
						persist(em, newFaction);
						storeFactionImages(params, newFaction);
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

	@REST(url="/api/faction/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(f) from Faction f";
				String queryString = "select f from Faction f left outer join fetch f.author a left outer join fetch a.access w";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
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

	@REST(url="/api/faction/by-name/:name", method=Method.GET)
	public Json getByTitle(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
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
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Faction faction = findFaction(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromFaction(faction));
			},
			verifyIfAdminOrOwner(faction));
		});
		return result.get();
	}

	@REST(url="/api/faction/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			Faction faction = findFaction(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, faction);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				verifyIfAdminOrOwner(faction)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/faction/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Faction faction = findFaction(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToFactionStatus(em, request, faction);
						flush(em);
						result.set(readFromFaction(faction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/faction/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Faction faction = findFaction(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToFaction(em, request, faction);
						storeFactionImages(params, faction);
						flush(em);
						result.set(readFromFaction(faction));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
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

	Faction writeToProposedFaction(EntityManager em, Json json, Faction faction) {
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
					.checkRequired("icon")
					.checkMinSize("icon", 2).checkMaxSize("icon", 200)
				)
				.ensure();
			sync(json, faction)
				.write("version")
				.write("name")
				.syncEach("sheets", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.write("ordinal")
					.write("name")
					.write("icon")
					.write("path")
					.write("description")
				);
			faction.setFirstSheet(faction.getSheet(0));
			faction.buildDocument();
			return faction;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	void addComment(Json json, Faction faction, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			faction.addComment(new Comment().setDate(new Date()).setText(comment).setAuthor(author));
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

	Faction writeToFaction(EntityManager em, Json json, Faction faction) {
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
			sync(json, faction)
				.write("version")
				.write("name")
				.write("illustration")
				.write("description")
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
				.write("status", label->FactionStatus.byLabels().get(label))
				.syncEach("sheets", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.write("ordinal")
					.write("name")
					.write("icon")
					.write("path")
				)
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			faction.setFirstSheet(faction.getSheet(0));
			faction.buildDocument();
			return faction;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Json readFromFactionSummary(Faction faction) {
		Json json = Json.createJsonObject();
		sync(json, faction)
			.read("id")
			.read("version")
			.read("name")
			.read("illustration")
			.read("description")
			.read("status", FactionStatus::getLabel)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		return json;
	}

	Json readFromFaction(Faction faction) {
		Json json = Json.createJsonObject();
		sync(json, faction)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("illustration")
			.read("status", FactionStatus::getLabel)
			.readEach("sheets", (pJson, sheet)->sync(pJson, sheet)
				.read("id")
				.read("version")
				.read("name")
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

	Json readFromPublishedFaction(Faction faction) {
		Json json = Json.createJsonObject();
		sync(json, faction)
			.read("id")
			.read("name")
			.read("description")
			.read("illustration")
			.readEach("sheets", (pJson, sheet)->sync(pJson, sheet)
				.read("id")
				.read("name")
				.read("icon")
				.read("path")
			)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
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