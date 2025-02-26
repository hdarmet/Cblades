package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BoardController;
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

public class BoardControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	BoardController boardController;
	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	Account someone;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		someone = new Account().setAccess(
			new Login().setLogin("someone").setPassword("someone")
		);
		boardController = new BoardController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
		securityManager.register(new MockSecurityManagerImpl.Credential("someoneelse", "someoneelse", StandardUsers.USER));
	}

	public boolean checkHex(Hex hex, int col, int row, HexType type, int height,
						 HexSideType side120Type, HexSideType side180Type, HexSideType side240Type) {
		if (hex.getCol()!=col) return false;
		if (hex.getRow()!=row) return false;
		if (hex.getType()!=type) return false;
		if (hex.getHeight()!=height) return false;
		if (hex.getSide120Type()!=side120Type) return false;
		if (hex.getSide180Type()!=side180Type) return false;
		if (hex.getSide240Type()!=side240Type) return false;
		return true;
	}

	@Test
	public void createNewBoard() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			if (!(entity instanceof Board)) return false;
			Board board = (Board) entity;
			if (!"map1".equals(board.getName())) return false;
			if (!"here/there/map.png".equals(board.getPath())) return false;
			if (!"A new Map".equals(board.getDescription())) return false;
			/*
			if (!checkHex(board.getHexes().get(0), 2, 3, HexType.OUTDOOR_CLEAR, 1,
					HexSideType.NORMAL, HexSideType.EASY, HexSideType.DIFFICULT));
			if (!checkHex(board.getHexes().get(0), 4, 5, HexType.OUTDOOR_DIFFICULT, 2,
					HexSideType.CLIMB, HexSideType.WALL, HexSideType.NORMAL));
			 */
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		boardController.create(params(), Json.createJsonFromString(
			"{ " +
					"'version':0, " +
					"'name':'map1', " +
					"'path':'here/there/map.png', " +
					"'icon':'here/there/map-icon.png', " +
					"'description':'A new Map' " +
				"}"
		));
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingBoard() {
		dataManager.register("persist", null,
			new PersistenceException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof Board);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			boardController.create(params(), Json.createJsonFromString(
				"{ " +
						"'version':0, " +
						"'name':'map1', " +
						"'description':'A new Map', " +
						"'path':'here/there/map.png', " +
						"'icon':'here/there/map-icon.png', " +
						"'hexes':[" +
							"{" +
								"'version':0, " +
								"'col':2, 'row':3, 'type':'OC', 'height':1," +
								"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
							"}," +
							"{" +
								"'version':0, " +
								"'col':4, 'row':5, 'type':'OD', 'height':2," +
								"'side120Type':'C', 'side180Type':'W', 'side240Type':'N'" +
							"}," +
						"]" +
					"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Board with name (map1) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewBoardWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.create(params(), Json.createJsonFromString(
				"{ " +
						"'version':0, " +
						"'name':'map1', " +
						"'description':'A new Map', " +
						"'path':'here/there/map.png', " +
						"'icon':'here/there/map-icon.png', " +
						"'hexes':[" +
							"{" +
								"'version':0, " +
								"'col':2, 'row':3, " +
								"'type':'OC', " +
								"'height':1," +
								"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
							"}," +
							"{" +
								"'version':0, " +
								"'col':4, 'row':5, " +
								"'type':'OD', " +
								"'height':2," +
								"'side120Type':'C', 'side180Type':'W', 'side240Type':'N'" +
							"}," +
						"]" +
					"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void listAllBoard() {
		dataManager.register("createQuery", null, null, "select count(b) from Board b");
		dataManager.register("getSingleResult", 2L, null);
		dataManager.register("createQuery", null, null, "select b from Board b");
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 10);
		dataManager.register("getResultList", arrayList(
			setEntityId(new Board().setName("map1").setPath("/there/where/map1.png").setIcon("/there/where/map1-icon.png"), 1),
			setEntityId(new Board().setName("map2").setPath("/there/where/map2.png").setIcon("/there/where/map2-icon.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getAll(params("page", "0"), null);
		Assert.assertEquals(
			"{" +
				"\"count\":2," +
				"\"boards\":[{" +
					"\"path\":\"/there/where/map1.png\"," +
					"\"name\":\"map1\"," +
					"\"icon\":\"/there/where/map1-icon.png\"," +
					"\"description\":\"\"," +
					"\"id\":1," +
					"\"version\":0" +
				"},{" +
					"\"path\":\"/there/where/map2.png\"," +
					"\"name\":\"map2\"," +
					"\"icon\":\"/there/where/map2-icon.png\"," +
					"\"description\":\"\"," +
					"\"id\":2," +
					"\"version\":0" +
				"}]," +
				"\"pageSize\":10," +
				"\"page\":0" +
			"}", result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToListAllBoardsWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneBoardByName() {
		dataManager.register("createQuery", null, null, "select b from Board b " +
				"left outer join fetch b.hexes " +
				"left outer join fetch b.author a " +
				"left outer join fetch a.access " +
				"where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "map1");
		dataManager.register("getSingleResult",
			setEntityId(new Board()
				.setName("map1")
				.setAuthor(someone)
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png"), 1),
		null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getByName(params("name", "map1"), null);
		Assert.assertEquals(
			"{" +
				"\"path\":\"/there/where/map1.png\"," +
				"\"comments\":[]," +
				"\"author\":{" +
					"\"firstName\":\"\"," +
					"\"lastName\":\"\"," +
					"\"id\":0," +
					"\"login\":\"someone\"" +
				"}," +
				"\"name\":\"map1\"," +
				"\"icon\":\"/there/where/map1-icon.png\"," +
				"\"description\":\"\"," +
				"\"id\":1," +
				"\"version\":0" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAnUnknownBoard() {
		dataManager.register("createQuery", null, null,
			"select b from Board b " +
				"left outer join fetch b.hexes " +
				"left outer join fetch b.author a " +
				"left outer join fetch a.access " +
				"where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "map1");
		dataManager.register("getSingleResult", null, null);
		securityManager.doConnect("admin", 0);
		try {
			boardController.getByName(params("name", "map1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Board with name map1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameABoardWithBadCredentials() {
		dataManager.register("createQuery", null, null,
			"select b from Board b left outer join fetch b.hexes left outer join fetch b.author a left outer join fetch a.access where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "map1");
		dataManager.register("getSingleResult",
			setEntityId(new Board()
				.setName("map1")
				.setAuthor(someone)
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png"), 1),
			null);
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.getByName(params("name", "map1"), null);
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
		dataManager.register("find",
				setEntityId(new Board().setName("map1")
					.setPath("/there/where/map1.png")
					.setIcon("/there/where/map1-icon.png"), 1L),
			null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getById(params("id", "1"), null);
		Assert.assertEquals(
			"{" +
				"\"hexes\":[]," +
				"\"path\":\"/there/where/map1.png\"," +
				"\"name\":\"map1\"," +
				"\"icon\":\"/there/where/map1-icon.png\"," +
				"\"description\":\"\"," +
				"\"id\":1,\"version\":0" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownBoard() {
		dataManager.register("find",
			null, null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Board with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindABoardWithBadCredentials() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
					.setAuthor(someone)
					.setPath("/there/where/map1.png")
					.setIcon("/there/where/map1-icon.png"), 1L),
			null, Board.class, 1L);
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void deleteABoard() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
				.setPath("/there/where/map1.png")
				.setPath("/there/where/map1-icon.png"), 1L),
			null, Board.class, 1L);
		Ref<Board> rBoard = new Ref<>();
		dataManager.register("merge", (Supplier)()->rBoard.get(), null,
			(Predicate) entity->{
				if (!(entity instanceof Board)) return false;
				rBoard.set((Board) entity);
				if (rBoard.get().getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("remove", null, null,
			(Predicate) entity->{
				if (!(entity instanceof Board)) return false;
				Board board = (Board) entity;
				if (board.getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.delete(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"deleted\":\"ok\"}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAnUnknownBoard() {
		dataManager.register("find",
			null, null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Board with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteABoardAndFailsForAnUnknownReason() {
		dataManager.register("find",
			null,
			new PersistenceException("Some Reason"), Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteABoardWithBadCredentials() {
		dataManager.register("find",
			setEntityId(new Board()
				.setName("map1")
				.setAuthor(someone)
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png"), 1),
		null);
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void upadteABoard() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
				.setAuthor(someone)
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png")
					/*
				.addHex(
					(Hex)setEntityId(new Hex().setCol(2).setRow(3).setHeight(1).setType(HexType.IMPASSABLE)
						.setSide120Type(HexSideType.EASY).setSide180Type(HexSideType.NORMAL)
						.setSide240Type(HexSideType.WALL), 1)

			)*/, 1L),
			null, Board.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("someone", 0);
		Json result = boardController.update(params("id", "1"), Json.createJsonFromString(
			"{" +
					"'id':1, " +
					"'version':0, " +
					"'name':'map2', " +
					"'path':'here/there/map2.png', " +
					"'icon':'here/there/map2-icon.png'" +
				"}"
		));
		Assert.assertEquals(
		"{" +
					"\"path\":\"here/there/map2.png\"," +
					"\"comments\":[],\"name\":\"map2\"," +
					"\"icon\":\"here/there/map2-icon.png\"," +
					"\"description\":\"\",\"id\":1,\"version\":0" +
				"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	/*
				"{ 'id':1, 'version':0, 'name':'map2', 'path':'here/there/map2.png', 'icon':'here/there/map2-icon.png', 'hexes':[" +
				"{'id':1, 'version':0, 'col':2, 'row':3, 'type':'OC', 'height':2,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
				"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
			"]}"
	 */
	@Test
	public void tryToUpdateAnUnknownBoard() {
		dataManager.register("find",
				null, null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':0, 'name':'map2', 'path':'here/there/map2.png', 'hexes':[" +
					"{'id':1, 'version':0, 'col':2, 'row':3, 'type':'OC', 'height':2,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
					"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
				"]}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Board with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateABoardAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':0, 'name':'map2', 'path':'here/there/map2.png', 'hexes':[" +
					"{'id':1, 'version':0, 'col':2, 'row':3, 'type':'OC', 'height':2,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
					"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
				"]}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateABoardWithBadCredentials() {
		dataManager.register("find",
			setEntityId(new Board()
				.setName("map1")
				.setAuthor(someone)
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png").addHex(
					(Hex)setEntityId(new Hex().setCol(2).setRow(3).setHeight(1).setType(HexType.IMPASSABLE)
						.setSide120Type(HexSideType.EASY).setSide180Type(HexSideType.NORMAL).setSide240Type(HexSideType.WALL), 1)
				), 1L),
		null, Board.class, 1L);
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':0, 'name':'map2', 'path':'here/there/map2.png', 'hexes':[" +
					"{'id':1, 'version':0, 'col':2, 'row':3, 'type':'OC', 'height':2,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
					"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
				"]}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkBoardEntity() {
		Board board = new Board().setName("map1").setPath("/there/where/map1.png");
		Hex hex = new Hex().setCol(2).setRow(3).setHeight(1).setType(HexType.IMPASSABLE)
				.setSide120Type(HexSideType.EASY).setSide180Type(HexSideType.NORMAL).setSide240Type(HexSideType.WALL);
		board.addHex(hex);
		Assert.assertEquals("map1", board.getName());
		Assert.assertEquals("/there/where/map1.png", board.getPath());
		Assert.assertEquals(2, hex.getCol());
		Assert.assertEquals(3, hex.getRow());
		Assert.assertEquals(1, hex.getHeight());
		Assert.assertEquals(HexType.IMPASSABLE, hex.getType());
		Assert.assertEquals(HexSideType.EASY, hex.getSide120Type());
		Assert.assertEquals(HexSideType.NORMAL, hex.getSide180Type());
		Assert.assertEquals(HexSideType.WALL, hex.getSide240Type());
		Assert.assertArrayEquals(new Hex[]{hex}, board.getHexes().toArray());
		board.removeHex(hex);
		Assert.assertArrayEquals(new Hex[]{}, board.getHexes().toArray());
	}

}
