package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.Banner;
import fr.cblades.domain.PlayerIdentity;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class PlayerIdentityController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/player-identity/create", method=Method.POST)
	public Json create(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					PlayerIdentity newPlayerIdentity = writeToPlayerIdentity(request, new PlayerIdentity());
					persist(em, newPlayerIdentity);
					result.set(readFromPlayerIdentity(newPlayerIdentity));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Player Identity with name (%s) already exists",
					request.get("name"), null
				);
			}
		}, ADMIN);
	}

	@REST(url="/api/player-identity/all", method=Method.POST)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				Collection<PlayerIdentity> playerIdentities = findPlayerIdentities(em.createQuery("select pi from PlayerIdentity pi"));
				result.set(readFromPlayerIdentities(playerIdentities));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/player-identity/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String name = params.get("name");
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
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/player-identity/find/:id", method=Method.POST)
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
				result.set(readFromPlayerIdentity(playerIdentity));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/player-identity/delete/:id", method=Method.POST)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
					remove(em, playerIdentity);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	@REST(url="/api/player-identity/update/:id", method=Method.POST)
	public Json update(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = params.get("id");
					PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
					writeToPlayerIdentity(request, playerIdentity);
					flush(em);
					result.set(readFromPlayerIdentity(playerIdentity));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	PlayerIdentity writeToPlayerIdentity(Json json, PlayerIdentity playerIdentity) {
		verify(json)
			.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkPattern("name", "[a-zA-Z0-9_\\-]+")
			.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
			.ensure();
		sync(json, playerIdentity)
			.write("version")
			.write("name")
			.write("path");
		return playerIdentity;
	}

	Json readFromPlayerIdentity(PlayerIdentity playerIdentity) {
		Json json = Json.createJsonObject();
		sync(json, playerIdentity)
			.read("id")
			.read("version")
			.read("name")
			.read("path");
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

}
