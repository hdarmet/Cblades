package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import fr.cblades.game.SequenceApplyer;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.security.SecuritySunbeam;

import javax.persistence.*;
import java.util.*;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class GameController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/game/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Game newGame = writeToGame(em, request, new Game());
					persist(em, newGame);
					result.set(readFromGame(em, newGame));
				});
			}
			catch (EntityNotFoundException enf) {
				throw new SummerControllerException(500, enf.getMessage());
			}
			catch (PersistenceException pe) {
				throw new SummerControllerException(500, pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/game/play/load/:id", method=Method.POST)
	public Json loadForPlay(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String id = (String)params.get("id");
				long gameId = Long.parseLong(id);
				GameMatch gameMatch = GameMatch.getByGame(em, gameId);
				if (gameMatch == null) {
					throw new SummerControllerException(404, "GameMatch not found for game : %d", gameId);
				}
				long sequenceCount = adjustGameAndReturnsSequenceCount(request, em, gameMatch);
				Game game = gameMatch.getGame();
				result.set(readFromGame(em, game));
				result.get().put("sequenceCount", sequenceCount);
			});
		});
		return result.get();
	}

	long adjustGameAndReturnsSequenceCount(Json request, EntityManager em, GameMatch gameMatch) {
		Game game = gameMatch.getGame();
		Set<String> activeIdentities = new HashSet<>();
		for (int index = 0; index< request.size(); index++) {
			activeIdentities.add((String) request.get(index));
		}
		Set<PlayerIdentity> activesPlayers = new HashSet<>();
		for (PlayerMatch playerMatch: gameMatch.getPlayerMatches()) {
			if (activeIdentities.contains(playerMatch.getPlayerIdentity().getName())) {
				activesPlayers.add(playerMatch.getPlayerIdentity());
			}
		}
		int lastTurn = gameMatch.getCurrentTurn();
		int lastPlayerIndex = gameMatch.getCurrentPlayerIndex()-1;
		if (lastPlayerIndex<0) {
			lastTurn--;
			lastPlayerIndex = game.getPlayers().size()-1;
		}
		int turnCount = (gameMatch.getCurrentTurn()- gameMatch.getGame().getCurrentTurn())* gameMatch.getPlayerMatches().size()
				+ gameMatch.getCurrentPlayerIndex()- gameMatch.getGame().getCurrentPlayerIndex();
		while(lastTurn>=0 &&
			!activesPlayers.contains(game.getPlayers().get(lastPlayerIndex).getIdentity())
		) {
			lastPlayerIndex--;
			if (lastPlayerIndex<0) {
				lastTurn--;
				lastPlayerIndex = game.getPlayers().size()-1;
			}
			turnCount--;
		}
		long sequenceCount = 0;
		if (lastTurn>=0 && turnCount>0) {
			sequenceCount = game.advancePlayerTurns(em, turnCount) +1;
		}
		return sequenceCount;
	}

	@REST(url="/api/game/find/:id", method=Method.GET)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String id = (String)params.get("id");
				Game game = findGame(em, new Long(id));
				result.set(readFromGame(em, game));
			});
		});
		return result.get();
	}

	@REST(url="/api/game/delete/:id", method=Method.POST)
	public Json delete(Map<String, Object> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Game game = findGame(em, new Long(id));
					remove(em, game);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/game/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Game game = findGame(em, new Long(id));
					writeToGame(em, request, game);
					flush(em);
					result.set(readFromGame(em, game));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}

	Game writeToGame(EntityManager em, Json json, Game game) {
		try {
			verify(json)
				.checkRequired("version")
				.inspect("map", mJson -> verify(mJson)
					.checkRequired("version")
					.each("boards", bJson -> verify(bJson)
						.checkRequired("version")
						.checkRequired("col").checkMin("col", -1).checkMax("col", 200)
						.checkRequired("row").checkMin("row", -1).checkMax("row", 200)
						.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 80)
						.checkRequired("icon").checkMinSize("icon", 2).checkMaxSize("icon", 80)
						.checkRequired("invert").checkBoolean("invert")
					)
				)
				.checkRequired("currentPlayerIndex").checkInteger("currentPlayerIndex").checkMin("currentPlayerIndex", 0).checkMax("current", json.getJson("players").size())
				.checkRequired("currentTurn").checkInteger("currentTurn").checkMin("currentTurn", 0)
				.each("players", pJson -> verify(pJson)
					.checkRequired("version")
					.inspect("identity", bJson -> verify(bJson)
						.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 80)
						.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 80)
					)
					.each("wings", wJson -> verify(wJson)
						.checkRequired("version")
						.inspect("banner", bJson -> verify(bJson)
							.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 80)
							.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 80)
						)
						.each("retreatZone", lJson -> verify(lJson)
							.checkRequired("version")
							.checkRequired("col").checkMin("col", -1).checkMax("col", 200)
							.checkRequired("row").checkMin("row", -1).checkMax("row", 200)
						)
						.each("units", uJson -> verify(uJson)
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
							.checkRequired("engaging")
							.checkRequired("contact")
							.checkRequired("orderGiven")
							.checkRequired("played")
						)
					)
					.each("locations", lJson -> verify(lJson)
						.checkRequired("version")
						.checkRequired("col").checkMin("col", -1).checkMax("col", 200)
						.checkRequired("row").checkMin("row", -1).checkMax("row", 200)
						.each("units", uJson -> verify(uJson)
							.checkMinSize("_", 2).checkMaxSize("_", 80)
						)
					)
				)
				.ensure();
			sync(json, game)
				.write("version")
				.write("currentTurn")
				.writeLink("map", (pJson, map) -> sync(pJson, map)
					.write("version")
					.syncEach("boards", (bJson, board) -> sync(bJson, board)
						.write("version")
						.write("col")
						.write("row")
						.writeRef("path", "board", (String path) -> Board.getByPath(em, path))
						.write("invert")
					)
				)
				.syncEach("players", (pJson, player) -> sync(pJson, player)
					.write("version")
					.writeRef("identity.name", "identity", (String name) -> PlayerIdentity.getByName(em, name))
					.syncEach("wings", (wJson, wing) -> sync(wJson, wing)
						.write("version")
						.writeRef("banner.name", "banner", (String name) -> Banner.getByName(em, name))
						.syncEach("retreatZone", (lJson, location) -> sync(lJson, location)
							.write("version")
							.write("col")
							.write("row")
						)
						.syncEach("units", (uJson, unit) -> sync(uJson, unit)
							.write("version")
							.write("name")
							.write("category", label -> UnitCategory.byLabels().get(label))
							.write("type")
							.write("angle")
							.write("positionCol")
							.write("positionRow")
							.write("positionAngle")
							.write("steps")
							.write("tiredness", label -> Tiredness.byLabels().get(label))
							.write("ammunition", label -> Ammunition.byLabels().get(label))
							.write("cohesion", label -> Cohesion.byLabels().get(label))
							.write("charging")
							.write("engaging")
							.write("contact")
							.write("orderGiven")
							.write("played")
						)
					)
					.syncEach("locations", (lJson, location) -> sync(lJson, location)
						.write("version")
						.write("col")
						.write("row")
						.syncEach("units", ((Player) player)::getUnit)
					)
				);
			game.setCurrentPlayerIndex(json.getInteger("currentPlayerIndex"));
			return game;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Json readFromGame(EntityManager em, Game game) {
		Json json = Json.createJsonObject();
		sync(json, game)
			.read("id")
			.read("version")
			.read("currentPlayerIndex")
			.read("currentTurn")
			.readLink("map", (pJson, map)->sync(pJson, map)
				.read("id")
				.read("version")
				.readEach("boards", (bJson, boardPlacement)->sync(bJson, boardPlacement)
					.read("id")
					.read("version")
					.read("path", "board.path")
					.read("icon", "board.icon")
					.read("col")
					.read("row")
					.read("invert")
				)
			)
			.readEach("players", (pJson, player)->sync(pJson, player)
				.read("id")
				.read("version")
				.readLink("identity", (bJson, map)->sync(bJson, map)
						.read("name")
						.read("path")
				)
				.readEach("wings", (wJson, wing)->sync(wJson, wing)
					.read("id")
					.read("version")
					.readLink("banner", (bJson, map)->sync(bJson, map)
						.read("name")
						.read("path")
					)
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
						.read("engaging")
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
			.read("version");
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
