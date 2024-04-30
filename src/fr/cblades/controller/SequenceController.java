package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.summer.CollectionSunbeam;
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
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import java.util.*;
import java.util.Map;

@Controller
public class SequenceController implements InjectorSunbeam, CollectionSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/sequence/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Sequence newSequence = writeToSequence(request, new Sequence());
					assert(newSequence.getElements().size()>0);
					persist(em, newSequence);
					GameMatch gameMatch = GameMatch.getByGame(em, newSequence.getGame());
					gameMatch.getCurrentPlayerMatch().setLastSequenceCount(newSequence.getCount());
					if (newSequence.isTurnClosed()) {
						if (gameMatch==null) {
							throw new SummerControllerException(404,
								"Game Match of game (%d) doesn't exist", newSequence.getGame()
							);
						}
						if (gameMatch.getCurrentTurn() > 0) {
							gameMatch.getGame().advancePlayerTurns(em, 1);
						}
						gameMatch.advanceOnePlayerTurn();
					}
					result.set(readFromSequence(newSequence));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Sequence of game (%s) already exists",
					request.get("game"), null
				);
			}
		}/*, ADMIN*/);
		return result.get();
	}

	@REST(url="/api/sequence/by-game/:game/:count", method=Method.POST)
	public Json getByGameAndCount(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				long game = Long.parseLong((String)params.get("game"));
				long count = Long.parseLong((String)params.get("count"));
				Set<Sequence> sequences = getResultSet(em,
						"select s from Sequence s left outer join fetch s.elements where s.game = :game and s.count >= :count",
						"game", game, "count", count);
				result.set(readFromSequences(sequences));
			});
		}/*, ADMIN*/);
		return result.get();
	}

	@REST(url="/api/sequence/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String id = (String)params.get("id");
				Sequence sequence = findSequence(em, new Long(id));
				result.set(readFromSequence(sequence));
			});
		}/*, ADMIN*/);
		return result.get();
	}

	@REST(url="/api/sequence/delete/:id", method=Method.POST)
	public Json delete(Map<String, Object> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Sequence sequence = findSequence(em, new Long(id));
					remove(em, sequence);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}/*, ADMIN*/);
		return Json.createJsonObject().put("deleted", "ok");
	}

	Verifier checkUnitStateSpecs(Verifier verifier) {
		return verifier
			.checkRequired("unit").checkMinSize("unit", 2).checkMaxSize("unit", 80)
			.checkRequired("steps").checkInteger("steps")
			.checkMin("steps", 0).checkMax("steps", 8)
			.check("tiredness", Tiredness.byLabels().keySet())
			.check("cohesion", Cohesion.byLabels().keySet())
			.check("ammunition", Ammunition.byLabels().keySet())
			.check("charging", Charging.byLabels().keySet())
			.checkBoolean("engaging")
			.checkBoolean("orderGiven")
			.checkRequired("movementPoints").checkDouble("movementPoints")
			.checkMin("movementPoints", 0).checkMax("movementPoints", 6)
			.checkRequired("extendedMovementPoints").checkDouble("extendedMovementPoints")
			.checkMin("extendedMovementPoints", 0).checkMax("extendedMovementPoints", 9)
			.checkMin("actionMode", 0).checkMax("actionMode", 9)
			.checkBoolean("played");
	}

	Verifier checkHexLocationSpecs(Verifier verifier) {
		return verifier
			.checkRequired("hexCol").checkMin("hexCol", 0).checkMax("hexCol", 200)
			.checkRequired("hexRow").checkMin("hexRow", 0).checkMax("hexRow", 200)
			.checkMin("hexAngle", 0).checkMax("hexAngle", 300)
			.checkRequired("stacking").check("stacking", Stacking.byLabels().keySet());
	}

	Verifier checkAngleSpecs(Verifier verifier) {
		return verifier
			.checkRequired("angle").checkMin("angle", 0).checkMax("angle", 300);
	}

	Verifier checkLeaderSpecs(Verifier verifier) {
		return verifier
			.checkRequired("leader").checkMinSize("leader", 2).checkMaxSize("leader", 80);
	}

	Verifier checkDiceSpecs(Verifier verifier) {
		return verifier
			.checkRequired("dice1").checkInteger("dice1")
				.checkMin("dice1", 1).checkMax("dice1", 6)
			.checkRequired("dice2").checkInteger("dice2")
				.checkMin("dice2", 1).checkMax("dice2", 6);
	}

	Verifier checkDieSpecs(Verifier verifier) {
		return verifier
			.checkRequired("dice1").checkInteger("dice1")
				.checkMin("dice1", 1).checkMax("dice1", 6);
	}

	Verifier checkOrderInstructionSpecs(Verifier verifier) {
		return verifier
			.checkRequired("orderInstruction")
			.check("orderInstruction", OrderInstruction.byLabels().keySet());
	}

	Verifier checkInCommandSpecs(Verifier verifier) {
		return verifier.checkRequired("inCommand").checkBoolean("inCommand");
	}

	Verifier checkCombatSpecs(Verifier verifier) {
		return verifier
			.checkRequired("attackerHexCol").checkMin("attackerHexCol", 0).checkMax("attackerHexCol", 200)
			.checkRequired("attackerHexRow").checkMin("attackerHexRow", 0).checkMax("attackerHexRow", 200)
			.checkRequired("defender").checkMinSize("defender", 2).checkMaxSize("defender", 80)
			.checkRequired("defenderHexCol").checkMin("defenderHexCol", 0).checkMax("defenderHexCol", 200)
			.checkRequired("defenderHexRow").checkMin("defenderHexRow", 0).checkMax("defenderHexRow", 200)
			.checkRequired("advantage").checkInteger("advantage")
				.checkMin("advantage", -40).checkMax("advantage", 48);
	}

	Verifier checkShockAttackSpecs(Verifier verifier) {
		verifier = this.checkCombatSpecs(verifier);
		return verifier.checkRequired("supported").checkBoolean("supported");
	}

	Verifier checkFireAttackSpecs(Verifier verifier) {
		return this.checkCombatSpecs(verifier);
	}

	Verifier checkLossesSpecs(Verifier verifier) {
		return verifier
			.checkRequired("unit").checkMinSize("unit", 2).checkMaxSize("unit", 80)
			.checkRequired("attacker").checkMinSize("attacker", 2).checkMaxSize("attacker", 80)
			.checkRequired("losses").checkInteger("losses").checkMin("losses", 0).checkMax("losses", 10)
			.checkRequired("advance").checkBoolean("advance");
	}

	Sequence writeToSequence(Json json, Sequence sequence) {
		verify(json)
			.checkRequired("game").checkInteger("game")
			.checkRequired("count").checkMin("count", 0)
			.each("elements", cJson->verify(cJson)
				.checkRequired("version")
				.checkWhen(eJson->eJson.get("type").equals("state"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("move"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("turn"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						verifier = this.checkAngleSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("rotate"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkAngleSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("reorient"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkAngleSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("rest"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("refill"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("rally"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("rout-checking"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("reorganize"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("confront"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("crossing"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("attacker-engagement"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("defender-engagement"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("disengagement"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("try2-order-instructions"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("try2-take-command"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("try2-dismiss-command"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("give-orders"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("order-instructions"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkOrderInstructionSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("take-command"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkInCommandSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("dismiss-command"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkInCommandSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("shock-attack"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						verifier = this.checkShockAttackSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("fire-attack"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						verifier = this.checkFireAttackSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("ask4-retreat"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkLossesSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("retreat"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("advance"), eJson-> {
						Verifier verifier = verify((Json)eJson.get("content"));
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						return verifier;
					}
				)
			)
			.ensure();
		sync(json, sequence)
			.write("version")
			.write("game")
			.write("count")
			.syncEach("elements", (cJson, celem)->sync(cJson, celem)
				.write("version")
				.write("type")
				.write("content", Json::toString)
			);
		return sequence;
	}

	Json readFromSequence(Sequence sequence) {
		Json json = Json.createJsonObject();
		sync(json, sequence)
			.read("id")
			.read("version")
			.read("game")
			.read("count")
			.readEach("elements", (cJson, celem)->sync(cJson, celem)
				.read("id")
				.read("version")
				.read("type")
				.read("content", (String content)->Json.createJsonFromString(content)
			)
		);
		return json;
	}

	Sequence findSequence(EntityManager em, long id) {
		Sequence sequence = find(em, Sequence.class, id);
		if (sequence==null) {
			throw new SummerControllerException(404,
				"Unknown sequence with id %d", id
			);
		}
		return sequence;
	}

	Json readFromSequences(Collection<Sequence> sequences) {
		Json list = Json.createJsonArray();
		sequences.stream().forEach(sequence->list.push(readFromSequence(sequence)));
		return list;
	}
}
