package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BoardController;
import fr.cblades.controller.GameController;
import fr.cblades.domain.*;
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

public class GameControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	GameController gameController;
	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		gameController = new GameController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
	}

	static String SIMPLE_GAME_CREATION = "{\n" +
			"	version:0, name:\"Test\",\n" +
			"	players:[\n" +
			"		{\n" +
			"			version:0, name:\"Hector\",\n" +
			"			wings:[\n" +
			"		{\n" +
			"			version:0, banner:\"redbanner\",\n" +
			"			units:[{\n" +
			"				version:0, name:\"redbanner-0\", category:\"T\", type:\"unit\",\n" +
			"				angle:120, positionCol:3, positionRow:4, positionAngle:0, steps:2,\n" +
			"				tiredness:\"F\", ammunition:\"P\", cohesion:\"GO\", charging:false,\n" +
			"				contact:false, orderGiven:false, played:false\n" +
			"			}],\n" +
			"			retreatZone:[\n" +
			"				{version:0, col:3, row:4}\n" +
			"			]\n" +
			"		}],\n" +
			"		locations:[\n" +
			"			{version:0,col:3,row:4,units:[\"redbanner-0\"]}\n" +
			"		]\n" +
			"	}]\n" +
			"}";

	@Test
	public void createNewBoard() {
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult",
			setEntityId(new PlayerIdentity().setName("Hector").setPath("/players/hector.png"), 107),null);
		dataManager.register("createQuery", null, null,
				"select b from Banner b where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "redbanner");
		dataManager.register("getSingleResult",
			setEntityId(new Banner().setName("redbanner").setPath("/red/redbanner.png"), 107),null);
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Game);
			Game game = (Game) entity;
			Assert.assertEquals("Test", game.getName());
			Assert.assertEquals(1, game.getPlayers().size());
			Player player = game.getPlayers().get(0);
			Assert.assertEquals("Hector", player.getIdentity().getName());
			Assert.assertEquals("/players/hector.png", player.getIdentity().getPath());
			Assert.assertEquals(1, player.getWings().size());
			Wing wing = player.getWings().get(0);
			Assert.assertEquals("redbanner", wing.getBanner().getName());
			Assert.assertEquals("/red/redbanner.png", wing.getBanner().getPath());
			Assert.assertEquals(1, wing.getUnits().size());
			Unit unit = wing.getUnits().get(0);
			Assert.assertEquals(0, unit.getId());
			Assert.assertEquals(0, unit.getVersion());
			Assert.assertEquals("redbanner-0", unit.getName());
			Assert.assertEquals(UnitCategory.TROOP, unit.getCategory());
			Assert.assertEquals("unit", unit.getType());
			Assert.assertEquals(120, unit.getAngle());
			Assert.assertEquals(3, unit.getPositionCol());
			Assert.assertEquals(4, unit.getPositionRow());
			Assert.assertEquals(0, unit.getPositionAngle());
			Assert.assertEquals(2, unit.getSteps());
			Assert.assertEquals(Tiredness.FRESH, unit.getTiredness());
			Assert.assertEquals(Ammunition.PLENTIFUL, unit.getAmmunition());
			Assert.assertEquals(Cohesion.GOOD_ORDER, unit.getCohesion());
			Assert.assertFalse(unit.isCharging());
			Assert.assertFalse(unit.isContact());
			Assert.assertFalse(unit.isOrderGiven());
			Assert.assertFalse(unit.isPlayed());
			Assert.assertEquals(1, wing.getRetreatZone().size());
			TargetHex retreatHex = wing.getRetreatZone().get(0);
			Assert.assertEquals(0, retreatHex.getId());
			Assert.assertEquals(0, retreatHex.getVersion());
			Assert.assertEquals(3, retreatHex.getCol());
			Assert.assertEquals(4, retreatHex.getRow());
			Assert.assertEquals(1, player.getLocations().size());
			Location location = player.getLocations().get(0);
			Assert.assertEquals(0, location.getId());
			Assert.assertEquals(0, location.getVersion());
			Assert.assertEquals(3, location.getCol());
			Assert.assertEquals(4, location.getRow());
			Assert.assertEquals(1, location.getUnits().size());
			Assert.assertEquals(unit, location.getUnits().get(0));
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
		Assert.assertEquals(
			"{" +
				"\"players\":[" +
				"{" +
					"\"wings\":[" +
					"{\"" +
						"retreatZone\":[" +
							"{\"col\":3,\"id\":0,\"row\":4,\"version\":0}" +
						"]," +
						"\"banner\":\"redbanner\"," +
						"\"id\":0," +
						"\"units\":[" +
						"{" +
							"\"ammunition\":\"P\",\"tiredness\":\"F\"," +
							"\"charging\":false,\"positionAngle\":0," +
							"\"type\":\"unit\",\"version\":0,\"steps\":2," +
							"\"played\":false,\"orderGiven\":false," +
							"\"contact\":false,\"name\":\"redbanner-0\"," +
							"\"angle\":120,\"positionCol\":3,\"id\":0," +
							"\"cohesion\":\"GO\",\"category\":\"T\"," +
							"\"positionRow\":4" +
						"}" +
						"]," +
						"\"version\":0}],\"name\":\"Hector\"," +
						"\"locations\":[" +
						"{" +
							"\"col\":3,\"id\":0,\"row\":4," +
							"\"units\":[" +
								"\"redbanner-0\"" +
							"]," +
							"\"version\":0" +
						"}" +
						"]," +
					"\"id\":0,\"version\":0" +
				"}" +
				"]," +
				"\"name\":\"Test\"," +
				"\"id\":0,\"version\":0" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingGame() {
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult",
				setEntityId(new PlayerIdentity().setName("Hector").setPath("/players/hector.png"), 107),null);
		dataManager.register("createQuery", null, null,
				"select b from Banner b where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "redbanner");
		dataManager.register("getSingleResult",
				setEntityId(new Banner().setName("redbanner").setPath("/red/redbanner.png"), 107),null);
		dataManager.register("persist", null,
			new PersistenceException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof Game);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Game with name (Test) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewGameWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void listAllGames() {
		dataManager.register("createQuery", null, null, "select g from Game g");
		dataManager.register("getResultList", arrayList(
			setEntityId(new Game().setName("game1"), 1),
			setEntityId(new Game().setName("game2"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = gameController.getAll(params(), null);
		Assert.assertEquals("[" +
			"{\"name\":\"game1\",\"id\":1,\"version\":0}," +
			"{\"name\":\"game2\",\"id\":2,\"version\":0}" +
		"]",
		result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToListAllGamessWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			gameController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneGameByName() {
		Game game = (Game)setEntityId(new Game().setName("game1"), 1);
		dataManager.register("createQuery", null, null, "select g from Game g where g.name = :name");
		dataManager.register("setParameter", null, null,"name", "game1");
		dataManager.register("getResultList", arrayList(game), null);
		dataManager.register("find", game, null, Game.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = gameController.getByName(params("name", "game1"), null);
		Assert.assertEquals(result.toString(),
			"{\"players\":[],\"name\":\"game1\",\"id\":1,\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAnUnknownGame() {
		dataManager.register("createQuery", null, null, "select g from Game g where g.name = :name");
		dataManager.register("setParameter", null, null,"name", "game1");
		dataManager.register("getResultList", arrayList(), null);
		securityManager.doConnect("admin", 0);
		try {
			gameController.getByName(params("name", "game1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Game with name game1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void findTwoGamesWithTheSameName() {
		Game game1 = (Game)setEntityId(new Game().setName("game1"), 1);
		Game game2 = (Game)setEntityId(new Game().setName("game1"), 2);
		dataManager.register("createQuery", null, null, "select g from Game g where g.name = :name");
		dataManager.register("setParameter", null, null,"name", "game1");
		dataManager.register("getResultList", arrayList(game1, game2), null);
		securityManager.doConnect("admin", 0);
		try {
			gameController.getByName(params("name", "game1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("query did not return a unique result: 2", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAGameWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			gameController.getByName(params("name", "game1"), null);
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
		Game game = (Game)setEntityId(new Game().setName("game1"), 1);
		dataManager.register("find", game,null, Game.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = gameController.getById(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
			"{\"players\":[],\"name\":\"game1\",\"id\":1,\"version\":0}"		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownGame() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Game.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			gameController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown game with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAGameWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			gameController.getById(params("id", "1"), null);
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
		Game game = (Game)setEntityId(new Game().setName("game1"), 1);
		dataManager.register("find", game, null, Game.class, 1L);
		Ref<Game> rGame = new Ref<>();
		dataManager.register("merge", (Supplier)()->rGame.get(), null,
			(Predicate) entity->{
				if (!(entity instanceof Game)) return false;
				rGame.set((Game) entity);
				if (rGame.get().getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("remove", null, null,
			(Predicate) entity->{
				if (!(entity instanceof Game)) return false;
				Game dGame = (Game) entity;
				if (dGame.getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = gameController.delete(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"deleted\":\"ok\"}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAnUnknownGame() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Game.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			gameController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown game with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAGameAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Game.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			gameController.delete(params("id", "1"), null);
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
			gameController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	static String SIMPLE_GAME_UPDATE = "{\n" +
			"	id:101, version:0, name:\"game\",\n" +
			"	players:[\n" +
			"	{\n" +
			"		id:102, version:0, name:\"Hector\",\n" +
			"		wings:[\n" +
			"		{\n" +
			"			id:103, version:0, banner:\"redbanner\",\n" +
			"			units:[{\n" +
			"				id:105, version:0, name:\"redbanner-0\", category:\"T\", type:\"unit\",\n" +
			"				angle:120, positionCol:3, positionRow:4, positionAngle:0, steps:1,\n" +
			"				tiredness:\"T\", ammunition:\"S\", cohesion:\"D\", charging:true,\n" +
			"				contact:true, orderGiven:true, played:true\n" +
			"			}],\n" +
			"			retreatZone:[\n" +
			"				{id:104, version:0, col:3, row:4}\n" +
			"			]\n" +
			"		}],\n" +
			"		locations:[\n" +
			"			{id:106, version:0,col:3,row:4,units:[\"redbanner-0\"]}\n" +
			"		]\n" +
			"	}]\n" +
			"}";

	@Test
	public void updateAGame() {
		Unit unit = (Unit)setEntityId(new Unit().setName("redbanner-0")
			.setPositionCol(3).setPositionRow(4).setPositionAngle(180), 105);
		TargetHex retreatHex = (TargetHex)setEntityId(new TargetHex().setCol(4).setRow(5), 104);
		Banner banner = (Banner)setEntityId(new Banner().setPath("/plue/bluebanner.png").setName("bluebanner"),
				103);
		Wing wing = (Wing)setEntityId(new Wing().setBanner(banner)
			.addToRetreatZone(retreatHex).addUnit(unit), 103);
		Location location = (Location)setEntityId(new Location().setRow(3).setCol(4).addUnit(unit), 106);
		PlayerIdentity playerIdentity = (PlayerIdentity)setEntityId(new PlayerIdentity().setName("Achilles").setPath("/players/achilles.png"), 107);
		Player player = (Player)setEntityId(new Player().setIdentity(playerIdentity).addWing(wing).addHex(location), 102);
		Game game = (Game)setEntityId(new Game().setName("game1").addPlayer(player), 101);

		dataManager.register("find", game, null, Game.class, 101L);
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult",
				setEntityId(new PlayerIdentity().setName("Hector").setPath("/players/hector.png"), 107),null);
		dataManager.register("createQuery", null, null,
				"select b from Banner b where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "redbanner");
		dataManager.register("getSingleResult",
				setEntityId(new Banner().setName("redbanner").setPath("/red/redbanner.png"), 107),null);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = gameController.update(params("id", "101"), Json.createJsonFromString(SIMPLE_GAME_UPDATE));
		Assert.assertEquals(
			"{" +
				"\"players\":[{" +
					"\"wings\":[{\"" +
						"retreatZone\":[" +
							"{\"col\":3,\"id\":104,\"row\":4,\"version\":0}" +
						"]," +
						"\"banner\":\"redbanner\"," +
						"\"id\":103," +
						"\"units\":[{" +
							"\"ammunition\":\"S\",\"tiredness\":\"T\"," +
							"\"charging\":true,\"positionAngle\":0," +
							"\"type\":\"unit\",\"version\":0,\"steps\":1," +
							"\"played\":true,\"orderGiven\":true," +
							"\"contact\":true,\"name\":\"redbanner-0\"," +
							"\"angle\":120,\"positionCol\":3,\"id\":105," +
							"\"cohesion\":\"D\",\"category\":\"T\"," +
							"\"positionRow\":4" +
						"}]," +
						"\"version\":0}],\"name\":\"Hector\"," +
						"\"locations\":[{" +
							"\"col\":3,\"id\":106,\"row\":4," +
							"\"units\":[" +
								"\"redbanner-0\"" +
							"]," +
							"\"version\":0" +
						"}]," +
						"\"id\":102,\"version\":0" +
					"}]," +
					"\"name\":\"game\"," +
					"\"id\":101,\"version\":0" +
				"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownGame() {
		dataManager.register("find",
			null, new EntityNotFoundException("Entity Does Not Exists"), Game.class, 101L);
		securityManager.doConnect("admin", 0);
		try {
			gameController.update(params("id", "101"), Json.createJsonFromString(SIMPLE_GAME_UPDATE));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown game with id 101", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAGameAndFailsForAnUnknownReason() {
		dataManager.register("find", null,
			new PersistenceException("Some Reason"), Game.class, 101L);
		securityManager.doConnect("admin", 0);
		try {
			gameController.update(params("id", "101"), Json.createJsonFromString(SIMPLE_GAME_UPDATE));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAGameWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			gameController.update(params("id", "1"), Json.createJsonFromString(SIMPLE_GAME_UPDATE));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkUnitEntity() {
		Unit unit = new Unit()
			.setName("/there/where/unit.png-0")
			.setCategory(UnitCategory.FORMATION)
			.setType("unit-type")
			.setAngle(120)
			.setPositionCol(2)
			.setPositionRow(4)
			.setPositionAngle(120)
			.setSteps(4)
			.setTiredness(Tiredness.TIRED)
			.setAmmunition(Ammunition.SCARCE)
			.setCohesion(Cohesion.ROOTED)
			.setCharging(true)
			.setContact(true)
			.setOrderGiven(true)
			.setPlayed(true);

		Assert.assertEquals("/there/where/unit.png-0", unit.getName());
		Assert.assertEquals(UnitCategory.FORMATION, unit.getCategory());
		Assert.assertEquals("unit-type", unit.getType());
		Assert.assertEquals(120, unit.getAngle());
		Assert.assertEquals(2, unit.getPositionCol());
		Assert.assertEquals(4, unit.getPositionRow());
		Assert.assertEquals(120, unit.getPositionAngle());
		Assert.assertEquals(4, unit.getSteps());
		Assert.assertEquals(Tiredness.TIRED, unit.getTiredness());
		Assert.assertEquals(Ammunition.SCARCE, unit.getAmmunition());
		Assert.assertEquals(Cohesion.ROOTED, unit.getCohesion());
		Assert.assertTrue(unit.isCharging());
		Assert.assertTrue(unit.isContact());
		Assert.assertTrue(unit.isOrderGiven());
		Assert.assertTrue(unit.isPlayed());
	}

	@Test
	public void checkLocationEntity() {
		Unit unit = new Unit()
			.setName("/there/where/unit.png-0")
			.setCategory(UnitCategory.FORMATION)
			.setType("unit-type");
		Location location = new Location()
			.setCol(4).setRow(5)
			.addUnit(unit);
		Assert.assertEquals(4, location.getCol());
		Assert.assertEquals(5, location.getRow());
		Assert.assertEquals(1, location.getUnits().size());
		Assert.assertEquals(unit, location.getUnits().get(0));
		location.removeUnit(unit);
		Assert.assertEquals(0, location.getUnits().size());
	}

	@Test
	public void checkWingEntity() {
		Unit unit = new Unit()
			.setName("/there/where/unit.png-0")
			.setCategory(UnitCategory.FORMATION)
			.setType("unit-type");
		TargetHex hex = new TargetHex()
			.setCol(0).setRow(1);
		Banner banner = new Banner()
			.setName("banner-0")
			.setPath("/there/where/banner.png");
		Wing wing = new Wing()
			.setBanner(banner)
			.addUnit(unit)
			.addToRetreatZone(hex);
		Assert.assertEquals(banner, wing.getBanner());
		Assert.assertEquals(1, wing.getUnits().size());
		Assert.assertEquals(unit, wing.getUnits().get(0));
		wing.removeUnit(unit);
		Assert.assertEquals(0, wing.getUnits().size());
		Assert.assertEquals(1, wing.getRetreatZone().size());
		Assert.assertEquals(hex, wing.getRetreatZone().get(0));
		wing.removeFromRetreatZone(hex);
		Assert.assertEquals(0, wing.getRetreatZone().size());
	}

	@Test
	public void checkPlayerEntity() {
		Unit unit = new Unit()
			.setName("/there/where/unit.png-0")
			.setCategory(UnitCategory.FORMATION)
			.setType("unit-type");
		Banner banner = new Banner()
			.setName("banner-0")
			.setPath("/there/where/banner.png");
		Wing wing = new Wing()
			.setBanner(banner)
			.addUnit(unit);
		Location location = new Location()
			.setCol(4).setRow(5)
			.addUnit(unit);
		PlayerIdentity playerIdentity = new PlayerIdentity()
			.setName("Hector")
			.setPath("/red/redplayer.png");
		Player player = new Player()
			.setIdentity(playerIdentity)
			.addWing(wing)
			.addHex(location);
		Assert.assertEquals("Hector", player.getName());
		Assert.assertEquals(1, player.getWings().size());
		Assert.assertEquals(wing, player.getWings().get(0));
		Assert.assertEquals(wing, player.getWing("banner-0"));
		Assert.assertNull(player.getWing("/there/where/otherbanner.png"));
		Assert.assertEquals(unit, player.getUnit("/there/where/unit.png-0"));
		Assert.assertNull(player.getUnit("/there/where/otherunit.png-0"));
		player.removeWing(wing);
		Assert.assertEquals(0, player.getWings().size());
		Assert.assertEquals(1, player.getLocations().size());
		Assert.assertEquals(location, player.getLocations().get(0));
		player.removeHex(location);
		Assert.assertEquals(0, player.getLocations().size());
	}

	@Test
	public void checkGameEntity() {
		PlayerIdentity playerIdentity = new PlayerIdentity()
			.setName("Hector")
			.setPath("/red/redplayer.png");
		Player player = new Player()
			.setIdentity(playerIdentity);
		Game game = new Game()
			.setName("game")
			.addPlayer(player);
		Assert.assertEquals("game", game.getName());
		Assert.assertEquals(1, game.getPlayers().size());
		Assert.assertEquals(player, game.getPlayers().get(0));
		Assert.assertEquals(player, game.getPlayer("Hector"));
		Assert.assertNull(game.getPlayer("Patrocle"));
		game.removePlayer(player);
		Assert.assertEquals(0, game.getPlayers().size());
	}

}
