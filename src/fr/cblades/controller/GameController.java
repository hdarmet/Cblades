package fr.cblades.controller;

import com.sun.org.apache.xpath.internal.operations.Bool;
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
import org.summer.controller.Verifier;
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
					Game newGame = writeToGame(em, request, new Game(), true);
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
		long lastCount =-1;
		for (int index = 0; index< request.size(); index++) {
			activeIdentities.add((String) request.get(index));
		}
		for (PlayerMatch playerMatch: gameMatch.getPlayerMatches()) {
			if (activeIdentities.contains(playerMatch.getPlayerIdentity().getName())) {
				long playerLastCount = playerMatch.getLastSequenceCount();
				if (lastCount<playerLastCount) lastCount=playerLastCount;
			}
		}
		if (lastCount>=0) {
			game.applySequencesUntil(em, lastCount);
		}
		return lastCount+1;
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
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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
					writeToGame(em, request, game, false);
					flush(em);
					result.set(readFromGame(em, game));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	Game writeToGame(EntityManager em, Json json, Game game, boolean full) {
		Verifier verifier;
		try {
			verifier = verify(json);
			if (full) {
				verifier
					.checkRequired("version")
					.inspect("map", mJson -> verify(mJson)
						.checkRequired("version")
						.each("boards", bJson -> verify(bJson)
							.checkRequired("version")
							.checkRequired("col")
							.checkRequired("row")
							.checkRequired("path")
							.checkRequired("icon")
							.checkRequired("invert")
						)
					)
					.checkRequired("windDirection")
					.checkRequired("fog")
					.checkRequired("weather")
					.checkRequired("currentPlayerIndex")
					.checkRequired("currentTurn")
					.each("players", pJson -> verify(pJson)
						.checkRequired("version")
						.inspect("identity", bJson -> verify(bJson)
							.checkRequired("name")
							.checkRequired("path")
						)
						.each("wings", wJson -> verify(wJson)
							.checkRequired("version")
							.inspect("banner", bJson -> verify(bJson)
								.checkRequired("name")
								.checkRequired("path")
							)
							.each("retreatZone", lJson -> verify(lJson)
								.checkRequired("col")
								.checkRequired("row")
							)
							.each("units", uJson -> verify(uJson)
								.checkRequired("version")
								.checkRequired("name")
								.checkRequired("category")
								.checkRequired("type")
								.checkRequired("angle")
								.checkRequired("positionCol")
								.checkRequired("positionRow")
								.checkRequired("steps")
								.checkRequired("tiredness")
								.checkRequired("ammunition")
								.checkRequired("cohesion")
								.checkRequired("charging")
								.checkRequired("contact")
								.checkRequired("orderGiven")
								.checkRequired("played")
							)
							.checkRequired("moral")
							.checkRequired("tiredness")
							.checkMinSize("leader", 2)
							.checkRequired("orderInstruction")
						)
					)
					.each("locations", lJson -> verify(lJson)
						.checkRequired("version")
						.checkRequired("col")
						.checkRequired("row")
						.each("pieces", uJson -> verify(uJson)
							.checkRequired("version")
							.checkWhen(tJson -> tJson.get("type") != null, tJson ->
								verify(tJson).checkEnum("angle", 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330)
									.checkWhen(eJson -> eJson.get("type").equals("smoke"), eJson ->
										verify(eJson)
											.checkRequired("played")
										)
										.checkWhen(eJson -> eJson.get("type").equals("fire"), eJson ->
											verify(eJson)
											.checkRequired("played")
										)
							)
						)
					);
			}
			verifier
				.inspect("map", mJson -> verify(mJson)
					.each("boards", bJson -> verify(bJson)
						.checkMin("col", -1).checkMax("col", 200)
						.checkMin("row", -1).checkMax("row", 200)
						.checkMinSize("path", 2).checkMaxSize("path", 80)
						.checkMinSize("icon", 2).checkMaxSize("icon", 80)
						.checkBoolean("invert")
					)
				)
				.checkInteger("windDirection").checkMin("windDirection", 0).checkMax("windDirection", 300)
				.check("fog", FogType.byLabels().keySet())
				.check("weather", WeatherType.byLabels().keySet())
				.checkInteger("currentPlayerIndex").checkMin("currentPlayerIndex", 0).checkMax("current", json.getJson("players").size())
				.checkInteger("currentTurn").checkMin("currentTurn", 0)
				.each("players", pJson -> verify(pJson)
					.inspect("identity", bJson -> verify(bJson)
						.checkMinSize("name", 2).checkMaxSize("name", 80)
						.checkMinSize("path", 2).checkMaxSize("path", 80)
					)
					.each("wings", wJson -> verify(wJson)
						.inspect("banner", bJson -> verify(bJson)
							.checkMinSize("name", 2).checkMaxSize("name", 80)
							.checkMinSize("path", 2).checkMaxSize("path", 80)
						)
						.each("retreatZone", lJson -> verify(lJson)
							.checkMin("col", -1).checkMax("col", 200)
							.checkMin("row", -1).checkMax("row", 200)
						)
						.each("units", uJson -> verify(uJson)
							.checkMinSize("name", 2).checkMaxSize("name", 80)
							.check("category", UnitCategory.byLabels().keySet())
							.checkMinSize("type", 2).checkMaxSize("type", 80)
							.checkMin("angle", 0).checkMax("angle", 330)
							.checkMin("positionCol", 0).checkMax("positionCol", 100)
							.checkMin("positionRow", 0).checkMax("positionRow", 100)
							.checkMin("positionAngle", 0).checkMax("positionAngle", 330)
							.checkMin("steps", 0).checkMax("steps", 12)
							.check("tiredness", Tiredness.byLabels().keySet())
							.check("ammunition", Ammunition.byLabels().keySet())
							.check("cohesion", Cohesion.byLabels().keySet())
							.checkBoolean("charging")
							.checkBoolean("contact")
							.checkBoolean("orderGiven")
							.checkBoolean("played")
						)
						.checkInteger("moral").checkMin("moral", 4).checkMax("moral", 12)
						.checkInteger("tiredness").checkMin("tiredness", 4).checkMax("tiredness", 12)
						.checkMinSize("leader", 2).checkMaxSize("leader", 80)
						.check("orderInstruction", OrderInstruction.byLabels().keySet())
					)
				)
				.each("locations", lJson -> verify(lJson)
					.checkMin("col", -1).checkMax("col", 200)
					.checkMin("row", -1).checkMax("row", 200)
					.each("pieces", uJson -> verify(uJson)
						.checkWhen(tJson->tJson.get("type")!=null, tJson->
							verify(tJson).checkEnum("angle", 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330)
								.checkWhen(eJson->eJson.get("type").equals("smoke"), eJson->
									verify(eJson).checkEnum("density", Boolean.TRUE, Boolean.FALSE)
										.checkBoolean("played")
									)
									.checkWhen(eJson->eJson.get("type").equals("fire"), eJson->
										verify(eJson).checkEnum("fire", Boolean.TRUE, Boolean.FALSE)
										.checkBoolean("played")
									)
									.checkWhen(eJson->eJson.get("name")!=null, eJson->
										verify(eJson)
											.checkMinSize("name", 2).checkMaxSize("name", 80)
									)
						)
					)
				);
				verifier.ensure();
			sync(json, game)
				.write("version")
				.write("currentTurn")
				.write("windDirection")
				.write("currentPlayerIndex")
				.write("weather", label -> WeatherType.byLabels().get(label))
				.write("fog", label -> FogType.byLabels().get(label))
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
						.write("moral")
						.write("tiredness")
						.write("leader", ((Player) player)::getUnit)
						.write("orderInstruction", label -> OrderInstruction.byLabels().get(label))
					)
				)
				.syncEach("locations",
					(lJson, location) -> sync(lJson, location)
					.write("version")
					.write("col")
					.write("row")
					.syncEach("pieces",
						ljson->{
							if (ljson.get("name")!=null) {
								return game.getUnitByName((String)ljson.get("name"));
							}
							else {
								return new Token().setType((String)ljson.get("type"));
							}
						},
						(uJson, token) -> sync(uJson, token)
						.write("version")
						.write("angle")
						.syncWhen(
							(t2Json, t2oken)->t2oken instanceof Unit,
							(t2Json, t2oken)->sync(t2Json, t2oken)
								.write("name")
						)
						.syncWhen(
							(t2Json, t2oken)->t2oken instanceof Token,
							(t2Json, t2oken)->sync(t2Json, t2oken)
								.write("type")
								.write("played")
								.syncWhen(
									(t3Json, t3oken)->((Token)t3oken).getType().equals("smoke"),
									(t3Json, t3oken)->sync(t3Json, t3oken)
										.write("density")
								)
								.syncWhen(
									(t3Json, t3oken)->((Token)t3oken).getType().equals("fire"),
									(t3Json, t3oken)->sync(t3Json, t3oken)
										.write("fire")
								)
						)
					)
				);
			//ame.setWindDirection(json.getInteger("windDirection"));
			//game.setCurrentPlayerIndex(json.getInteger("currentPlayerIndex"));
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
			.read("windDirection")
			.read("fog", FogType::getLabel)
			.read("weather", WeatherType::getLabel)
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
					.read("moral")
					.read("tiredness")
					.read("leader", Unit::getName)
					.read("orderInstruction", OrderInstruction::getLabel)
				)
			)
			.readEach("locations", (lJson, location)->sync(lJson, location)
				.read("id")
				.read("version")
				.read("col")
				.read("row")
				.readEach("pieces", (tJson, token)->sync(tJson, token)
					.read("id")
					.read("version")
					.read("angle")
					.syncWhen(
						(t2Json, t2oken)->token instanceof Token,
						(t2Json, t2oken)->sync(t2Json, t2oken)
							.read("type")
							.read("played")
							.syncWhen(
								(t3Json, t3oken)->((Token)t3oken).getType().equals("smoke"),
								(t3Json, t3oken)->sync(t3Json, t3oken)
									.read("density")
							)
							.syncWhen(
								(t3Json, t3oken)->((Token)t3oken).getType().equals("fire"),
								(t3Json, t3oken)->sync(t3Json, t3oken)
									.read("fire")
							)
					)
					.syncWhen(
						(u2Json, u2nit)->token instanceof Unit,
						(u2Json, u2nit)->sync(u2Json, u2nit)
							.read("name")
					)
				)
			)
			.readEach("sequenceElements", (cJson, celem)->sync(cJson, celem)
				.read("id")
				.read("version")
				.read("type")
				.read("content", (String content)->Json.createJsonFromString(content)
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
