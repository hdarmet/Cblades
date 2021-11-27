package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BoardController;
import fr.cblades.controller.LoginController;
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
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		boardController = new BoardController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
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
			if (!checkHex(board.getHexes().get(0), 2, 3, HexType.OUTDOOR_CLEAR, 1,
					HexSideType.NORMAL, HexSideType.EASY, HexSideType.DIFFICULT));
			if (!checkHex(board.getHexes().get(0), 4, 5, HexType.OUTDOOR_DIFFICULT, 2,
					HexSideType.CLIMB, HexSideType.WALL, HexSideType.NORMAL));
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		boardController.create(params(), Json.createJsonFromString(
			"{ 'version':0, 'name':'map1', 'path':'here/there/map.png', 'hexes':[" +
				"{'version':0, 'col':2, 'row':3, 'type':'OC', 'height':1,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
				"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
			"]}"
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
				"{ 'version':0, 'name':'map1', 'path':'here/there/map.png', 'hexes':[" +
					"{'version':0, 'col':2, 'row':3, 'type':'OC', 'height':1,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
					"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
				"]}"
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
	public void tryToCreateANewLoginWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.create(params(), Json.createJsonFromString(
				"{ 'version':0, 'name':'map1', 'path':'here/there/map.png', 'hexes':[" +
					"{'version':0, 'col':2, 'row':3, 'type':'OC', 'height':1,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
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
	public void listAllBoard() {
		dataManager.register("createQuery", null, null, "select b from Board b left outer join fetch b.hexes");
		dataManager.register("getResultList", arrayList(
			setEntityId(new Board().setName("map1").setPath("/there/where/map1.png"), 1),
				setEntityId(new Board().setName("map2").setPath("/there/where/map2.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getAll(params(), null);
		Assert.assertEquals(result.toString(),
			"[" +
				"{\"hexes\":[],\"path\":\"/there/where/map1.png\",\"name\":\"map1\",\"id\":1,\"version\":0}," +
				"{\"hexes\":[],\"path\":\"/there/where/map2.png\",\"name\":\"map2\",\"id\":2,\"version\":0}" +
			"]" );
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
		dataManager.register("createQuery", null, null, "select b from Board b left outer join fetch b.hexes where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "map1");
		dataManager.register("getSingleResult",
			setEntityId(new Board().setName("map1").setPath("/there/where/map1.png"), 1),
		null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getByName(params("name", "map1"), null);
		Assert.assertEquals(result.toString(),
				"{\"hexes\":[],\"path\":\"/there/where/map1.png\",\"name\":\"map1\",\"id\":1,\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAnUnknownBoard() {
		dataManager.register("createQuery", null, null, "select b from Board b left outer join fetch b.hexes where b.name = :name");
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
		securityManager.doConnect("someone", 0);
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
				setEntityId(new Board().setName("map1").setPath("/there/where/map1.png"), 1L),
			null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getById(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
			"{\"hexes\":[],\"path\":\"/there/where/map1.png\",\"name\":\"map1\",\"id\":1,\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownBoard() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Board.class, 1L);
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
		securityManager.doConnect("someone", 0);
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
			setEntityId(new Board().setName("map1").setPath("/there/where/map1.png"), 1L),
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
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Board.class, 1L);
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
		securityManager.doConnect("someone", 0);
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
			setEntityId(new Board().setName("map1").setPath("/there/where/map1.png").addHex(
				(Hex)setEntityId(new Hex().setCol(2).setRow(3).setHeight(1).setType(HexType.IMPASSABLE)
					.setSide120Type(HexSideType.EASY).setSide180Type(HexSideType.NORMAL).setSide240Type(HexSideType.WALL), 1)
			), 1L),
			null, Board.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.update(params("id", "1"), Json.createJsonFromString(
			"{ 'id':1, 'version':0, 'name':'map2', 'path':'here/there/map2.png', 'hexes':[" +
				"{'id':1, 'version':0, 'col':2, 'row':3, 'type':'OC', 'height':2,'side120Type':'N', 'side180Type':'E', 'side240Type':'D'}," +
				"{'version':0, 'col':4, 'row':5, 'type':'OD', 'height':2,'side120Type':'C', 'side180Type':'W', 'side240Type':'N'}," +
			"]}"
		));
		Assert.assertEquals(result.toString(),
		"{\"hexes\":[" +
				"{\"col\":2,\"side180Type\":\"E\",\"id\":1,\"row\":3,\"type\":\"OC\",\"side240Type\":\"D\",\"version\":0,\"height\":2,\"side120Type\":\"N\"}," +
				"{\"col\":4,\"side180Type\":\"W\",\"id\":0,\"row\":5,\"type\":\"OD\",\"side240Type\":\"N\",\"version\":0,\"height\":2,\"side120Type\":\"C\"}" +
			"],\"path\":\"here/there/map2.png\",\"name\":\"map2\",\"id\":1,\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownBoard() {
		dataManager.register("find",
				null,
				new EntityNotFoundException("Entity Does Not Exists"), Board.class, 1L);
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
	public void tryToUpdateALoginAndFailsForAnUnknownReason() {
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
	public void tryToUpdateALoginWithBadCredentials() {
		securityManager.doConnect("someone", 0);
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
