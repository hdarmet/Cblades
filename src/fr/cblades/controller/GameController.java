package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.hibernate.NonUniqueResultException;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.SummerException;
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
public class GameController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/game/create", method=Method.POST)
	public Json create(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Game newGame = writeToGame(em, request, new Game());
					persist(em, newGame);
					result.set(readFromGame(em, newGame));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Game with name (%s) already exists",
					request.get("name"), null
				);
			}
		}, ADMIN);
	}

	@REST(url="/api/game/all", method=Method.POST)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				Collection<Game> games = findGames(em, "select g from Game g");
				result.set(readFromGames(em, games));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/game/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String name = params.get("name");
				Game game = findOneGame(em, "select g from Game g where g.name = :name", "name", name);
				if (game==null) {
					throw new SummerControllerException(404,
							"Unknown Game with name %s", name
					);
				}
				result.set(readFromGame(em, game));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/game/find/:id", method=Method.POST)
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				Game game = findGame(em, new Long(id));
				result.set(readFromGame(em, game));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/game/delete/:id", method=Method.POST)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Game game = findGame(em, new Long(id));
					remove(em, game);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	@REST(url="/api/game/update/:id", method=Method.POST)
	public Json update(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = params.get("id");
					Game game = findGame(em, new Long(id));
					writeToGame(em, request, game);
					flush(em);
					result.set(readFromGame(em, game));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	Game writeToGame(EntityManager em, Json json, Game game) {
		verify(json)
			.checkRequired("version")
			.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 80)
			.inspect("map", mJson->verify(mJson)
				.checkRequired("version")
				.each("boards", bJson->verify(bJson)
					.checkRequired("version")
					.checkRequired("col").checkMin("col", -1).checkMax("col", 200)
					.checkRequired("row").checkMin("row", -1).checkMax("row", 200)
					.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 80)
					.checkRequired("invert").checkBoolean("invert")
				)
			)
			.each("players", pJson->verify(pJson)
				.checkRequired("version")
				.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 80)
				.each("wings", wJson->verify(wJson)
					.checkRequired("version")
					.checkRequired("banner").checkMinSize("banner", 2).checkMaxSize("banner", 80)
					.each("retreatZone", lJson->verify(lJson)
						.checkRequired("version")
						.checkRequired("col").checkMin("col", -1).checkMax("col", 200)
						.checkRequired("row").checkMin("row", -1).checkMax("row", 200)
					)
					.each("units", uJson->verify(uJson)
						.checkRequired("version")
						.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 80)
						.checkRequired("category").check("category", UnitCategory.byLabels().keySet())
						.checkRequired("type").checkMinSize("type", 2).checkMaxSize("type", 80)
						.checkRequired("angle").checkMin("angle", 0).checkMax("angle", 330)
						.checkRequired("positionCol").checkMin("positionCol", 0).checkMax("positionCol", 100)
						.checkRequired("positionRow").checkMin("positionRow", 0).checkMax("positionRow", 100)
						.checkRequired("positionAngle").checkMin("positionAngle", 0).checkMax("positionAngle", 330)
						.checkRequired("steps").checkMin("steps", 0).checkMax("steps", 12)
						.checkRequired("tiredness").check("tiredness", Tiredness.byLabels().keySet())
						.checkRequired("ammunition").check("ammunition", Ammunition.byLabels().keySet())
						.checkRequired("cohesion").check("cohesion", Cohesion.byLabels().keySet())
						.checkRequired("charging")
						.checkRequired("contact")
						.checkRequired("orderGiven")
						.checkRequired("played")
					)
				)
				.each("locations", lJson->verify(lJson)
					.checkRequired("version")
					.checkRequired("col").checkMin("col", -1).checkMax("col", 200)
					.checkRequired("row").checkMin("row", -1).checkMax("row", 200)
					.each("units", uJson->verify(uJson)
						.checkMinSize("_", 2).checkMaxSize("_", 80)
					)
				)
			)
			.ensure();
		sync(json, game)
			.write("version")
			.write("name")
			.writeLink("map", (pJson, map)->sync(pJson, map)
				.write("version")
				.syncEach("boards", (bJson, board)->sync(bJson, board)
					.write("version")
					.write("col")
					.write("row")
					.writeRef("path", "board", (String path)->Board.getByPath(em, path))
					.write("invert")
				)
			)
			.syncEach("players", (pJson, player)->sync(pJson, player)
				.write("version")
				.writeRef("name", "identity", (String name)->PlayerIdentity.getByName(em, name))
				.syncEach("wings", (wJson, wing)->sync(wJson, wing)
					.write("version")
					.writeRef("banner", "banner", (String name)->Banner.getByName(em, name))
					.syncEach("retreatZone", (lJson, location)->sync(lJson, location)
						.write("version")
						.write("col")
						.write("row")
					)
					.syncEach("units", (uJson, unit)->sync(uJson, unit)
						.write("version")
						.write("name")
						.write("category", label->UnitCategory.byLabels().get(label))
						.write("type")
						.write("angle")
						.write("positionCol")
						.write("positionRow")
						.write("positionAngle")
						.write("steps")
						.write("tiredness", label->Tiredness.byLabels().get(label))
						.write("ammunition", label->Ammunition.byLabels().get(label))
						.write("cohesion", label->Cohesion.byLabels().get(label))
						.write("charging")
						.write("contact")
						.write("orderGiven")
						.write("played")
					)
				)
				.syncEach("locations", (lJson, location)->sync(lJson, location)
					.write("version")
					.write("col")
					.write("row")
					.syncEach("units", ((Player) player)::getUnit)
				)
			);
		return game;
	}

	Json readFromGame(EntityManager em, Game game) {
		Json json = Json.createJsonObject();
		sync(json, game)
			.read("id")
			.read("version")
			.read("name")
			.readLink("map", (pJson, map)->sync(pJson, map)
				.read("id")
				.read("version")
				.readEach("boards", (bJson, boardPlacement)->sync(bJson, boardPlacement)
					.read("id")
					.read("version")
					.read("path", "board", Board::getPath)
					.read("col")
					.read("row")
					.read("invert")
				)
			)
			.readEach("players", (pJson, player)->sync(pJson, player)
				.read("id")
				.read("version")
				.read("name", "identity", PlayerIdentity::getName)
				.readEach("wings", (wJson, wing)->sync(wJson, wing)
					.read("id")
					.read("version")
					.read("banner", "banner", Banner::getName)
					.readEach("retreatZone", (lJson, location)->sync(lJson, location)
						.read("id")
						.read("version")
						.read("col")
						.read("row")
					)
					.readEach("units", (uJson, unit)->sync(uJson, unit)
						.read("id")
						.read("version")
						.read("name")
						.read("category", UnitCategory::getLabel)
						.read("type")
						.read("angle")
						.read("positionCol")
						.read("positionRow")
						.read("positionAngle")
						.read("steps")
						.read("tiredness", Tiredness::getLabel)
						.read("ammunition", Ammunition::getLabel)
						.read("cohesion", Cohesion::getLabel)
						.read("charging")
						.read("contact")
						.read("orderGiven")
						.read("played")
					)
				)
				.readEach("locations", (lJson, location)->sync(lJson, location)
					.read("id")
					.read("version")
					.read("col")
					.read("row")
					.readEachRef("units", Unit::getName)
				)
			);
		return json;
	}

	Json readFromGameHeader(EntityManager em, Game game) {
		Json json = Json.createJsonObject();
		sync(json, game)
			.read("id")
			.read("version")
			.read("name");
		return json;
	}

	Game findGame(EntityManager em, long id) {
		Game game = find(em, Game.class, id);
		if (game==null) {
			throw new SummerControllerException(404,
				"Unknown game with id %d", id
			);
		}
		return game;
	}

	List<Game> findGames(EntityManager em, String queryClause, Object... params) {
		Query query = em.createQuery(queryClause);
		setParams(query, params);
		List<Game> games = getResultList(query);
		return games.stream().distinct().collect(Collectors.toList());
	}

	Game findOneGame(EntityManager em, String queryClause, Object... params) {
		List<Game> games = findGames(em, queryClause, params);
		if (games.size()==0) return null;
		else if (games.size()==1) {
			return findGame(em, games.get(0).getId());
		}
		else throw new SummerControllerException(409, "query did not return a unique result: "+games.size());
	}

	Json readFromGames(EntityManager em, Collection<Game> games) {
		Json list = Json.createJsonArray();
		games.stream().forEach(game->list.push(readFromGameHeader(em, game)));
		return list;
	}

}
