package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.ArticleController;
import fr.cblades.controller.BoardController;
import fr.cblades.domain.*;
import fr.cblades.services.LikeVoteService;
import fr.cblades.services.LikeVoteServiceImpl;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.EntityNotFoundException;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class BoardControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	BoardController boardController;
	MockDataManagerImpl dataManager;
	MockPlatformManagerImpl platformManager;
	MockSecurityManagerImpl securityManager;
	Account someone;

	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		someone = new Account().setAccess(
				new Login().setLogin("someone").setPassword("someone")
		);
		boardController = new BoardController();
		dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
		securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
		securityManager.register(new MockSecurityManagerImpl.Credential("someoneelse", "someoneelse", StandardUsers.USER));
		platformManager.setTime(1739879980962L);
	}

	public boolean checkHex(
			Hex hex,
			int col, int row,
			HexType type,
			int height,
			HexSideType side120Type, HexSideType side180Type, HexSideType side240Type
	) {
		Assert.assertEquals(hex.getCol(), col);
		Assert.assertEquals(hex.getRow(), row);
		Assert.assertEquals(hex.getType(), type);
		Assert.assertEquals(hex.getHeight(), height);
		Assert.assertEquals(hex.getSide120Type(), side120Type);
		Assert.assertEquals(hex.getSide180Type(), side180Type);
		Assert.assertEquals(hex.getSide240Type(), side240Type);
		return true;
	}

	@Test
	public void checkRequiredFieldsForBoardCreation() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.create(params(), Json.createJsonFromString(
				"{ 'comments':[{}] }"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"comments-version\":\"required\"," +
				"\"comments-date\":\"required\"," +
				"\"name\":\"required\"," +
				"\"comments-text\":\"required\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMinFieldSizesForBoardCreation() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.create(params(), Json.createJsonFromString("{ " +
				"'name':'n', " +
				"'description':'d', " +
				" 'comments':[{ " +
					"'version':0, " +
					"'date':'2025-11-12', " +
					"'text': 't'," +
				" }]" +
			"}"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must be greater of equals to 2\"," +
				"\"description\":\"must be greater of equals to 2\"," +
				"\"comments-text\":\"must be greater of equals to 2\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMaxFieldSizesForBoardCreation() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.create(params(), Json.createJsonFromString("{ " +
				"'name':'"+ generateText("f", 201) +"', " +
				"'description':'"+ generateText("f", 1001) +"', " +
				" 'comments':[{ " +
					"'version':0, " +
					"'date':'2025-11-12', " +
					"'text': '" + generateText("f", 20000) + "'," +
				" }]" +
			" }"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must not be greater than 20\"," +
				"\"description\":\"must not be greater than 1000\"," +
				"\"comments-text\":\"must not be greater than 19995\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidityForBoardCreation() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.create(params(), Json.createJsonFromString(
				"{ 'name':'...', 'status':'???' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
				"\"status\":\"??? must matches one of [pnd, live, prp]\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void createNewBoard() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Board);
			Board board = (Board) entity;
			Assert.assertEquals("map1", board.getName());
			Assert.assertEquals("A new Map", board.getDescription());
			return true;
		});
		OutputStream boardOutputStream = new ByteArrayOutputStream();
		platformManager.register("getOutputStream", boardOutputStream, null);
		OutputStream iconOutputStream = new ByteArrayOutputStream();
		platformManager.register("getOutputStream", iconOutputStream, null);
		dataManager.register("flush", null, null);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.create(params(
			ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
				new FileSpecification("board-forest", "board-forest.png", "png",
					new ByteArrayInputStream(("Content of /boards/board-forest.png").getBytes())),
				new FileSpecification("board-forest-icon", "board-forest-icon.png", "png",
					new ByteArrayInputStream(("Content of /boards/board-forest-icon.png").getBytes())),
			}
		), Json.createJsonFromString("{ " +
				"'name':'map1', " +
				"'description':'A new Map' " +
			"}"
		));
		Assert.assertEquals("{" +
			"\"path\":\"/api/board/images/board0-1739879980962.png\"," +
			"\"comments\":[]," +
			"\"name\":\"map1\"," +
			"\"icon\":\"/api/board/images/boardicon0-1739879980962.png\"," +
			"\"description\":\"A new Map\"," +
			"\"id\":0," +
			"\"version\":0" +
		"}", result.toString());
		Assert.assertEquals("Content of /boards/board-forest.png", outputStreamToString(boardOutputStream));
		Assert.assertEquals("Content of /boards/board-forest-icon.png", outputStreamToString(iconOutputStream));
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void failToCreateABoardBecauseMoreOrLessOfTwoImageFileAreGiven() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Board);
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		try {
			boardController.create(params(
				ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
					new FileSpecification("board-forest", "board-forest.png", "png",
						new ByteArrayInputStream(("Content of /boards/board-forest.png").getBytes())),
				}
			), Json.createJsonFromString("{ " +
					"'name':'map1', " +
					"'description':'A new Map'" +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("Two board files must be loaded.", sce.getMessage());
		}
		platformManager.hasFinished();
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
					"'description':'A new Map'" +
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
					"'description':'A new Map' " +
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
	public void tryToUpdateABoardWithoutGivingAnID() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.update(params(), Json.createJsonFromString("{" +
					"'name':'map2', " +
					"'description':'description of the map'" +
				"}"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Board ID is missing or invalid (null)", sce.getMessage());
		}
	}

	@Test
	public void checkRequiredFieldsForBoardUpdate() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString(
					"{ 'comments':[{}] }"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"comments-version\":\"required\"," +
				"\"comments-date\":\"required\"," +
				"\"comments-text\":\"required\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMinFieldSizesForBoardUpdate() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString("{ " +
				"'name':'n', " +
				"'description':'d', " +
				" 'comments':[{ " +
					"'version':0, " +
					"'date':'2025-11-12', " +
					"'text': 't'," +
				" }]" +
			"}"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must be greater of equals to 2\"," +
				"\"description\":\"must be greater of equals to 2\"," +
				"\"comments-text\":\"must be greater of equals to 2\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMaxFieldSizesForBoardUpdate() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString("{ " +
				"'name':'"+ generateText("f", 201) +"', " +
				"'description':'"+ generateText("f", 1001) +"', " +
				" 'comments':[{ " +
					"'version':0, " +
					"'date':'2025-11-12', " +
					"'text': '" + generateText("f", 20000) + "'," +
				" }]" +
			" }"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must not be greater than 20\"," +
				"\"description\":\"must not be greater than 1000\"," +
				"\"comments-text\":\"must not be greater than 19995\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidityForBoardUpdate() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString(
					"{ 'name':'...', 'status':'???' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
				"\"status\":\"??? must matches one of [pnd, live, prp]\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void upadteABoard() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1"),
			1L), null, Board.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.update(params("id", "1"), Json.createJsonFromString("{" +
				"'id':1, " +
				"'version':0, " +
				"'name':'map2', " +
				"'description':'description of the map', " +
			"}"
		));
		Assert.assertEquals("{" +
				"\"path\":\"\",\"comments\":[]," +
				"\"name\":\"map2\"," +
				"\"icon\":\"\"," +
				"\"description\":\"description of the map\"," +
				"\"id\":1," +
				"\"version\":0" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownBoard() {
		dataManager.register("find",
				null, null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString("{ " +
				"'id':1, " +
				"'version':0, " +
				"'name':'map2'" +
			"}"));
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
			boardController.update(params("id", "1"), Json.createJsonFromString("{ " +
				"'id':1, " +
				"'version':0, " +
				"'name':'map2'" +
			"}"));
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
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.update(params("id", "1"), Json.createJsonFromString("{" +
				" 'id':1, 'version':0, " +
				" 'name':'map2'" +
			"}"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkRequiredFieldsForBoardProposal() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.propose(params(), Json.createJsonFromString(
					"{ }"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"required\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMinFieldSizesForBoardProposal() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.propose(params(), Json.createJsonFromString("{ " +
				"'name':'n', " +
				"'description':'d', " +
				"'newComment':'c' " +
			"}"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"newComment\":\"must be greater of equals to 2\"," +
				"\"name\":\"must be greater of equals to 2\"," +
				"\"description\":\"must be greater of equals to 2\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMaxFieldSizesForBoardProposal() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.propose(params(), Json.createJsonFromString("{ " +
				"'name':'"+ generateText("f", 201) +"', " +
				"'description':'"+ generateText("f", 1001) +"', " +
				"'newComment': '" + generateText("f", 20000) + "'" +
			" }"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"newComment\":\"must not be greater than 200\"," +
				"\"name\":\"must not be greater than 20\"," +
				"\"description\":\"must not be greater than 1000\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidityForBoardProposal() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.propose(params(), Json.createJsonFromString(
				"{ 'name':'...' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void proposeNewBoard() {
		Account account = new Account().setAccess(new Login().setLogin("someone"));
		dataManager.register("createQuery", null, null,
				"select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "someone");
		dataManager.register("getSingleResult", account, null, null);
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Board);
			Board board = (Board) entity;
			Assert.assertEquals("map1", board.getName());
			Assert.assertEquals("A new Map", board.getDescription());
			return true;
		});
		OutputStream boardOutputStream = new ByteArrayOutputStream();
		platformManager.register("getOutputStream", boardOutputStream, null);
		OutputStream iconOutputStream = new ByteArrayOutputStream();
		platformManager.register("getOutputStream", iconOutputStream, null);
		dataManager.register("flush", null, null);
		dataManager.register("flush", null, null);
		securityManager.doConnect("someone", 0);
		Json result = boardController.propose(params(
			ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
				new FileSpecification("board-forest", "board-forest.png", "png",
					new ByteArrayInputStream(("Content of /boards/board-forest.png").getBytes())),
				new FileSpecification("board-forest-icon", "board-forest-icon.png", "png",
					new ByteArrayInputStream(("Content of /boards/board-forest-icon.png").getBytes())),
			}
		), Json.createJsonFromString("{ " +
				"'name':'map1', " +
				"'description':'A new Map'" +
			"}"
		));
		Assert.assertEquals("{" +
			"\"path\":\"/api/board/images/board0-1739879980962.png\"," +
			"\"comments\":[]," +
			"\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
			"\"name\":\"map1\"," +
			"\"icon\":\"/api/board/images/boardicon0-1739879980962.png\"," +
			"\"description\":\"A new Map\"," +
			"\"id\":0," +
			"\"version\":0," +
			"\"status\":\"prp\"" +
		"}", result.toString());
		Assert.assertEquals("Content of /boards/board-forest.png", outputStreamToString(boardOutputStream));
		Assert.assertEquals("Content of /boards/board-forest-icon.png", outputStreamToString(iconOutputStream));
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void failToProposeABoardBecauseMoreOrLessOfTwoImageFileAreGiven() {
		Account account = new Account().setAccess(new Login().setLogin("someone"));
		dataManager.register("createQuery", null, null,
				"select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "someone");
		dataManager.register("getSingleResult", account, null, null);
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Board);
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("someone", 0);
		try {
			boardController.propose(params(
				ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
					new FileSpecification("board-forest", "board-forest.png", "png",
						new ByteArrayInputStream(("Content of /boards/board-forest.png").getBytes())),
				}
			), Json.createJsonFromString("{ " +
					"'name':'map1', " +
					"'description':'A new Map'" +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("Two board files must be loaded.", sce.getMessage());
		}
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void tryToProposeAnAlreadyExistingBoard() {
		Account account = new Account().setAccess(new Login().setLogin("someone"));
		dataManager.register("createQuery", null, null,
				"select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "someone");
		dataManager.register("getSingleResult", account, null, null);
		dataManager.register("persist", null,
				new PersistenceException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof Board);
			}
		);
		securityManager.doConnect("someone", 0);
		try {
			boardController.propose(params(),
				Json.createJsonFromString(
				"{ " +
					"'version':0, " +
					"'name':'map1', " +
					"'description':'A new Map', " +
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
	public void tryToProposeANewBoardWithoutBeingConnected() {
		try {
			boardController.propose(params(),
				Json.createJsonFromString(
				"{ " +
					"'version':0, " +
					"'name':'map1', " +
					"'description':'A new Map' " +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not connected", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkMinFieldSizesForBoardAmend() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params("id", "1"),
				Json.createJsonFromString("{ " +
					"'name':'n', " +
					"'description':'d', " +
					"'newComment':'n'" +
				"}"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"newComment\":\"must be greater of equals to 2\"," +
				"\"name\":\"must be greater of equals to 2\"," +
				"\"description\":\"must be greater of equals to 2\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void tryToAmendABoardWithoutGivingAnID() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params(),
				Json.createJsonFromString("{" +
					"'name':'map2', " +
					"'description':'description of the map'" +
				"}"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Board ID is missing or invalid (null)", sce.getMessage());
		}
	}

	@Test
	public void checkMaxFieldSizesForBoardAmend() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params("id", "1"),
				Json.createJsonFromString("{ " +
				"'name':'"+ generateText("f", 201) +"', " +
				"'description':'"+ generateText("f", 1001) +"', " +
				" 'newComments':'" + generateText("f", 20000) + "'" +
			" }"));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must not be greater than 20\"," +
				"\"description\":\"must not be greater than 1000\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidityForBoardAmend() {
		dataManager.register("getSingleResult", null, null, null);
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params("id", "1"),
				Json.createJsonFromString(
					"{ 'name':'...', 'status':'???' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void amendABoardIfOwner() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
				.setAuthor(someone), 1L), null, Board.class, 1L);
		Account account = new Account().setAccess(new Login().setLogin("someone"));
		dataManager.register("createQuery", null, null,
				"select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "someone");
		dataManager.register("getSingleResult", account, null, null);
		dataManager.register("flush", null, null);
		securityManager.doConnect("someone", 0);
		Json result = boardController.amend(params("id", "1"), Json.createJsonFromString("{" +
				"'name':'map2', " +
				"'description':'description of the map', " +
				"'newComment':'comment on the map'" +
			"}"
		));
		Assert.assertEquals("{" +
			"\"path\":\"\"," +
			"\"comments\":[{" +
				"\"date\":\"2025-02-18\"," +
				"\"id\":0," +
				"\"text\":\"comment on the map\"," +
				"\"version\":0" +
			"}]," +
			"\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
			"\"name\":\"map2\"," +
			"\"icon\":\"\"," +
			"\"description\":\"description of the map\"," +
			"\"id\":1," +
			"\"version\":0" +
		"}",
		result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToAmendAnArticleByAnUnknownAccount() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
				.setAuthor(someone), 1L), null, Board.class, 1L);
		Account account = new Account().setAccess(new Login().setLogin("someone"));
		dataManager.register("createQuery", null, null,
				"select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "someone");
		dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);        securityManager.doConnect("someone", 0);
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params("id", "1"), Json.createJsonFromString("{" +
					"'name':'map2', " +
					"'description':'description of the map'" +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Account with Login name someone", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void amendABoardIfAdmin() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
				.setAuthor(someone), 1L), null, Board.class, 1L);
		Account account = new Account().setAccess(new Login().setLogin("admin"));
		dataManager.register("createQuery", null, null,
		"select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "admin");
		dataManager.register("getSingleResult", account, null, null);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.amend(params("id", "1"),
			Json.createJsonFromString("{" +
			"'id':1, " +
			"'version':0, " +
			"'name':'map2', " +
			"'description':'description of the map'" +
		"}"));
		Assert.assertEquals("{" +
				"\"path\":\"\"," +
				"\"comments\":[]," +
				"\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
				"\"name\":\"map2\"," +
				"\"icon\":\"\"," +
				"\"description\":\"description of the map\"," +
				"\"id\":1," +
				"\"version\":0" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToAmendAnUnknownBoard() {
		dataManager.register("find",
				null, null, Board.class, 1L);
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params("id", "1"),
				Json.createJsonFromString("{" +
				" 'id':1, 'version':0, " +
				"'name':'map2'" +
			"}"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Board with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToAmendABoardAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null, new PersistenceException("Some Reason"), Board.class, 1L);
		securityManager.doConnect("someone", 0);
		try {
			boardController.amend(params("id", "1"),
				Json.createJsonFromString("{ " +
				"'id':1, " +
				"'version':0, " +
				"'name':'map2'" +
			"}"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToAmendABoardWithBadCredentials() {
		dataManager.register("find",
			setEntityId(
				new Board().setName("map1").setAuthor(someone), 1L),
				null, Board.class, 1L
		);
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.amend(params("id", "1"),
				Json.createJsonFromString("{ " +
				"'id':1, " +
				"'version':0, " +
				"'name':'map2'" +
			"}"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateHexesWithoutGivingABoardID() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.updateHexes(params(),
				Json.createJsonFromString("{ " +
					"'hexes':[{" +
						"'col':2, 'row':3, 'type':'OC', 'height':1," +
						"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
					"},{" +
						"'col':4, 'row':5, 'type':'OD', 'height':2," +
						"'side120Type':'C', 'side180Type':'W', 'side240Type':'N'" +
					"}]" +
				"}"
			));
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Board ID is missing or invalid (null)", sce.getMessage());
		}
	}

	@Test
	public void checkRequiredFieldsForUpdateHexes() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateHexes(params("id", "1"),
				Json.createJsonFromString("{ " +
						"'hexes':[{}]" +
					"}"
				)
			);
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"hexes-side180Type\":\"required\"," +
				"\"hexes-side240Type\":\"required\"," +
				"\"hexes-height\":\"required\"," +
				"\"hexes-side120Type\":\"required\"," +
				"\"hexes-row\":\"required\"," +
				"\"hexes-type\":\"required\"," +
				"\"hexes-col\":\"required\"" +
			"}", sce.getMessage());
		}
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void checkMinValuesForUpdateHexes() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateHexes(params("id", "1"),
				Json.createJsonFromString("{ " +
					"'hexes':[{" +
						"'col':-1, 'row':-1, 'type':'OC', 'height':-6," +
						"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
					"}]" +
				"}"));
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"hexes-height\":\"must be greater or equal to -5\"," +
				"\"hexes-row\":\"must be greater or equal to 0\"," +
				"\"hexes-col\":\"must be greater or equal to 0\"" +
			"}", sce.getMessage());
		}
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void checkMaxValuesForUpdateHexes() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateHexes(params("id", "1"),
		Json.createJsonFromString("{ " +
				"'hexes':[{" +
					"'col':14, 'row':17, 'type':'OC', 'height':6," +
					"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
				"}]" +
			"}"));
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"hexes-height\":\"must not be greater than 5\"," +
				"\"hexes-row\":\"must not be greater than 16\"," +
				"\"hexes-col\":\"must not be greater than 13\"" +
			"}", sce.getMessage());
		}
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void checFieldvalidityForUpdateHexes() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateHexes(params("id", "1"),
				Json.createJsonFromString("{ " +
					"'hexes':[{" +
						"'col':'1', 'row':'1', 'type':'???', 'height':'1'," +
						"'side120Type':'?', 'side180Type':'?', 'side240Type':'?'" +
					"}]" +
				"}"));
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"hexes-side180Type\":\"? must matches one of [C, D, E, W, N]\"," +
				"\"hexes-side240Type\":\"? must matches one of [C, D, E, W, N]\"," +
				"\"hexes-height\":\"not a valid integer\"," +
				"\"hexes-side120Type\":\"? must matches one of [C, D, E, W, N]\"," +
				"\"hexes-row\":\"not a valid integer\"," +
				"\"hexes-type\":\"??? must matches one of [CC, CD, ORF, OR, IM, CDF, CCF, WA, CR, ODF, OCF, OC, OD, LA, CRF]\"," +
				"\"hexes-col\":\"not a valid integer\"" +
			"}", sce.getMessage());
		}
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void updateHexesWhenOwner() {
		Board board = setEntityId(new Board()
			.setName("map1")
			.setDescription("Description of the Map")
			.setPath("/there/where/map1.png")
			.setIcon("/there/where/map1-icon.png")
			.setAuthor(someone), 1L);
		dataManager.register("find", board, null, Board.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.updateHexes(params("id", "1"),
			Json.createJsonFromString("{ " +
			"'hexes':[{" +
				"'col':2, 'row':3, 'type':'OC', 'height':1," +
				"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
			"},{" +
				"'col':4, 'row':5, 'type':'OD', 'height':2," +
				"'side120Type':'C', 'side180Type':'W', 'side240Type':'N'" +
				"}]" +
			"}"
		));
		checkHex(board.getHexes().get(0), 2, 3, HexType.OUTDOOR_CLEAR, 1,
			HexSideType.NORMAL, HexSideType.EASY, HexSideType.DIFFICULT);
		checkHex(board.getHexes().get(1), 4, 5, HexType.OUTDOOR_DIFFICULT, 2,
			HexSideType.CLIMB, HexSideType.WALL, HexSideType.NORMAL);
		Assert.assertEquals("{" +
			"\"hexes\":[{" +
				"\"col\":2," +
				"\"side180Type\":\"E\"," +
				"\"id\":0," +
				"\"row\":3," +
				"\"type\":\"OC\"," +
				"\"side240Type\":\"D\"," +
				"\"version\":0," +
				"\"height\":1," +
				"\"side120Type\":" +
				"\"N\"" +
			"},{" +
				"\"col\":4," +
				"\"side180Type\":\"W\"," +
				"\"id\":0," +
				"\"row\":5," +
				"\"type\":\"OD\"," +
				"\"side240Type\":\"N\"," +
				"\"version\":0," +
				"\"height\":2," +
				"\"side120Type\":\"C\"" +
			"}]," +
			"\"path\":\"/there/where/map1.png\"," +
			"\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
			"\"name\":\"map1\"," +
			"\"icon\":\"/there/where/map1-icon.png\"," +
			"\"description\":\"Description of the Map\"," +
			"\"id\":1," +
			"\"version\":0" +
		"}", result.toString());
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void updateHexesWhenAdmin() {
		Board board = setEntityId(new Board()
			.setName("map1")
			.setDescription("Description of the Map")
			.setPath("/there/where/map1.png")
			.setIcon("/there/where/map1-icon.png")
			.setAuthor(someone), 1L);
		dataManager.register("find", board, null, Board.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.updateHexes(params("id", "1"),
			Json.createJsonFromString("{ " +
				"'hexes':[{" +
					"'col':2, 'row':3, 'type':'OC', 'height':1," +
					"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
				"},{" +
					"'col':4, 'row':5, 'type':'OD', 'height':2," +
					"'side120Type':'C', 'side180Type':'W', 'side240Type':'N'" +
				"}]" +
			"}"));
		checkHex(board.getHexes().get(0), 2, 3, HexType.OUTDOOR_CLEAR, 1,
			HexSideType.NORMAL, HexSideType.EASY, HexSideType.DIFFICULT);
		checkHex(board.getHexes().get(1), 4, 5, HexType.OUTDOOR_DIFFICULT, 2,
			HexSideType.CLIMB, HexSideType.WALL, HexSideType.NORMAL);
		platformManager.hasFinished();
		dataManager.hasFinished();
	}






	@Test
	public void updateHexesAndFailBecauseAPersistenceExceptionIsThrown() {
		Board board = setEntityId(new Board()
				.setName("map1"), 1L);
		dataManager.register("find", board, null, Board.class, 1L);
		dataManager.register("flush", null, new PersistenceException("Some reason..."));
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateHexes(params("id", "1"),
				Json.createJsonFromString("{ " +
					"'hexes':[{" +
						"'col':2, 'row':3, 'type':'OC', 'height':1," +
						"'side120Type':'N', 'side180Type':'E', 'side240Type':'D'" +
					"},{" +
						"'col':4, 'row':5, 'type':'OD', 'height':2," +
						"'side120Type':'C', 'side180Type':'W', 'side240Type':'N'" +
					"}]" +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some reason...", sce.getMessage());
		}
		dataManager.hasFinished();
	}








	@Test
	public void checkRequestedFieldsToUpadteABannerSStatus() {
		dataManager.register("find",
			setEntityId(new Board()
				.setName("map1")
				.setDescription("Description of the Map")
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png")
				.setAuthor(someone), 1L),
			null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateStatus(params("id", "1"), Json.createJsonFromString(
					"{}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{\"id\":\"required\",\"status\":\"required\"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidationsToUpadteABannerSStatus() {
		dataManager.register("find",
				setEntityId(new Board()
						.setName("map1")
						.setDescription("Description of the Map")
						.setPath("/there/where/map1.png")
						.setIcon("/there/where/map1-icon.png")
						.setAuthor(someone), 1L),
				null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateStatus(params("id", "1"), Json.createJsonFromString(
					"{ 'id':'1234', 'status':'???'}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{\"id\":\"Not a valid id\",\"status\":\"??? must matches one of [pnd, live, prp]\"}", sce.getMessage());
		}
	}

	@Test
	public void upadteABannersStatus() {
		dataManager.register("find",
			setEntityId(new Board()
				.setName("map1")
				.setDescription("Description of the Map")
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png")
				.setAuthor(someone), 1L),
			null, Board.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.updateStatus(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'status': 'live' }"
		));
		Assert.assertEquals("{" +
				"\"path\":\"/there/where/map1.png\"," +
				"\"comments\":[]," +
				"\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
				"\"name\":\"map1\"," +
				"\"icon\":\"/there/where/map1-icon.png\"," +
				"\"description\":\"Description of the Map\"," +
				"\"id\":1," +
				"\"version\":0," +
				"\"status\":\"live\"" +
			"}", result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpadteABannersStatusWithBadCredential() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.updateStatus(params("id", "1"), Json.createJsonFromString(
					"{ 'id':1, 'status': 'live' }"
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
	public void failToUpdateABoardSStatusForUnknownReason() {
		dataManager.register("find",
			setEntityId(new Board()
				.setName("map1")
				.setDescription("Description of the Map")
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png")
				.setAuthor(someone), 1L),
			null, Board.class, 1L);
		dataManager.register("flush", null,
				new PersistenceException("Some reason"), null
		);
		securityManager.doConnect("admin", 0);
		try {
			boardController.updateStatus(params("id", "1"), Json.createJsonFromString(
					"{ 'id':1, 'status': 'live' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getLiveBoards() {
		dataManager.register("createQuery", null, null,
			"select b from Board b where b.status=:status");
		dataManager.register("setParameter", null, null, "status", BoardStatus.LIVE);
		dataManager.register("getResultList", arrayList(
				setEntityId(new Board().setName("map1").setPath("/there/where/map1.png").setIcon("/there/where/map1-icon.png"), 1),
				setEntityId(new Board().setName("map2").setPath("/there/where/map2.png").setIcon("/there/where/map2-icon.png"), 2)
		), null);
		Json result = boardController.getLive(params(), null);
		Assert.assertEquals("[{" +
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
		"}]" , result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToGetBoardsWithoutGivingParameters() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
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
		Assert.assertEquals("{" +
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
	public void tryToGetContributionsWithoutGivingParameters() {
		securityManager.doConnect("admin", 0);
		try {
			boardController.getContributions(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void listContributions() {
		dataManager.register("createQuery", null, null, "select b from Board b where b.author=:author order by b.updateTimestamp, b.status");
		dataManager.register("createQuery", null, null, "select a from Account a, Login l where a.access = l and l.login=:login");
		dataManager.register("setParameter", null, null, "login", "someone");
		dataManager.register("getSingleResult", someone, null, null);
		dataManager.register("setParameter", null, null, "author", someone);
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 10);
		dataManager.register("getResultList", arrayList(
				setEntityId(new Board().setName("map1").setPath("/there/where/map1.png").setIcon("/there/where/map1-icon.png"), 1),
				setEntityId(new Board().setName("map2").setPath("/there/where/map2.png").setIcon("/there/where/map2-icon.png"), 2)
		), null);
		securityManager.doConnect("someone", 0);
		Json result = boardController.getContributions(params("page", "0"), null);
		Assert.assertEquals("[{" +
			"\"path\":\"/there/where/map1.png\"," +
			"\"name\":\"map1\"," +
			"\"icon\":\"/there/where/map1-icon.png\"," +
			"\"description\":\"\"," +
			"\"id\":1,\"version\":0" +
		"},{" +
			"\"path\":\"/there/where/map2.png\"," +
			"\"name\":\"map2\"," +
			"\"icon\":\"/there/where/map2-icon.png\"," +
			"\"description\":\"\"," +
			"\"id\":2,\"version\":0" +
		"}]", result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToListContributionsAndFailsBecauseAPersistenceExceptionIsRaised() {
		dataManager.register("createQuery", null, new PersistenceException("Some reason..."), "select b from Board b where b.author=:author order by b.updateTimestamp, b.status");
		securityManager.doConnect("someone", 0);
		try {
			Json result = boardController.getContributions(params("page", "0"), null);

			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some reason...", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToGetContributionsWithoutBeingConnected() {
		try {
			boardController.getContributions(params("page", "0"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not connected", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void listBannersWithASearchPattern() {
		dataManager.register("createQuery", null, null,
			"select count(b) from Board b " +
				"where fts('pg_catalog.english', b.name||' '||b.description||' '" +
				"||b.status, :search) = true");
		dataManager.register("setParameter", null, null,"search", "forest");
		dataManager.register("getSingleResult", 2L, null);
		dataManager.register("createQuery", null, null,
			"select b from Board b " +
				"where fts('pg_catalog.english', b.name||' '||b.description||' '" +
				"||b.status, :search) = true");
		dataManager.register("setParameter", null, null,"search", "forest");
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 10);
		dataManager.register("getResultList", arrayList(
				setEntityId(new Board().setName("map1").setPath("/there/where/map1.png").setIcon("/there/where/map1-icon.png"), 1),
				setEntityId(new Board().setName("map2").setPath("/there/where/map2.png").setIcon("/there/where/map2-icon.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getAll(params("page", "0", "search", "forest"), null);
		Assert.assertEquals("{" +
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
				.setAuthor(someone), 1),
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
	public void tryToGetABoardByIdWithoutGivingAnID() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.getById(params(), null);
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Board ID is missing or invalid (null)", sce.getMessage());
		}
	}

	@Test
	public void getOneBoardById() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1")
				.setDescription("description of the map")
				.setPath("/there/where/map1.png")
				.setIcon("/there/where/map1-icon.png")
				.addHex(new Hex().setRow(1).setCol(2).setType(HexType.OUTDOOR_CLEAR)
			), 1L),
			null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getById(params("id", "1"), null);
		Assert.assertEquals(
		"{" +
				"\"hexes\":[{\"col\":2,\"id\":0,\"row\":1,\"type\":\"OC\",\"version\":0,\"height\":0}]," +
				"\"path\":\"/there/where/map1.png\"," +
				"\"name\":\"map1\"," +
				"\"icon\":\"/there/where/map1-icon.png\"," +
				"\"description\":\"description of the map\"," +
				"\"id\":1,\"version\":0}",
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
				.setAuthor(someone), 1L),
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

	/// /////////////////////////


	@Test
	public void tryToLoadABoardByIdWithoutGivingAnID() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.getBoardWithComments(params(), null);
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Board ID is missing or invalid (null)", sce.getMessage());
		}
	}

	@Test
	public void loadOneBoardById() {
		dataManager.register("find",
				setEntityId(new Board().setName("map1")
						.setDescription("description of the map")
						.setPath("/there/where/map1.png")
						.setIcon("/there/where/map1-icon.png")
						.addHex(new Hex().setRow(1).setCol(2).setType(HexType.OUTDOOR_CLEAR)
						), 1L),
				null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = boardController.getBoardWithComments(params("id", "1"), null);
		Assert.assertEquals("{" +
				"\"path\":\"/there/where/map1.png\"," +
				"\"comments\":[]," +
				"\"name\":\"map1\"," +
				"\"icon\":\"/there/where/map1-icon.png\"," +
				"\"description\":\"description of the map\"," +
				"\"id\":1," +
				"\"version\":0" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToLoadAnUnknownBoard() {
		dataManager.register("find",
				null, null, Board.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			boardController.getBoardWithComments(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Board with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToLoadABoardWithBadCredentials() {
		dataManager.register("find",
				setEntityId(new Board().setName("map1")
						.setAuthor(someone), 1L),
				null, Board.class, 1L);
		securityManager.doConnect("someoneelse", 0);
		try {
			boardController.getBoardWithComments(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	/// //////////////////////////

	@Test
	public void tryToDeleteABoardWithoutGivingAnID() {
		securityManager.doConnect("someone", 0);
		try {
			boardController.delete(params(), null);
			Assert.fail("The request should fail");
		} catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Board ID is missing or invalid (null)", sce.getMessage());
		}
	}

	@Test
	public void deleteABoard() {
		dataManager.register("find",
			setEntityId(new Board().setName("map1"), 1L),
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
				.setAuthor(someone), 1),
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
	public void chargeArticleImage() {
		platformManager.register("getInputStream",
				new ByteArrayInputStream(("Content of /boards/board.png").getBytes()),
				null,  "/boards/board.png");
		FileSpecification image = boardController.getImage(params("imagename", "board-10123456.png"));
		Assert.assertEquals("board.png", image.getName());
		Assert.assertEquals("image/png", image.getType());
		Assert.assertEquals("board.png", image.getFileName());
		Assert.assertEquals("Content of /boards/board.png", inputStreamToString(image.getStream()));
		Assert.assertEquals("png", image.getExtension());
		platformManager.hasFinished();
	}

	@Test
	public void failChargeArticleImage() {
		platformManager.register("getInputStream", null,
				new PersistenceException("For Any Reason..."),  "/boards/board.png");
		try {
			boardController.getImage(params("imagename", "board-10123456.png"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
		}
		platformManager.hasFinished();
	}

}
