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
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityExistsException;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class PlayerIdentityController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers, FileSunbeam {

	@MIME(url="/api/player-identity/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("imagename");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String imageName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
				.setName(imageName)
				.setStream(PlatformManager.get().getInputStream("/games/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storePlayerIdentityImages(Map<String, Object> params, PlayerIdentity playerIdentity) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files.length > 0) {
			if (files.length!= 1) throw new SummerControllerException(400, "One player identity file must be loaded.");
			String fileName = "playeridentity" + playerIdentity.getId() + "." + files[0].getExtension();
			String webName = "playeridentity" + playerIdentity.getId() + "-" + System.currentTimeMillis() + "." + files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/games/" + fileName));
			playerIdentity.setPath("/api/player-identity/images/" + webName);
		}
	}

	@REST(url="/api/player-identity/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					PlayerIdentity newPlayerIdentity = writeToPlayerIdentity(em, request, new PlayerIdentity());
					persist(em, newPlayerIdentity);
					storePlayerIdentityImages(params, newPlayerIdentity);
					result.set(readFromPlayerIdentity(newPlayerIdentity));
				});
			}
			catch (EntityExistsException pe) {
				throw new SummerControllerException(500,
					"Player Identity with name (%s) already exists",
					request.get("name"), null
				);
			}
			catch (PersistenceException pe) {
				throw new SummerControllerException(500, pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(pi) from PlayerIdentity pi";
				String queryString = "select pi from PlayerIdentity pi ";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" where fts('pg_catalog.english', " +
						"pi.name||' '||" +
						"pi.description ||' '||" +
						"pi.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long playerIdentityCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<PlayerIdentity> playerIdentities = (search == null) ?
					findPagedPlayerIdentities(em.createQuery(queryString), pageNo):
					findPagedPlayerIdentities(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("playerIdentities", readFromPlayerIdentities(playerIdentities))
					.put("count", playerIdentityCount)
					.put("page", pageNo)
					.put("pageSize", PlayerIdentityController.PLAYER_IDENTITIES_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Collection<PlayerIdentity> playerIdentities = findPlayerIdentities(
				em.createQuery("select pi from PlayerIdentity pi where pi.status = :status")
					.setParameter("status", PlayerIdentityStatus.LIVE));
			result.set(readFromPublishedPlayerIdentities(playerIdentities));
		});
		return result.get();
	}

	@REST(url="/api/player-identity/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String name = (String)params.get("name");
				PlayerIdentity playerIdentity = getSingleResult(em,
						"select pi from PlayerIdentity pi where pi.name = :name",
						"name", name);
				if (playerIdentity==null) {
					throw new SummerControllerException(404,
							"Unknown Player Identity with name %s", name
					);
				}
				result.set(readFromPlayerIdentity(playerIdentity));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/load/:id", method=Method.GET)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String id = (String)params.get("id");
				PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
				result.set(readFromPlayerIdentity(playerIdentity));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
					remove(em, playerIdentity);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/player-identity/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
					writeToPlayerIdentity(em, request, playerIdentity);
					storePlayerIdentityImages(params, playerIdentity);
					flush(em);
					result.set(readFromPlayerIdentity(playerIdentity));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToPlayerIdentityStatus(request, playerIdentity);
						flush(em);
						result.set(readFromPlayerIdentity(playerIdentity));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	PlayerIdentity writeToPlayerIdentityStatus(Json json, PlayerIdentity playerIdentity) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", BannerStatus.byLabels().keySet())
			.ensure();
		sync(json, playerIdentity)
			.write("status", label->BannerStatus.byLabels().get(label));
		return playerIdentity;
	}

	PlayerIdentity writeToPlayerIdentity(EntityManager em, Json json, PlayerIdentity playerIdentity) {
		verify(json)
			.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkPattern("name", "[a-zA-Z0-9_\\-]+")
			.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
			.checkMinSize("description", 2).checkMaxSize("description", 2000)
			.check("status", PlayerIdentityStatus.byLabels().keySet())
			.each("comments", cJson->verify(cJson)
				.checkRequired("version")
				.checkRequired("date")
				.checkRequired("text")
				.checkMinSize("text", 2)
				.checkMaxSize("text", 19995)
			)
			.ensure();
		sync(json, playerIdentity)
			.write("version")
			.write("name")
			.write("path")
			.write("description")
			.write("status", label-> PlayerIdentityStatus.byLabels().get(label))
			.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
			.syncEach("comments", (cJson, comment)->sync(cJson, comment)
				.write("version")
				.writeDate("date")
				.write("text")
			);
		return playerIdentity;
	}

	Json readFromPlayerIdentity(PlayerIdentity playerIdentity) {
		Json json = Json.createJsonObject();
		sync(json, playerIdentity)
			.read("id")
			.read("version")
			.read("name")
			.read("path")
			.read("description")
			.read("status", PlayerIdentityStatus::getLabel)
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

	Json readFromPublishedPlayerIdentity(PlayerIdentity playerIdentity) {
		Json json = Json.createJsonObject();
		sync(json, playerIdentity)
			.read("id")
			.read("version")
			.read("name")
			.read("path")
			.read("description")
			.read("status", PlayerIdentityStatus::getLabel);
		return json;
	}

	PlayerIdentity findPlayerIdentity(EntityManager em, long id) {
		PlayerIdentity playerIdentity = find(em, PlayerIdentity.class, id);
		if (playerIdentity==null) {
			throw new SummerControllerException(404,
				"Unknown Player Identity with id %d", id
			);
		}
		return playerIdentity;
	}

	Collection<PlayerIdentity> findPlayerIdentities(Query query, Object... params) {
		setParams(query, params);
		List<PlayerIdentity> playerIdentities = getResultList(query);
		return playerIdentities.stream().distinct().collect(Collectors.toList());
	}

	Json readFromPlayerIdentities(Collection<PlayerIdentity> playerIdentities) {
		Json list = Json.createJsonArray();
		playerIdentities.stream().forEach(playerIdentity->list.push(readFromPlayerIdentity(playerIdentity)));
		return list;
	}

	Collection<PlayerIdentity> findPagedPlayerIdentities(Query query, int page, Object... params) {
		setParams(query, params);
		List<PlayerIdentity> playerIdentities = getPagedResultList(query, page* PlayerIdentityController.PLAYER_IDENTITIES_BY_PAGE, PlayerIdentityController.PLAYER_IDENTITIES_BY_PAGE);
		return playerIdentities.stream().distinct().collect(Collectors.toList());
	}

	Json readFromPublishedPlayerIdentities(Collection<PlayerIdentity> playerIdentities) {
		Json list = Json.createJsonArray();
		playerIdentities.stream().forEach(playerIdentity->list.push(readFromPublishedPlayerIdentity(playerIdentity)));
		return list;
	}

	static int PLAYER_IDENTITIES_BY_PAGE = 16;
}
