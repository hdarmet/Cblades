package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import fr.cblades.game.SequenceApplyer;
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
import org.summer.data.Synchronizer;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.*;
import java.util.Map;
import java.util.stream.Collectors;

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
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
			.checkBoolean("disruptChecked")
			.checkBoolean("routChecked")
			.checkBoolean("neighborsCohesionLoss")
			.checkBoolean("defenderEngagementChecking")
			.checkBoolean("attackerEngagementChecking")
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

	Verifier checkAskRequestSpecs(Verifier verifier) {
		return verifier
			.checkRequired("askRequest").checkInteger("askRequest").checkMin("askRequest", 0);
	}

	void writeUnitState(Synchronizer sync) {
		sync.write("unit")
			.write("steps")
			.write("tiredness", label->Tiredness.byLabels().get(label))
			.write("cohesion", label->Cohesion.byLabels().get(label))
			.write("ammunition", label->Ammunition.byLabels().get(label))
			.write("charging", label->Charging.byLabels().get(label))
			.write("engaging")
			.write("orderGiven")
			.write("disruptChecked")
			.write("routChecked")
			.write("neighborsCohesionLoss")
			.write("defenderEngagementChecking")
			.write("attackerEngagementChecking")
			.write("played");
	}

	void writeHexLocation(Synchronizer sync) {
		sync.write("hexCol")
			.write("hexRow")
			.write("hexAngle")
			.write("stacking", label->Stacking.byLabels().get(label));
	}

	void writeAngle(Synchronizer sync) {
		sync.write("angle");
	}

	void writeDice(Synchronizer sync) {
		sync.write("dice1")
			.write("dice2");
	}

	void writeDie(Synchronizer sync) {
		sync.write("dice1");
	}

	void writeLeader(Synchronizer sync) {
		sync.write("leader");
	}

	void writeOrderInstruction(Synchronizer sync) {
		sync.write("orderInstruction", label->OrderInstruction.byLabels().get(label));
	}

	void writeInCommand(Synchronizer sync) {
		sync.write("inCommand");
	}

	void writeCombat(Synchronizer sync) {
		sync.write("attackerHexCol")
			.write("attackerHexRow")
			.write("defender")
			.write("defenderHexCol")
			.write("defenderHexRow")
			.write("advantage");
	}

	void writeShockAttack(Synchronizer sync) {
		this.writeCombat(sync);
		sync.write("supported");
	}

	void writeFireAttack(Synchronizer sync) {
		this.writeCombat(sync);
	}

	void writeLosses(Synchronizer sync) {
		sync.write("unit")
			.write("attacker")
			.write("losses")
			.write("advance");
	}

	void writeAskRequest(Synchronizer sync) {
		sync.write("askRequest");
	}

	Sequence writeToSequence(Json json, Sequence sequence) {
		verify(json)
			.checkRequired("game").checkInteger("game")
			.checkRequired("count").checkMin("count", 0)
			.each("elements", cJson->verify(cJson)
				.checkRequired("version")
				.checkWhen(eJson->eJson.get("type").equals("State"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Move"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Turn"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						verifier = this.checkAngleSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Rotate"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkAngleSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Reorient"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkAngleSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Rest"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Refill"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Rally"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("LossConsistency"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Reorganize"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Confront"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Crossing"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("AttackerEngagement"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("DefenderEngagement"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Disengagement"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Try2ChangeOrderInst"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Try2TakeCommand"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Try2DismissCommand"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("GiveOrders"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("ChangeOrderInst"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkOrderInstructionSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("TakeCommand"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkInCommandSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("DismissCommand"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLeaderSpecs(verifier);
						verifier = this.checkInCommandSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("ShockAttack"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						verifier = this.checkShockAttackSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("FireAttack"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkDiceSpecs(verifier);
						verifier = this.checkFireAttackSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Ask4Retreat"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkLossesSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Retreat"), eJson-> {
						Verifier verifier = verify(eJson);
						verifier = this.checkUnitStateSpecs(verifier);
						verifier = this.checkHexLocationSpecs(verifier);
						verifier = this.checkAskRequestSpecs(verifier);
						return verifier;
					}
				)
				.checkWhen(eJson->eJson.get("type").equals("Advance"), eJson-> {
						Verifier verifier = verify(eJson);
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
			.syncEach("elements",
				new Synchronizer.EntityFactory<>(hashMap(
					pair("State", SequenceElement.StateSequenceElement.class),
					pair("Move", SequenceElement.MoveSequenceElement.class),
					pair("Rotate", SequenceElement.RotateSequenceElement.class),
					pair("Turn", SequenceElement.TurnSequenceElement.class),
					pair("Reorient", SequenceElement.ReorientSequenceElement.class),
					pair("Rest", SequenceElement.RestSequenceElement.class),
					pair("Refill", SequenceElement.RefillSequenceElement.class),
					pair("Rally", SequenceElement.RallySequenceElement.class),
					pair("Reorganize", SequenceElement.ReorganizeSequenceElement.class),
					pair("LossConsistency", SequenceElement.LossConsistencySequenceElement.class),
					pair("Crossing", SequenceElement.CrossingSequenceElement.class),
					pair("AttackerEngagement", SequenceElement.AttackerEngagementSequenceElement.class),
					pair("DefenderEngagement", SequenceElement.DefenderEngagementSequenceElement.class),
					pair("Disengagement", SequenceElement.DisengagementSequenceElement.class),
					pair("Try2ChangeOrderInst", SequenceElement.Try2ChangeOrderInstructionSequenceElement.class),
					pair("ChangeOrderInst", SequenceElement.ChangeOrderInstructionSequenceElement.class),
					pair("Try2TakeCommand", SequenceElement.Try2TakeCommandSequenceElement.class),
					pair("Try2DismissCommand", SequenceElement.Try2DismissCommandSequenceElement.class),
					pair("GiveOrders", SequenceElement.GiveOrdersSequenceElement.class),
					pair("ManageCommand", SequenceElement.ManageCommandSequenceElement.class),
					pair("ShockAttack", SequenceElement.ShockAttackSequenceElement.class),
					pair("FireAttack", SequenceElement.FireAttackSequenceElement.class),
					pair("Ask4Retreat", SequenceElement.Ask4RetreatSequenceElement.class),
					pair("Retreat", SequenceElement.RetreatSequenceElement.class),
					pair("Advance", SequenceElement.AdvanceSequenceElement.class),
					pair("NextTurn", SequenceElement.NextTurnSequenceElement.class)
				), "type"),
				(cJson, celem)->sync(cJson, celem)
				.write("version")
				.syncWhen((eJson, eelem)->eJson.get("type").equals("State"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Move"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeHexLocation(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Turn"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeHexLocation(writer);
						this.writeAngle(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Rotate"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeAngle(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Reorient"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeAngle(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Rest"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Refill"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Rally"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Reorganize"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("LossConsistency"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Confront"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Crossing"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("AttackerEngagement"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("DefenderEngagement"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Disengagement"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Try2ChangeOrderInst"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLeader(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("GiveOrders"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLeader(writer);
						this.writeDie(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Try2TakeCommand"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLeader(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Try2DismissCommand"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLeader(writer);
						this.writeDice(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("ChangeOrderInst"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLeader(writer);
						this.writeOrderInstruction(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("ManageCommand"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLeader(writer);
						this.writeInCommand(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("ShockAttack"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
						this.writeShockAttack(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("FireAttack"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeDice(writer);
						this.writeFireAttack(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Ask4Retreat"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeLosses(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Retreat"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeHexLocation(writer);
						this.writeAskRequest(writer);
					}
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Advance"), (eJson, eelem)->{
						Synchronizer writer = sync(eJson, eelem);
						this.writeUnitState(writer);
						this.writeHexLocation(writer);
					}
				)
			);
		return sequence;
	}

	void readUnitState(Synchronizer sync) {
		sync.read("unit")
			.read("steps")
			.read("tiredness", Tiredness::getLabel)
			.read("cohesion", Cohesion::getLabel)
			.read("ammunition", Ammunition::getLabel)
			.read("charging", Charging::getLabel)
			.read("engaging")
			.read("disruptChecked")
			.read("routChecked")
			.read("neighborsCohesionLoss")
			.read("defenderEngagementChecking")
			.read("attackerEngagementChecking")
			.read("orderGiven")
			.read("played");
	}

	void readHexLocation(Synchronizer sync) {
		sync.read("hexCol")
			.read("hexRow")
			.read("hexAngle")
			.read("stacking", Stacking::getLabel);
	}

	void readAngle(Synchronizer sync) {
		sync.read("angle");
	}

	void readDice(Synchronizer sync) {
		sync.read("dice1")
			.read("dice2");
	}

	void readDie(Synchronizer sync) {
		sync.read("dice1");
	}

	void readLeader(Synchronizer sync) {
		sync.read("leader");
	}

	void readOrderInstruction(Synchronizer sync) {
		sync.read("orderInstruction", OrderInstruction::getLabel);
	}

	void readInCommand(Synchronizer sync) {
		sync.read("inCommand");
	}

	void readCombat(Synchronizer sync) {
		sync.read("attackerHexCol")
			.read("attackerHexRow")
			.read("defender")
			.read("defenderHexCol")
			.read("defenderHexRow")
			.read("advantage");
	}

	void readShockAttack(Synchronizer sync) {
		this.readCombat(sync);
		sync.read("supported");
	}

	void readFireAttack(Synchronizer sync) {
		this.readCombat(sync);
	}

	void readLosses(Synchronizer sync) {
		sync.read("unit")
			.read("attacker")
			.read("losses")
			.read("advance")
			.read("id");
	}

	void readAskRequest(Synchronizer sync) {
		sync.read("askRequest");
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
				.syncWhen((eJson, eelem)->eelem.getClass()==SequenceElement.StateSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "State");
						this.readUnitState(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.MoveSequenceElement, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Move");
						this.readUnitState(reader);
						this.readHexLocation(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.RotateSequenceElement, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Rotate");
						this.readUnitState(reader);
						this.readAngle(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.ReorientSequenceElement, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Reorient");
						this.readUnitState(reader);
						this.readAngle(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.TurnSequenceElement, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Turn");
						this.readUnitState(reader);
						this.readHexLocation(reader);
						this.readAngle(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.RestSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Rest");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.RefillSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Refill");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.RallySequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Rally");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.ReorganizeSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Reorganize");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.LossConsistencySequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "LossConsistency");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.CrossingSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Crossing");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.AttackerEngagementSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "AttackerEngagement");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.DefenderEngagementSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "DefenderEngagement");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.DisengagementSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Disengagement");
						this.readUnitState(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.Try2ChangeOrderInstructionSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Try2ChangeOrderInst");
						this.readLeader(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.Try2TakeCommandSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Try2TakeCommand");
						this.readLeader(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.Try2DismissCommandSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Try2DismissCommand");
						this.readLeader(reader);
						this.readDice(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.GiveOrdersSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "GiveOrders");
						this.readLeader(reader);
						this.readDie(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.ChangeOrderInstructionSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "ChangeOrderInst");
						this.readLeader(reader);
						this.readOrderInstruction(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.ManageCommandSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "ManageCommand");
						this.readLeader(reader);
						this.readInCommand(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.ShockAttackSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "ShockAttack");
						this.readUnitState(reader);
						this.readDice(reader);
						this.readShockAttack(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.FireAttackSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "FireAttack");
						this.readUnitState(reader);
						this.readDice(reader);
						this.readFireAttack(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.Ask4RetreatSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Ask4Retreat");
						this.readLosses(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.RetreatSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Retreat");
						this.readUnitState(reader);
						this.readHexLocation(reader);
						this.readAskRequest(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.AdvanceSequenceElement.class, (eJson, eelem)->{
						Synchronizer reader = sync(eJson, eelem);
						reader.setInJson("type", "Advance");
						this.readUnitState(reader);
						this.readHexLocation(reader);
					}
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.NextTurnSequenceElement, (eJson, eelem)->sync(eJson, eelem)
					.setInJson("type", "NextTurn")
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
