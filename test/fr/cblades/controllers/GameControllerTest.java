package fr.cblades.controllers;

import fr.cblades.StandardUsers;
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
import javax.persistence.NoResultException;
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
			"	map:{\n" +
			"		version:0, " +
			"		boards:[{\n" +
			"			version:0, icon:\"/map/map1-icon.png\", path:\"/map/map1.png\", " +
			"			col:4, row:5, invert:true\n" +
			"		}],\n" +
			"	},\n" +
			"	players:[\n" +
			"		{\n" +
			"			version:0, " +
			"			identity:{\n" +
			"				name: \"Hector\"," +
			"				path: \"/players/hector.png\"" +
			"			},\n" +
			"			wings:[\n" +
			"		{\n" +
			"			version:0, " +
			"			banner:{\n" +
			"				name: \"redbanner\"," +
			"				path: \"/map/redbanner.png\"" +
			"			},\n" +
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
				"select b from Board b where b.path = :path");
		dataManager.register("setParameter", null, null,"path", "/map/map1.png");
		dataManager.register("getSingleResult",
				setEntityId(new Board().setName("map1").setPath("/map/map1.png").setIcon("/map/map1-icon.png"), 109),null);
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
			Assert.assertEquals(1, game.getPlayers().size());
			Map map = game.getMap();
			Assert.assertEquals(1, map.getBoardPlacements().size());
			BoardPlacement boardPlacement = map.getBoardPlacements().get(0);
			Assert.assertEquals(4, boardPlacement.getCol());
			Assert.assertEquals(5, boardPlacement.getRow());
			Assert.assertTrue(boardPlacement.isInvert());
			Board board = boardPlacement.getBoard();
			Assert.assertEquals("map1", board.getName());
			Assert.assertEquals("/map/map1-icon.png", board.getIcon());
			Assert.assertEquals("/map/map1.png", board.getPath());
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
			Assert.assertEquals(new Integer(0), unit.getPositionAngle());
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
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json response = gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
		Assert.assertEquals(
			"{" +
				"\"players\":[" +
				"{" +
					"\"identity\":{" +
						"\"path\":\"/players/hector.png\"," +
						"\"name\":\"Hector\"" +
					"},"+
					"\"wings\":[" +
					"{\"" +
						"retreatZone\":[" +
							"{\"col\":3,\"id\":0,\"row\":4,\"version\":0}" +
						"]," +
						"\"banner\":{" +
							"\"path\":\"/red/redbanner.png\"," +
							"\"name\":\"redbanner\"" +
						"}," +
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
						"\"version\":0}]," +
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
				"\"id\":0,\"version\":0," +
			"\"map\":{" +
				"\"boards\":[{" +
					"\"path\":\"/map/map1.png\"," +
					"\"col\":4,\"invert\":true," +
					"\"icon\":\"/map/map1-icon.png\"," +
					"\"id\":0,\"row\":5,\"version\":0" +
				"}]," +
				"\"id\":0,\"version\":0" +
			"}" +
			"}",
			response.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingGame() {
		dataManager.register("createQuery", null, null,
				"select b from Board b where b.path = :path");
		dataManager.register("setParameter", null, null,"path", "/map/map1.png");
		dataManager.register("getSingleResult",
				setEntityId(new Board().setName("map1").setPath("/map/map1.png").setIcon("/map/map1-icon.png"), 109),null);
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
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("Game with name (Test) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAGameThatRefersToAnUnexistingBoard() {
		dataManager.register("createQuery", null, null,
				"select b from Board b where b.path = :path");
		dataManager.register("setParameter", null, null,"path", "/map/map1.png");
		dataManager.register("getSingleResult",
				null, new NoResultException("Board not found."));
		securityManager.doConnect("admin", 0);
		try {
			gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("Board not found for value: /map/map1.png", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAGameThatRefersToAnUnexistingPlayerIdentity() {
		dataManager.register("createQuery", null, null,
				"select b from Board b where b.path = :path");
		dataManager.register("setParameter", null, null,"path", "/map/map1.png");
		dataManager.register("getSingleResult",
				setEntityId(new Board().setName("map1").setPath("/map/map1.png").setIcon("/map/map1-icon.png"), 109),null);
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult",
				null, new NoResultException("Identity not found."));
		securityManager.doConnect("admin", 0);
		try {
			gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("PlayerIdentity not found for value: Hector", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAGameThatRefersToAnUnexistingBanner() {
		dataManager.register("createQuery", null, null,
				"select b from Board b where b.path = :path");
		dataManager.register("setParameter", null, null,"path", "/map/map1.png");
		dataManager.register("getSingleResult",
				setEntityId(new Board().setName("map1").setPath("/map/map1.png").setIcon("/map/map1-icon.png"), 109),null);
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult",
				setEntityId(new PlayerIdentity().setName("Hector").setPath("/players/hector.png"), 107),null);
		dataManager.register("createQuery", null, null,
				"select b from Banner b where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "redbanner");
		dataManager.register("getSingleResult",
				null, new NoResultException("Banner not found."));
		securityManager.doConnect("admin", 0);
		try {
			gameController.create(params(), Json.createJsonFromString(SIMPLE_GAME_CREATION));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("Banner not found for value: redbanner", sce.getMessage());
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
	public void getOneBoardById() {
		Game game = (Game)setEntityId(new Game(), 1);
		dataManager.register("find", game,null, Game.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = gameController.getById(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
			"{\"players\":[],\"id\":1,\"version\":0}"		);
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
		Game game = (Game)setEntityId(new Game(), 1);
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
			"		id:102, version:0, " +
			"		identity:{\n" +
			"			name: \"Hector\"," +
			"			path: \"/players/hector.png\"" +
			"		},\n" +
			"		wings:[\n" +
			"		{\n" +
			"			id:103, version:0, " +
			"			banner:{\n" +
			"				name: \"redbanner\"," +
			"				path: \"/map/redbanner.png\"" +
			"			},\n" +
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
		Location location = (Location)setEntityId(new Location().setRow(3).setCol(4).addPiece(unit), 106);
		PlayerIdentity playerIdentity = (PlayerIdentity)setEntityId(new PlayerIdentity().setName("Achilles").setPath("/players/achilles.png"), 107);
		Player player = (Player)setEntityId(new Player().setIdentity(playerIdentity).addWing(wing), 102);
		Game game = (Game)setEntityId(new Game().addPlayer(player), 101);
		game.addLocation(location);
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
					"\"identity\":{" +
						"\"path\":\"/players/hector.png\"," +
						"\"name\":\"Hector\"" +
					"},"+
					"\"wings\":[{\"" +
						"retreatZone\":[" +
							"{\"col\":3,\"id\":104,\"row\":4,\"version\":0}" +
						"]," +
						"\"banner\":{" +
							"\"path\":\"/red/redbanner.png\"," +
							"\"name\":\"redbanner\"" +
						"}," +
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
						"\"version\":0}]," +
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
		Assert.assertEquals(new Integer(120), unit.getPositionAngle());
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
	public void checkGameEntity() {
		Map map = new Map();
		PlayerIdentity playerIdentity = new PlayerIdentity()
			.setName("Hector")
			.setPath("/red/redplayer.png");
		Player player = new Player()
			.setIdentity(playerIdentity);
		Game game = new Game()
			.setMap(map)
			.addPlayer(player);
		Assert.assertEquals(1, game.getPlayers().size());
		Assert.assertEquals(player, game.getPlayers().get(0));
		Assert.assertEquals(player, game.getPlayer("Hector"));
		Assert.assertEquals(map, game.getMap());
		Assert.assertNull(game.getPlayer("Patrocle"));
		game.removePlayer(player);
		Assert.assertEquals(0, game.getPlayers().size());
	}

	@Test
	public void checkBoardPlacementEntity() {
		Board board = new Board();
		BoardPlacement boardPlacement = new BoardPlacement()
			.setBoard(board)
			.setCol(4).setRow(5)
			.setInvert(true);
		Assert.assertEquals(board, boardPlacement.getBoard());
		Assert.assertEquals(4, boardPlacement.getCol());
		Assert.assertEquals(5, boardPlacement.getRow());
		Assert.assertTrue(boardPlacement.isInvert());
	}

	@Test
	public void checkMapPlacementEntity() {
		BoardPlacement boardPlacement = new BoardPlacement();
		Map map = new Map().addBoardPlacement(boardPlacement);
		Assert.assertEquals(1, map.getBoardPlacements().size());
		Assert.assertEquals(boardPlacement, map.getBoardPlacements().get(0));
		map.removeBoardPlacement(boardPlacement);
		Assert.assertEquals(0, map.getBoardPlacements().size());
	}

}
