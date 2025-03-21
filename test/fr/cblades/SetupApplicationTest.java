package fr.cblades;

import fr.cblades.controller.BoardController;
import fr.cblades.domain.*;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.annotation.Setup;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;
import org.summer.security.SecurityManagerImpl;

import javax.persistence.EntityNotFoundException;
import javax.persistence.PersistenceException;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class SetupApplicationTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
	}

	@Test
	public void setupDevDatabase() {
		SetupApplication.gae = null;
		SetupApplication.setupDevDatabase();
		MockDataManagerImpl.Factory factory = dataManager.getFactory("default");
		Assert.assertEquals("jdbc:postgresql://localhost/cblades", factory.jdbcUrl);
		Assert.assertEquals(org.postgresql.Driver.class, factory.jdbcDriverClass);
		Assert.assertEquals("cblades", factory.user);
		Assert.assertEquals("cblades", factory.password);
		Assert.assertEquals("org.summer.extension.postgresql.ExtendedPostgreSQLDialect", factory.properties.get("hibernate.dialect"));
		Assert.assertEquals(true, factory.properties.get("hibernate.show_sql"));
		Assert.assertEquals("create-drop", factory.properties.get("hibernate.hbm2ddl.auto"));
	}

	@Test
	public void setupGAEDatabase() {
		SetupApplication.gae = "GAE";
		SetupApplication.setupDevDatabase();
		MockDataManagerImpl.Factory factory = dataManager.getFactory("default");
		Assert.assertEquals("jdbc:postgresql://google/cblades?useSSL=false&socketFactoryArg=cblades:europe-west3:cblades&socketFactory=com.google.cloud.sql.postgres.SocketFactory&user=cblades&password=maudite", factory.jdbcUrl);
		Assert.assertEquals(org.postgresql.Driver.class, factory.jdbcDriverClass);
		Assert.assertEquals(null, factory.user);
		Assert.assertEquals(null, factory.password);
		Assert.assertEquals("org.summer.extension.postgresql.ExtendedPostgreSQLDialect", factory.properties.get("hibernate.dialect"));
		Assert.assertEquals(true, factory.properties.get("hibernate.show_sql"));
		Assert.assertEquals("create-drop", factory.properties.get("hibernate.hbm2ddl.auto"));
	}

	@Test
	public void setSecurityManagerOnDevPlatform() {
		SetupApplication.gae = null;
		SetupApplication.setSecurityManager();
		Assert.assertFalse(securityManager.secureHTTP);
		Assert.assertTrue(securityManager.xsrfProtect);
		SecurityManagerImpl.Finder rolesFinder = securityManager.rolesFinder;
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "admin");
		dataManager.register("getSingleResult",
				setEntityId(new Login().setLogin("admin").setPassword("admin").setAdministrator(true), 1), null);
		String[] roles = rolesFinder.find("admin");
		Assert.assertArrayEquals(new String[]{StandardUsers.ADMIN, StandardUsers.USER}, roles);
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "pieter");
		dataManager.register("getSingleResult",
				setEntityId(new Login().setLogin("pieter").setPassword("pIeTeR"), 2), null);
		roles = rolesFinder.find("pieter");
		Assert.assertArrayEquals(new String[]{StandardUsers.USER}, roles);
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "test");
		dataManager.register("getSingleResult",
				setEntityId(new Login().setLogin("test").setPassword("tEsT").setTest(true), 3), null);
		roles = rolesFinder.find("test");
		Assert.assertArrayEquals(new String[]{StandardUsers.TEST}, roles);
		dataManager.hasFinished();
	}

	@Test
	public void setSecurityManagerOnGAEPlatform() {
		SetupApplication.gae = "GAE";
		SetupApplication.setSecurityManager();
		Assert.assertTrue(securityManager.secureHTTP);
		Assert.assertTrue(securityManager.xsrfProtect);
		SecurityManagerImpl.Finder rolesFinder = securityManager.rolesFinder;
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "admin");
		dataManager.register("getSingleResult",
				setEntityId(new Login().setLogin("admin").setPassword("admin").setAdministrator(true), 1), null);
		String[] roles = rolesFinder.find("admin");
		Assert.assertArrayEquals(new String[]{StandardUsers.ADMIN, StandardUsers.USER}, roles);
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "pieter");
		dataManager.register("getSingleResult",
				setEntityId(new Login().setLogin("pieter").setPassword("pIeTeR"), 2), null);
		roles = rolesFinder.find("pieter");
		Assert.assertArrayEquals(new String[]{StandardUsers.USER}, roles);
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "test");
		dataManager.register("getSingleResult",
				setEntityId(new Login().setLogin("test").setPassword("tEsT").setTest(true), 3), null);
		roles = rolesFinder.find("test");
		Assert.assertArrayEquals(new String[]{StandardUsers.TEST}, roles);
		dataManager.hasFinished();
	}

	@Test
	public void declareStandardUsers() {
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "admin");
		dataManager.register("getResultList", arrayList(), null);
		dataManager.register("persist", null, null, (Predicate) entity->{
			if (!(entity instanceof Account)) return false;
			Account account = (Account) entity;
			if (!"admin".equals(account.getAccess().getLogin())) return false;
			if (!"7aff46e73619488eee287d425a951baf".equals(account.getAccess().getPassword())) return false;
			if (!account.getAccess().isAdministrator()) return false;
			if (account.getAccess().isTest()) return false;
			return true;
		});
		dataManager.register("flush", null, null);
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "test");
		dataManager.register("getResultList", arrayList(), null);
		dataManager.register("persist", null, null, (Predicate) entity->{
			if (!(entity instanceof Account)) return false;
			Account account = (Account) entity;
			if (!"test".equals(account.getAccess().getLogin())) return false;
			if (!"0cbc6611f5540bd0809a388dc95a615b".equals(account.getAccess().getPassword())) return false;
			if (account.getAccess().isAdministrator()) return false;
			if (!account.getAccess().isTest()) return false;
			return true;
		});
		dataManager.register("flush", null, null);
		SetupApplication.declareStandardUsers();
		dataManager.hasFinished();
	}

	@Test
	public void declareStandardUsersWhenUsersAlreadyExists() {
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "admin");
		dataManager.register("getResultList", arrayList(
				setEntityId(new Login().setLogin("admin").setPassword("admin").setAdministrator(true), 1)
		), null);
		dataManager.register("createQuery", null, null, "select l from Login l where l.login=:login");
		dataManager.register("setParameter", null, null,"login", "test");
		dataManager.register("getResultList", arrayList(
				setEntityId(new Login().setLogin("test").setPassword("test").setAdministrator(true), 1)
		), null);
		dataManager.register("flush", null, null);
		SetupApplication.declareStandardUsers();
	}

}
