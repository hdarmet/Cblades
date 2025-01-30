package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BannerController;
import fr.cblades.controller.PlayerIdentityController;
import fr.cblades.domain.Banner;
import fr.cblades.domain.PlayerIdentity;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.EntityExistsException;
import javax.persistence.EntityNotFoundException;
import javax.persistence.PersistenceException;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class PlayerIdentityControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	PlayerIdentityController playerIdentityController;
	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		playerIdentityController = new PlayerIdentityController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
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
		securityManager.doConnect("admin", 0);
		playerIdentityController.create(params(), Json.createJsonFromString(
			"{ 'version':0, 'name':'Hector', 'path':'here/there/hector.png' }"
		));
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
	public void tryToFindAnUnknownBanner() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), PlayerIdentity.class, 1L);
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
			null,
			new EntityNotFoundException("Entity Does Not Exists"), PlayerIdentity.class, 1L);
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
			null,
			new EntityNotFoundException("Entity Does Not Exists"), PlayerIdentity.class, 1L);
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
	public void checkPlayerIdentityEntity() {
		PlayerIdentity playerIdentity = new PlayerIdentity().setName("Achilles").setPath("/there/where/achilles.png");
		Assert.assertEquals(playerIdentity.getName(), "Achilles");
		Assert.assertEquals(playerIdentity.getPath(), "/there/where/achilles.png");
	}

}
