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
					persist(em, newSequence);
					if (newSequence.isTurnClosed()) {
						GameMatch gameMatch = GameMatch.getByGame(em, newSequence.getGame());
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

	Sequence writeToSequence(Json json, Sequence sequence) {
		verify(json)
			.checkRequired("game").checkInteger("game")
			.checkRequired("count").checkMin("count", 0)
			.each("elements", cJson->verify(cJson)
				.checkRequired("version")
				.checkWhen(eJson-> "|State|Move|Turn|Rotate|Reorient|".contains("|"+(String)eJson.get("type")+"|"), eJson->verify(eJson)
					.checkRequired("unit").checkMinSize("unit", 2).checkMaxSize("unit", 80)
					.check("tiredness", Tiredness.byLabels().keySet())
					.check("cohesion", Cohesion.byLabels().keySet())
					.check("ammunition", Ammunition.byLabels().keySet())
					.check("charging", Charging.byLabels().keySet())
					.checkBoolean("engaging")
					.checkBoolean("orderGiven")
					.checkBoolean("played")
				)
				.checkWhen(eJson->eJson.get("type").equals("Move"), eJson->verify(eJson)
					.checkRequired("hexCol").checkMin("hexCol", 0).checkMax("hexCol", 200)
					.checkRequired("hexRow").checkMin("hexRow", 0).checkMax("hexRow", 200)
					.checkMin("hexAngle", 0).checkMax("hexAngle", 300)
					.checkRequired("stacking").check("stacking", Stacking.byLabels().keySet())
				)
				.checkWhen(eJson->eJson.get("type").equals("Rotate"), eJson->verify(eJson)
					.checkRequired("angle").checkMin("angle", 0).checkMax("angle", 300)
				)
				.checkWhen(eJson->eJson.get("type").equals("Reorient"), eJson->verify(eJson)
					.checkRequired("angle").checkMin("angle", 0).checkMax("angle", 300)
				)
				.checkWhen(eJson->eJson.get("type").equals("Turn"), eJson->verify(eJson)
					.checkRequired("hexCol").checkMin("hexCol", 0).checkMax("hexCol", 200)
					.checkRequired("hexRow").checkMin("hexRow", 0).checkMax("hexRow", 200)
					.checkMin("hexAngle", 0).checkMax("hexAngle", 300)
					.checkRequired("angle").checkMin("angle", 0).checkMax("angle", 300)
					.checkRequired("stacking").check("stacking", Stacking.byLabels().keySet())
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
					pair("NextTurn", SequenceElement.NextTurnSequenceElement.class)
				), "type"),
				(cJson, celem)->sync(cJson, celem)
				.write("version")
				.syncWhen((eJson, eelem)-> "|State|Move|Turn|Rotate|Reorient|".contains("|"+(String)eJson.get("type")+"|"), (eJson, eelem)->sync(eJson, eelem)
					.write("unit")
					.write("tiredness", label->Tiredness.byLabels().get(label))
					.write("cohesion", label->Cohesion.byLabels().get(label))
					.write("ammunition", label->Ammunition.byLabels().get(label))
					.write("charging", label->Charging.byLabels().get(label))
					.write("engaging")
					.write("orderGiven")
					.write("played")
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Move"), (eJson, eelem)->sync(eJson, eelem)
					.write("hexCol")
					.write("hexRow")
					.write("hexAngle")
					.write("stacking", label->Stacking.byLabels().get(label))
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Rotate"), (eJson, eelem)->sync(eJson, eelem)
					.write("angle")
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Reorient"), (eJson, eelem)->sync(eJson, eelem)
					.write("angle")
				)
				.syncWhen((eJson, eelem)->eJson.get("type").equals("Turn"), (eJson, eelem)->sync(eJson, eelem)
					.write("hexCol")
					.write("hexRow")
					.write("hexAngle")
					.write("angle")
					.write("stacking", label->Stacking.byLabels().get(label))
				)
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
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.StateSequenceElement, (eJson, eelem)->sync(eJson, eelem)
					.read("unit")
					.read("tiredness", Tiredness::getLabel)
					.read("cohesion", Cohesion::getLabel)
					.read("ammunition", Ammunition::getLabel)
					.read("charging", Charging::getLabel)
					.read("engaging")
					.read("orderGiven")
					.read("played")
				)
				.syncWhen((eJson, eelem)->eelem.getClass() == SequenceElement.StateSequenceElement.class, (eJson, eelem)->sync(eJson, eelem)
					.setInJson("type", "State")
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.MoveSequenceElement, (eJson, eelem)->sync(eJson, eelem)
					.setInJson("type", "Move")
					.read("hexCol")
					.read("hexRow")
					.read("hexAngle")
					.read("stacking", Stacking::getLabel)
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.RotateSequenceElement, (eJson, eelem)->sync(eJson, eelem)
					.setInJson("type", "Rotate")
					.read("angle")
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.ReorientSequenceElement, (eJson, eelem)->sync(eJson, eelem)
					.setInJson("type", "Reorient")
					.read("angle")
				)
				.syncWhen((eJson, eelem)->eelem instanceof SequenceElement.TurnSequenceElement, (eJson, eelem)->sync(eJson, eelem)
					.setInJson("type", "Turn")
					.read("hexCol")
					.read("hexRow")
					.read("hexAngle")
					.read("angle")
					.read("stacking", Stacking::getLabel)
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
