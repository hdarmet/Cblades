package fr.cblades.controller;

import fr.cblades.StandardUsers;
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

import javax.persistence.EntityExistsException;
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
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					PlayerIdentity newPlayerIdentity = writeToPlayerIdentity(request, new PlayerIdentity());
					persist(em, newPlayerIdentity);
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

	@REST(url="/api/player-identity/all", method=Method.POST)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				Collection<PlayerIdentity> playerIdentities = findPlayerIdentities(em.createQuery("select pi from PlayerIdentity pi"));
				result.set(readFromPlayerIdentities(playerIdentities));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
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

	@REST(url="/api/player-identity/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				String id = (String)params.get("id");
				PlayerIdentity playerIdentity = findPlayerIdentity(em, new Long(id));
				result.set(readFromPlayerIdentity(playerIdentity));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/player-identity/delete/:id", method=Method.POST)
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
					writeToPlayerIdentity(request, playerIdentity);
					flush(em);
					result.set(readFromPlayerIdentity(playerIdentity));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return result.get();
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
