package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BannerController;
import fr.cblades.controller.PlayerIdentityController;
import fr.cblades.domain.*;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.EntityExistsException;
import javax.persistence.EntityNotFoundException;
import javax.persistence.PersistenceException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class PlayerIdentityControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	PlayerIdentityController playerIdentityController;
	MockDataManagerImpl dataManager;
	MockPlatformManagerImpl platformManager;
	MockSecurityManagerImpl securityManager;

	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		playerIdentityController = new PlayerIdentityController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		platformManager = (MockPlatformManagerImpl)ApplicationManager.get().getPlatformManager();
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
	}

	@Test
	public void createNewPlayerIdentity() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			if (!(entity instanceof PlayerIdentity)) return false;
			PlayerIdentity playerIdentity = (PlayerIdentity) entity;
			if (!"Hector".equals(playerIdentity.getName())) return false;
			if (!"here/there/hector.png".equals(playerIdentity.getPath())) return false;
			return true;
		});
		dataManager.register("flush", null, null);
		OutputStream outputStream = new ByteArrayOutputStream();
		platformManager.register("getOutputStream", outputStream, null);
		securityManager.doConnect("admin", 0);
		playerIdentityController.create(params(			ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
				new FileSpecification("wurst", "wurst.png", "png",
						new ByteArrayInputStream(("Content of /games/wurst.png").getBytes()))
		}), Json.createJsonFromString(
			"{ 'version':0, 'name':'Hector', 'path':'here/there/hector.png' }"
		));
		Assert.assertEquals("Content of /games/wurst.png", outputStreamToString(outputStream));
		platformManager.hasFinished();
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingPlayerIdentity() {
		dataManager.register("persist", null,
			new EntityExistsException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof PlayerIdentity);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.create(params(), Json.createJsonFromString(
				"{ 'version':0, 'name':'Hector', 'path':'here/there/hector.png' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("Player Identity with name (Hector) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewPlayerIdentityWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.create(params(), Json.createJsonFromString(
				"{ 'version':0, 'name':'Hector', 'path':'here/there/hector.png' }"
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
	public void failToCreateAPlayerIdentityForUnknownReason() {
		dataManager.register("persist", null,
				new PersistenceException("Some reason"),
				(Predicate) entity->{
					return (entity instanceof PlayerIdentity);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.create(params(), Json.createJsonFromString(
				"{ 'version':0, 'name':'Hector', 'path':'here/there/hector.png' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("Some reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToGetAllPlayerIdentitiesWithoutGivingParameters() {
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void listAllPlayerIdentities() {
		dataManager.register("createQuery", null, null, "select count(pi) from PlayerIdentity pi");
		dataManager.register("getSingleResult", 2L, null);
		dataManager.register("createQuery", null, null, "select pi from PlayerIdentity pi");
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 16);
		dataManager.register("getResultList", arrayList(
			setEntityId(new PlayerIdentity().setName("Hector").setPath("/there/where/hector.png"), 1),
			setEntityId(new PlayerIdentity().setName("Achilles").setPath("/there/where/achilles.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.getAll(params("page", "0"), null);
		Assert.assertEquals("{" +
				"\"playerIdentities\":[{" +
					"\"path\":\"/there/where/hector.png\"," +
					"\"comments\":[],\"name\":\"Hector\"," +
					"\"id\":1,\"version\":0" +
				"},{" +
					"\"path\":\"/there/where/achilles.png\"," +
					"\"comments\":[],\"name\":\"Achilles\"," +
					"\"id\":2,\"version\":0" +
				"}]," +
				"\"count\":2," +
				"\"pageSize\":16," +
				"\"page\":0" +
			"}",
			result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void listPlayerIdentitiesWithASearchPattern() {
		dataManager.register("createQuery", null, null,
			"select count(pi) from PlayerIdentity pi " +
					"where fts('pg_catalog.english', pi.name||' '||pi.description ||' '||pi.status, :search) = true");
		dataManager.register("setParameter", null, null,"search", "wurst");
		dataManager.register("getSingleResult", 2L, null);
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi " +
						"where fts('pg_catalog.english', pi.name||' '||pi.description ||' '||pi.status, :search) = true");
		dataManager.register("setParameter", null, null,"search", "wurst");
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 16);
		dataManager.register("getResultList", arrayList(
				setEntityId(new PlayerIdentity().setName("Hector").setPath("/there/where/hector.png"), 1),
				setEntityId(new PlayerIdentity().setName("Achilles").setPath("/there/where/achilles.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.getAll(params("page", "0", "search", "wurst"), null);
		Assert.assertEquals("{" +
				"\"playerIdentities\":[{" +
					"\"path\":\"/there/where/hector.png\"," +
					"\"comments\":[],\"name\":\"Hector\"," +
					"\"id\":1,\"version\":0" +
				"},{" +
					"\"path\":\"/there/where/achilles.png\"," +
					"\"comments\":[],\"name\":\"Achilles\"," +
					"\"id\":2,\"version\":0" +
				"}]," +
				"\"count\":2," +
				"\"pageSize\":16," +
				"\"page\":0" +
			"}",
			result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToListAllPlayerIdentitiesWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUGetAPlayerIdentityWithoutGivingTheName() {
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.getByName(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Player Identity name is missing or invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOnePlayerIdentityByName() {
		dataManager.register("createQuery", null, null, "select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult",
			setEntityId(new PlayerIdentity().setName("Hector")
				.setPath("/there/where/hector.png"), 1),
		null);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.getByName(params("name", "Hector"), null);
		Assert.assertEquals( "{" +
				"\"path\":\"/there/where/hector.png\",\"comments\":[]," +
				"\"name\":\"Hector\",\"id\":1,\"version\":0" +
			"}", result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAnUnknownPlayerIdentity() {
		dataManager.register("createQuery", null, null, "select pi from PlayerIdentity pi where pi.name = :name");
		dataManager.register("setParameter", null, null,"name", "Hector");
		dataManager.register("getSingleResult", null, null);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.getByName(params("name", "Hector"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Player Identity with name Hector", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAPlayerIdentityWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.getByName(params("name", "Hector"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToGetAPlayerIdentityWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.getById(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Player Identity ID is missing or invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOnePlayerIdentityById() {
		dataManager.register("find",
				setEntityId(new PlayerIdentity().setName("Hector")
					.setPath("/there/where/hector.png"), 1L),
			null, PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.getById(params("id", "1"), null);
		Assert.assertEquals( "{" +
				"\"path\":\"/there/where/hector.png\",\"comments\":[]," +
				"\"name\":\"Hector\",\"id\":1,\"version\":0" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownPlayerIdentity() {
		dataManager.register("find",
			null, null, PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Player Identity with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAPlayerIdentityWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAPlayerIdentityWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.delete(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Player Identity ID is missing or invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void deleteAPlayerIdentity() {
		dataManager.register("find",
			setEntityId(new PlayerIdentity().setName("Hector")
				.setPath("/there/where/hector.png"), 1L),
			null, PlayerIdentity.class, 1L);
		Ref<PlayerIdentity> rPlayerIdentity = new Ref<>();
		dataManager.register("merge", (Supplier)()->rPlayerIdentity.get(), null,
			(Predicate) entity->{
				if (!(entity instanceof PlayerIdentity)) return false;
				rPlayerIdentity.set((PlayerIdentity) entity);
				if (rPlayerIdentity.get().getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("remove", null, null,
			(Predicate) entity->{
				if (!(entity instanceof PlayerIdentity)) return false;
				PlayerIdentity playerIdentity = (PlayerIdentity) entity;
				if (playerIdentity.getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.delete(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"deleted\":\"ok\"}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAnUnknownPlayerIdentity() {
		dataManager.register("find",
			null, null, PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Player Identity with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAPlayerIdentityAndFailsForAnUnknownReason() {
		dataManager.register("find",
			null,
			new PersistenceException("Some Reason"), PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAPlayerIdentityWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAPlayerIdentityWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.update(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Player Identity ID is missing or invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void upadteAPlayerIdentity() {
		dataManager.register("find",
			setEntityId(new PlayerIdentity().setName("Achilles")
				.setPath("/there/where/achilles.png"), 1L),
			null, PlayerIdentity.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.update(params("id", "1"), Json.createJsonFromString(
			"{ 'id':1, 'version':1, 'name':'Achilles', 'path':'here/there/achilles.png' }"
		));
		Assert.assertEquals("{" +
				"\"path\":\"here/there/achilles.png\",\"comments\":[]," +
				"\"name\":\"Achilles\",\"id\":1,\"version\":1" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownPlayerIdentity() {
		dataManager.register("find",
			null, null, PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':1, 'name':'Achilles', 'path':'here/there/achilles.png' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Player Identity with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAPlayerIdentityAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':1, 'name':'Achilles', 'path':'here/there/achilles.png' }"
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
	public void tryToUpdateAPlayerIdentityWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':1, 'name':'Achilles', 'path':'here/there/achilles.png' }"
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
	public void getLivePlayerIdentities() {
		dataManager.register("createQuery", null, null,
				"select pi from PlayerIdentity pi where pi.status = :status");
		dataManager.register("setParameter", null, null, "status", PlayerIdentityStatus.LIVE);
		dataManager.register("getResultList", arrayList(
				setEntityId(new PlayerIdentity().setName("Hector").setPath("/there/where/hector.png"), 1),
				setEntityId(new PlayerIdentity().setName("Achilles").setPath("/there/where/achilles.png"), 2)
		), null);
		Json result = playerIdentityController.getLive(params(), null);
		Assert.assertEquals("[{" +
				"\"path\":\"/there/where/hector.png\"," +
				"\"name\":\"Hector\"," +
				"\"id\":1," +
				"\"version\":0" +
			"},{" +
				"\"path\":\"/there/where/achilles.png\"," +
				"\"name\":\"Achilles\"," +
				"\"id\":2," +
				"\"version\":0" +
			"}]", result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAPlayerIdentitsStatusWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.updateStatus(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Player Identity ID is missing or invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkRequestedFieldsForUpdatingAPlayerIdentitySStatus() {
		dataManager.register("find",
				setEntityId(new PlayerIdentity().setName("Achilles")
						.setPath("/there/where/achilles.png"), 1L),
				null, PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void checkFieldValidationsForUpdatingAPlayerIdentitysStatus() {
		dataManager.register("find",
				setEntityId(new PlayerIdentity().setName("Achilles")
						.setPath("/there/where/achilles.png"), 1L),
				null, PlayerIdentity.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void updateAPlayerIdentitysStatus() {
		dataManager.register("find",
				setEntityId(new PlayerIdentity().setName("Achilles")
						.setPath("/there/where/achilles.png"), 1L),
				null, PlayerIdentity.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = playerIdentityController.updateStatus(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'status': 'live' }"
		));
		Assert.assertEquals("{" +
				"\"path\":\"/there/where/achilles.png\"," +
				"\"comments\":[]," +
				"\"name\":\"Achilles\"," +
				"\"id\":1,\"version\":0," +
				"\"status\":\"live\"" +
			"}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAPlayerIdentitysStatusWithBadCredential() {
		dataManager.register("find",
				setEntityId(new PlayerIdentity().setName("Achilles")
						.setPath("/there/where/achilles.png"), 1L),
				null, PlayerIdentity.class, 1L);
		securityManager.doConnect("someone", 0);
		try {
			playerIdentityController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void failToUpdateAPlayerIdentitysStatusForUnknownReason() {
		dataManager.register("find",
				setEntityId(new PlayerIdentity().setName("Achilles")
						.setPath("/there/where/achilles.png"), 1L),
				null, PlayerIdentity.class, 1L);
		dataManager.register("flush", null,
				new PersistenceException("Some reason"), null
		);
		securityManager.doConnect("admin", 0);
		try {
			playerIdentityController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void loadPlayerIdentityImage() {
		platformManager.register("getInputStream",
				new ByteArrayInputStream(("Content of /games/wurst.png").getBytes()),
				null,  "/games/wurst.png");
		FileSpecification image = playerIdentityController.getImage(params("imagename", "wurst-10123456.png"));
		Assert.assertEquals("wurst.png", image.getName());
		Assert.assertEquals("image/png", image.getType());
		Assert.assertEquals("wurst.png", image.getFileName());
		Assert.assertEquals("Content of /games/wurst.png", inputStreamToString(image.getStream()));
		Assert.assertEquals("png", image.getExtension());
		platformManager.hasFinished();
	}

	@Test
	public void failLoadPlayerIdentityImage() {
		platformManager.register("getInputStream", null,
				new PersistenceException("For Any Reason..."),  "/games/wurst.png");
		try {
			playerIdentityController.getImage(params("imagename", "wurst-10123456.png"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
		}
		platformManager.hasFinished();
	}

}
