package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.LoginController;
import fr.cblades.domain.Login;
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

public class LoginControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	LoginController loginController;
	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		loginController = new LoginController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
	}

	@Test
	public void createNewLogin() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			if (!(entity instanceof Login)) return false;
			Login login = (Login) entity;
			if (!"He".equals(login.getLogin())) return false;
			if (!"298cde70c32a57b84d0a546fedbb2596".equals(login.getPassword())) return false;
			if (login.isAdministrator()) return false;
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		loginController.create(params(), Json.createJsonFromString(
			"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
		));
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingLogin() {
		dataManager.register("persist", null,
			new PersistenceException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof Login);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			loginController.create(params(), Json.createJsonFromString(
					"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Login with this login (He) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewLoginWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			loginController.create(params(), Json.createJsonFromString(
					"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
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
	public void listAllLogins() {
		dataManager.register("createQuery", null, null, "select l from Login l");
		dataManager.register("getResultList", arrayList(
			setEntityId(new Login().setLogin("Peter").setPassword("PiEtEr").setAdministrator(true), 1),
			setEntityId(new Login().setLogin("Paul").setPassword("PaUl").setAdministrator(false), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = loginController.getAll(params(), null);
		Assert.assertEquals(result.toString(),
			"[" +
				"{\"password\":\"PiEtEr\",\"admin\":true,\"id\":1,\"login\":\"Peter\",\"version\":0}," +
				"{\"password\":\"PaUl\",\"admin\":false,\"id\":2,\"login\":\"Paul\",\"version\":0}" +
			"]" );
		dataManager.hasFinished();
	}

	@Test
	public void tryToListAllLoginsWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			loginController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneLoginById() {
		dataManager.register("find",
			setEntityId(new Login().setLogin("Peter").setPassword("PiEtEr").setAdministrator(true), 1L),
			null, Login.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = loginController.getById(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"password\":\"PiEtEr\",\"admin\":true,\"id\":1,\"login\":\"Peter\",\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownLogin() {
		dataManager.register("find",
			setEntityId(new Login().setLogin("Peter").setPassword("PiEtEr").setAdministrator(true), 1L),
				new EntityNotFoundException("Entity Does Not Exists"), Login.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			loginController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Login with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindALoginWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			loginController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void deleteALogin() {
		dataManager.register("find",
			setEntityId(new Login().setLogin("Peter").setPassword("PiEtEr").setAdministrator(true), 1L),
			null, Login.class, 1L);
		Ref<Login> rLogin = new Ref<>();
		dataManager.register("merge", (Supplier)()->rLogin.get(), null,
			(Predicate) entity->{
				if (!(entity instanceof Login)) return false;
				rLogin.set((Login) entity);
				if (rLogin.get().getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("remove", null, null,
			(Predicate) entity->{
				if (!(entity instanceof Login)) return false;
				Login login = (Login) entity;
				if (login.getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = loginController.delete(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"deleted\":\"ok\"}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAnUnknownLogin() {
		dataManager.register("find",
				null,
				new EntityNotFoundException("Entity Does Not Exists"), Login.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			loginController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Login with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteALoginAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Login.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			loginController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteALoginWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			loginController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void upadteALogin() {
		dataManager.register("find",
				setEntityId(new Login().setLogin("Peter").setPassword("PiEtEr").setAdministrator(true), 1L),
				null, Login.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = loginController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
		));
		Assert.assertEquals(result.toString(),
				"{\"password\":\"298cde70c32a57b84d0a546fedbb2596\",\"admin\":false,\"id\":1,\"login\":\"He\",\"version\":0}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownLogin() {
		dataManager.register("find",
				null,
				new EntityNotFoundException("Entity Does Not Exists"), Login.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			loginController.update(params("id", "1"), Json.createJsonFromString(
					"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Login with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateALoginAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Login.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			loginController.update(params("id", "1"), Json.createJsonFromString(
					"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
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
			loginController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'login':'He', 'password':'PassW0rd', 'admin':false}"
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
	public void connectSuccessfully() {
		Login userHe = (Login)setEntityId(new Login().setLogin("He").setPassword("298cde70c32a57b84d0a546fedbb2596").setAdministrator(false), 1);
		securityManager.register(
			new MockSecurityManagerImpl.Credential("He", "298cde70c32a57b84d0a546fedbb2596", StandardUsers.USER)
		);
		dataManager.register("createQuery", null, null,
				"select l from Login l where l.login=:login and l.password=:password");
		dataManager.register("setParameter", null, null,
				"login", "He");
		dataManager.register("setParameter", null, null,
				"password", "298cde70c32a57b84d0a546fedbb2596");
		dataManager.register("getResultList", arrayList(
				userHe
		), null);
		loginController.login(params(),
				Json.createJsonFromString("{'login':'He', 'password':'PassW0rd'}")
		);
		Assert.assertEquals(securityManager.getConnection().getId(), "He");
		dataManager.hasFinished();
	}

	@Test
	public void failsToConnect() {
		dataManager.register("createQuery", null, null,
				"select l from Login l where l.login=:login and l.password=:password");
		dataManager.register("setParameter", null, null,
				"login", "He");
		dataManager.register("setParameter", null, null,
				"password", "298cde70c32a57b84d0a546fedbb2596");
		dataManager.register("getResultList", arrayList(), null);
		try {
			loginController.login(params(),
					Json.createJsonFromString("{'login':'He', 'password':'PassW0rd'}")
			);
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Bad credentials", sce.getMessage());
		}
		dataManager.hasFinished();
		Assert.assertNull(securityManager.getConnection());
	}

	@Test
	public void failsToConnectForAnUnknownReason() {
		dataManager.register("createQuery", null,
			new PersistenceException("Some Reason"),
			"select l from Login l where l.login=:login and l.password=:password");
		try {
			loginController.login(params(),
					Json.createJsonFromString("{'login':'He', 'password':'PassW0rd'}")
			);
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void disconnectSuccessfully() {
		securityManager.doConnect("someone", 0);
		loginController.disconnect(params(),
			Json.createJsonFromString("{}")
		);
		Assert.assertNull(securityManager.getConnection());
	}

	@Test
	public void checkLoginEntity() {
		Login login = new Login().setLogin("Pieter").setPassword("298cde70c32a57b84d0a546fedbb2596").setAdministrator(false).setTest(true);
		Assert.assertEquals(login.getLogin(), "Pieter");
		Assert.assertEquals(login.getPassword(), "298cde70c32a57b84d0a546fedbb2596");
		Assert.assertFalse(login.isAdministrator());
		Assert.assertTrue(login.isTest());
	}

	@Test
	public void checkEncryption() {
		Assert.assertEquals(Login.encrypt("PassW0rd"), "298cde70c32a57b84d0a546fedbb2596");
		try {
			Login.encrypt("PassW0rd", "m5d");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : m5d MessageDigest not available", sce.getMessage());
		}
	}

}
