package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.SequenceController;
import fr.cblades.domain.*;
import fr.cblades.game.SequenceVisitor;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.EntityNotFoundException;
import javax.persistence.PersistenceException;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class SequenceControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	SequenceController sequenceController;
	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		sequenceController = new SequenceController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
	}

	static String STATE_SEQUENCE_CREATION = "{\n" +
	"  version: 0, game: \"Game\", count: 2,\n" +
	"  elements: [\n" +
	"    {\n" +
	"      version: 0, type: \"State\", unit: \"./../units/banner1.png-0\",\n" +
	"      cohesion: \"GO\", tiredness: \"F\", ammunition: \"P\", charging: \"N\",\n" +
	"      engaging: false, orderGiven: false, played: false\n" +
	"    }\n" +
	"  ]\n" +
	"}";

	@Test
	public void createSequenceWithStateSequence() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Sequence);
			Sequence sequence = (Sequence) entity;
			Assert.assertEquals("Game", sequence.getGame());
			Assert.assertEquals(2, sequence.getCount());
			Assert.assertEquals(1, sequence.getElements().size());
			Assert.assertTrue(sequence.getElements().get(0) instanceof SequenceElement.StateSequenceElement);
			SequenceElement.StateSequenceElement element =
					(SequenceElement.StateSequenceElement)sequence.getElements().get(0);
			Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
			Assert.assertEquals(Cohesion.GOOD_ORDER, element.getCohesion());
			Assert.assertEquals(Tiredness.FRESH, element.getTiredness());
			Assert.assertEquals(Ammunition.PLENTIFUL, element.getAmmunition());
			Assert.assertEquals(Charging.NONE, element.getCharging());
			Assert.assertFalse(element.isEngaging());
			Assert.assertFalse(element.hasGivenOrder());
			Assert.assertFalse(element.isPlayed());
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = sequenceController.create(params(), Json.createJsonFromString(STATE_SEQUENCE_CREATION));
		Assert.assertEquals(
			"{\"" +
					"game\":\"Game\"," +
					"\"elements\":[" +
						"{" +
							"\"ammunition\":\"P\",\"engaging\":false," +
							"\"tiredness\":\"F\",\"orderGiven\":false," +
							"\"unit\":\"./../units/banner1.png-0\"," +
							"\"charging\":\"N\",\"id\":0,\"cohesion\":\"GO\"," +
							"\"type\":\"State\",\"version\":0,\"played\":false" +
						"}" +
					"]," +
					"\"count\":2,\"id\":0,\"version\":0" +
					"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void checkStateSequenceElementEntity() {
		SequenceElement.StateSequenceElement element = new SequenceElement.StateSequenceElement() {
			@Override
			public void accept(SequenceVisitor visitor) {
			}
		};
		element.setTiredness(Tiredness.TIRED);
		element.setCohesion(Cohesion.DISRUPTED);
		element.setAmmunition(Ammunition.SCARCE);
		element.setCharging(Charging.CHARGING);
		element.setUnit("./../units/banner1.png-0");
		element.setEngaging(true);
		element.setGivenOrder(true);
		element.setPlayed(true);
		Assert.assertEquals(Tiredness.TIRED, element.getTiredness());
		Assert.assertEquals(Cohesion.DISRUPTED, element.getCohesion());
		Assert.assertEquals(Ammunition.SCARCE, element.getAmmunition());
		Assert.assertEquals(Charging.CHARGING, element.getCharging());
		Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
		Assert.assertTrue(element.isEngaging());
		Assert.assertTrue(element.hasGivenOrder());
		Assert.assertTrue(element.isPlayed());
	}

	static String MOVE_SEQUENCE_CREATION = "{\n" +
			"  version: 0, game: \"Game\", count: 2,\n" +
			"  elements: [\n" +
			"  {\n" +
			"    version: 0, type: \"Move\", unit: \"./../units/banner1.png-0\",\n" +
			"    cohesion: \"D\", tiredness: \"T\", ammunition: \"S\", charging: \"BC\",\n" +
			"    engaging: false, orderGiven: false, played: false,\n" +
			"    hexCol: 5, hexRow: 8, stacking: \"B\"\n" +
			"  }\n" +
			"  ]\n" +
			"}";

	@Test
	public void createSequenceWithMoveSequence() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Sequence);
			Sequence sequence = (Sequence) entity;
			Assert.assertEquals("Game", sequence.getGame());
			Assert.assertEquals(2, sequence.getCount());
			Assert.assertEquals(1, sequence.getElements().size());
			Assert.assertTrue(sequence.getElements().get(0) instanceof SequenceElement.MoveSequenceElement);
			SequenceElement.MoveSequenceElement element =
					(SequenceElement.MoveSequenceElement)sequence.getElements().get(0);
			Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
			Assert.assertEquals(Cohesion.DISRUPTED, element.getCohesion());
			Assert.assertEquals(Tiredness.TIRED, element.getTiredness());
			Assert.assertEquals(Ammunition.SCARCE, element.getAmmunition());
			Assert.assertEquals(Charging.BEGIN_CHARGE, element.getCharging());
			Assert.assertFalse(element.isEngaging());
			Assert.assertFalse(element.hasGivenOrder());
			Assert.assertFalse(element.isPlayed());
			Assert.assertEquals(5, element.getHexCol());
			Assert.assertEquals(8, element.getHexRow());
			Assert.assertEquals(Stacking.BOTTOM, element.getStacking());
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = sequenceController.create(params(), Json.createJsonFromString(MOVE_SEQUENCE_CREATION));
		Assert.assertEquals("{" +
				"\"game\":\"Game\"," +
				"\"elements\":[{" +
					"\"ammunition\":\"S\",\"hexRow\":8,\"tiredness\":\"T\"," +
					"\"hexAngle\":0,\"charging\":\"BC\",\"type\":\"Move\"," +
					"\"version\":0,\"played\":false,\"engaging\":false,\"orderGiven\":false," +
					"\"unit\":\"./../units/banner1.png-0\",\"id\":0,\"cohesion\":\"D\"," +
					"\"hexCol\":5,\"stacking\":\"B\"" +
				"}]," +
				"\"count\":2,\"id\":0,\"version\":0" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void checkMoveSequenceElementEntity() {
		SequenceElement.MoveSequenceElement element = new SequenceElement.MoveSequenceElement();
		element.setUnit("./../units/banner1.png-0");
		element.setHexCol(5);
		element.setHexRow(8);
		element.setHexAngle(60);
		element.setStacking(Stacking.TOP);
		Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
		Assert.assertEquals(5, element.getHexCol());
		Assert.assertEquals(8, element.getHexRow());
		Assert.assertEquals(60, element.getHexAngle());
		Assert.assertEquals(Stacking.TOP, element.getStacking());
	}

	static String ROTATE_SEQUENCE_CREATION = "{\n" +
			"  version: 0, game: \"Game\", count: 2,\n" +
			"  elements: [\n" +
			"  {\n" +
			"    version: 0, type: \"Rotate\", unit: \"./../units/banner1.png-0\",\n" +
			"    cohesion: \"R\", tiredness: \"E\", ammunition: \"E\", charging: \"CC\",\n" +
			"    engaging: false, orderGiven: false, played: false, angle: 60\n" +
			"    }\n" +
			"  ]\n" +
			"}";

	@Test
	public void createSequenceWithRotateSequence() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Sequence);
			Sequence sequence = (Sequence) entity;
			Assert.assertEquals("Game", sequence.getGame());
			Assert.assertEquals(2, sequence.getCount());
			Assert.assertEquals(1, sequence.getElements().size());
			Assert.assertTrue(sequence.getElements().get(0) instanceof SequenceElement.RotateSequenceElement);
			SequenceElement.RotateSequenceElement element =
					(SequenceElement.RotateSequenceElement)sequence.getElements().get(0);
			Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
			Assert.assertEquals(Cohesion.ROOTED, element.getCohesion());
			Assert.assertEquals(Tiredness.EXHAUSTED, element.getTiredness());
			Assert.assertEquals(Ammunition.EXHAUSTED, element.getAmmunition());
			Assert.assertEquals(Charging.CAN_CHARGE, element.getCharging());
			Assert.assertFalse(element.isEngaging());
			Assert.assertFalse(element.hasGivenOrder());
			Assert.assertFalse(element.isPlayed());
			Assert.assertEquals(60, element.getAngle());
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = sequenceController.create(params(), Json.createJsonFromString(ROTATE_SEQUENCE_CREATION));
		Assert.assertEquals("{" +
			"\"game\":\"Game\"," +
			"\"elements\":[{" +
				"\"ammunition\":\"E\",\"engaging\":false,\"tiredness\":\"E\",\"orderGiven\":false," +
				"\"unit\":\"./../units/banner1.png-0\"," +
				"\"charging\":\"CC\",\"angle\":60,\"id\":0,\"cohesion\":\"R\"," +
				"\"type\":\"Rotate\",\"version\":0,\"played\":false" +
			"}]," +
			"\"count\":2,\"id\":0,\"version\":0" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void checkRotateSequenceElementEntity() {
		SequenceElement.RotateSequenceElement element = new SequenceElement.RotateSequenceElement();
		element.setUnit("./../units/banner1.png-0");
		element.setAngle(60);
		Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
		Assert.assertEquals(60, element.getAngle());
	}

	static String REORIENT_SEQUENCE_CREATION = "{\n" +
		"  version: 0, game: \"Game\", count: 2,\n" +
		"  elements: [\n" +
		"  {\n" +
		"    version: 0, type: \"Reorient\", unit: \"./../units/banner1.png-0\",\n" +
		"    cohesion: \"X\", tiredness: \"F\", ammunition: \"P\", charging: \"C\",\n" +
		"    engaging: true, orderGiven: true, played: true, angle: 60\n" +
		"  }\n" +
		"  ]\n" +
		"}";

	@Test
	public void createSequenceWithReorientSequence() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Sequence);
			Sequence sequence = (Sequence) entity;
			Assert.assertEquals("Game", sequence.getGame());
			Assert.assertEquals(2, sequence.getCount());
			Assert.assertEquals(1, sequence.getElements().size());
			Assert.assertTrue(sequence.getElements().get(0) instanceof SequenceElement.ReorientSequenceElement);
			SequenceElement.ReorientSequenceElement element =
					(SequenceElement.ReorientSequenceElement)sequence.getElements().get(0);
			Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
			Assert.assertEquals(Cohesion.DELETED, element.getCohesion());
			Assert.assertEquals(Tiredness.FRESH, element.getTiredness());
			Assert.assertEquals(Ammunition.PLENTIFUL, element.getAmmunition());
			Assert.assertEquals(Charging.CHARGING, element.getCharging());
			Assert.assertTrue(element.isEngaging());
			Assert.assertTrue(element.hasGivenOrder());
			Assert.assertTrue(element.isPlayed());
			Assert.assertEquals(60, element.getAngle());
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = sequenceController.create(params(), Json.createJsonFromString(REORIENT_SEQUENCE_CREATION));
		Assert.assertEquals("{" +
			"\"game\":\"Game\"," +
			"\"elements\":[{" +
				"\"ammunition\":\"P\",\"engaging\":true,\"tiredness\":\"F\",\"orderGiven\":true," +
				"\"unit\":\"./../units/banner1.png-0\"," +
				"\"charging\":\"C\",\"angle\":60,\"id\":0,\"cohesion\":\"X\"," +
				"\"type\":\"Reorient\",\"version\":0,\"played\":true" +
			"}]," +
			"\"count\":2,\"id\":0,\"version\":0" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void checkReorientSequenceElementEntity() {
		SequenceElement.ReorientSequenceElement element = new SequenceElement.ReorientSequenceElement();
		element.setUnit("./../units/banner1.png-0");
		element.setAngle(60);
		Assert.assertEquals("./../units/banner1.png-0", element.getUnit());
		Assert.assertEquals(60, element.getAngle());
	}

	static String TURN_SEQUENCE_CREATION = "{\n" +
		"  version: 0, game: \"Game\", count: 2,\n" +
		"  elements: [\n" +
		"  {\n" +
		"    version: 0, type: \"Turn\", unit: \"./../units/banner1.png-1\",\n" +
		"    cohesion: \"GO\", tiredness: \"F\", ammunition: \"P\", charging: \"N\",\n" +
		"    engaging: false, orderGiven: false, played: false,\n" +
		"    hexCol: 6, hexRow: 8, hexAngle: 180, stacking: \"T\", angle: 60\n" +
		"  }\n" +
		"  ]\n" +
		"}";

	@Test
	public void createSequenceWithTurnSequence() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Sequence);
			Sequence sequence = (Sequence) entity;
			Assert.assertEquals("Game", sequence.getGame());
			Assert.assertEquals(2, sequence.getCount());
			Assert.assertEquals(1, sequence.getElements().size());
			Assert.assertTrue(sequence.getElements().get(0) instanceof SequenceElement.TurnSequenceElement);
			SequenceElement.TurnSequenceElement element =
					(SequenceElement.TurnSequenceElement)sequence.getElements().get(0);
			Assert.assertEquals("./../units/banner1.png-1", element.getUnit());
			Assert.assertEquals(Cohesion.GOOD_ORDER, element.getCohesion());
			Assert.assertEquals(Tiredness.FRESH, element.getTiredness());
			Assert.assertEquals(Ammunition.PLENTIFUL, element.getAmmunition());
			Assert.assertEquals(Charging.NONE, element.getCharging());
			Assert.assertEquals(6, element.getHexCol());
			Assert.assertEquals(8, element.getHexRow());
			Assert.assertEquals(180, element.getHexAngle());
			Assert.assertFalse(element.isEngaging());
			Assert.assertFalse(element.hasGivenOrder());
			Assert.assertFalse(element.isPlayed());
			Assert.assertEquals(60, element.getAngle());
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = sequenceController.create(params(), Json.createJsonFromString(TURN_SEQUENCE_CREATION));
		Assert.assertEquals("{" +
			"\"game\":\"Game\"," +
			"\"elements\":[{" +
				"\"ammunition\":\"P\",\"hexRow\":8,\"tiredness\":\"F\",\"hexAngle\":180," +
				"\"charging\":\"N\",\"type\":\"Turn\",\"version\":0,\"played\":false," +
				"\"engaging\":false,\"orderGiven\":false," +
				"\"unit\":\"./../units/banner1.png-1\"," +
				"\"angle\":60,\"id\":0,\"cohesion\":\"GO\",\"hexCol\":6,\"stacking\":\"T\"" +
			"}]," +
			"\"count\":2,\"id\":0,\"version\":0" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void checkTurnSequenceElementEntity() {
		SequenceElement.TurnSequenceElement element = new SequenceElement.TurnSequenceElement();
		element.setUnit("./../units/banner1.png-1");
		element.setHexCol(5);
		element.setHexRow(8);
		element.setHexAngle(180);
		element.setAngle(60);
		element.setStacking(Stacking.TOP);
		Assert.assertEquals("./../units/banner1.png-1", element.getUnit());
		Assert.assertEquals(5, element.getHexCol());
		Assert.assertEquals(8, element.getHexRow());
		Assert.assertEquals(180, element.getHexAngle());
		Assert.assertEquals(60, element.getAngle());
		Assert.assertEquals(Stacking.TOP, element.getStacking());
	}

	static String NEXT_TURN_SEQUENCE_CREATION = "{\n" +
		"  version: 0, game: \"Game\", count: 2,\n" +
		"  elements: [\n" +
		"  {\n" +
		"    version:0, type:\"NextTurn\"\n" +
		"  }\n" +
		"  ]\n" +
		"}";

	@Test
	public void createSequenceWithNextTurnSequence() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Sequence);
			Sequence sequence = (Sequence) entity;
			Assert.assertEquals("Game", sequence.getGame());
			Assert.assertEquals(2, sequence.getCount());
			Assert.assertEquals(1, sequence.getElements().size());
			Assert.assertTrue(sequence.getElements().get(0) instanceof SequenceElement.NextTurnSequenceElement);
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = sequenceController.create(params(), Json.createJsonFromString(NEXT_TURN_SEQUENCE_CREATION));
		Assert.assertEquals("{\"" +
			"game\":\"Game\",\"elements\":[{" +
				"\"id\":0,\"type\":\"NextTurn\",\"version\":0" +
			"}]," +
			"\"count\":2,\"id\":0,\"version\":0" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingSequence() {
		dataManager.register("persist", null,
			new PersistenceException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof Sequence);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			sequenceController.create(params(), Json.createJsonFromString(STATE_SEQUENCE_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Sequence of game (Game) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewSequenceWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			sequenceController.create(params(), Json.createJsonFromString(STATE_SEQUENCE_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneSequenceByNameAndCount() {
		Sequence sequence = (Sequence)setEntityId(new Sequence()
				.setCount(2).setGame(1L), 1);
		dataManager.register("createQuery", null, null, "select s from Sequence s left outer join fetch s.elements where s.game = :game and s.count = :count");
		dataManager.register("setParameter", null, null,"game", 1L);
		dataManager.register("setParameter", null, null,"count", 2L);
		dataManager.register("getSingleResult", sequence, null);
		securityManager.doConnect("admin", 0);
		Json result = sequenceController.getByGameAndCount(params("game", 1, "count", "2"), null);
		Assert.assertEquals(result.toString(),
			"{\"game\":\"game\",\"elements\":[],\"count\":2,\"id\":1,\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAnUnknownGame() {
		dataManager.register("createQuery", null, null, "select s from Sequence s left outer join fetch s.elements where s.game = :game and s.count = :count");
		dataManager.register("setParameter", null, null,"game", "game");
		dataManager.register("setParameter", null, null,"count", 2L);
		dataManager.register("getSingleResult", null, null);
		securityManager.doConnect("admin", 0);
		try {
			sequenceController.getByGameAndCount(params("game", "game", "count", "2"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown sequence of game game and count 2", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByGameAndCountASEquenceWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			sequenceController.getByGameAndCount(params("game", "game", "count", "2"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneBoardById() {
		Sequence sequence = (Sequence)setEntityId(new Sequence()
			.setCount(2).setGame(1L), 1);
		dataManager.register("find", sequence,null, Sequence.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = sequenceController.getById(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"game\":1,\"elements\":[],\"count\":2,\"id\":1,\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownSequence() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Sequence.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			sequenceController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown sequence with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAGameWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			sequenceController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void deleteAGame() {
		Sequence sequence = (Sequence)setEntityId(new Sequence()
			.setCount(2).setGame(1L), 1);
		dataManager.register("find", sequence, null, Sequence.class, 1L);
		Ref<Sequence> rSequence = new Ref<>();
		dataManager.register("merge", (Supplier)()->rSequence.get(), null,
			(Predicate) entity->{
				if (!(entity instanceof Sequence)) return false;
				rSequence.set((Sequence) entity);
				if (rSequence.get().getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("remove", null, null,
			(Predicate) entity->{
				if (!(entity instanceof Sequence)) return false;
				Sequence dSequence = (Sequence) entity;
				if (dSequence.getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = sequenceController.delete(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"deleted\":\"ok\"}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAnUnknownGame() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Sequence.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			sequenceController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown sequence with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAGameAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Sequence.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			sequenceController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAGameWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			sequenceController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkSequenceEntity() {
		SequenceElement.NextTurnSequenceElement element =
			new SequenceElement.NextTurnSequenceElement();
		Sequence sequence = new Sequence()
			.setGame(1L)
			.setCount(2)
			.addElement(element);
		Assert.assertEquals("game", sequence.getGame());
		Assert.assertEquals(2L, sequence.getCount());
		Assert.assertEquals(element, sequence.getElements().get(0));
		sequence.removeElement(element);
		Assert.assertEquals(0, sequence.getElements().size());
	}

}
