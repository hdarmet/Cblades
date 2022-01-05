package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BannerController;
import fr.cblades.controller.BoardController;
import fr.cblades.domain.*;
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

public class BannerControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	BannerController bannerController;
	MockDataManagerImpl dataManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		bannerController = new BannerController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
	}

	@Test
	public void createNewBanner() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			if (!(entity instanceof Banner)) return false;
			Banner banner = (Banner) entity;
			if (!"banner".equals(banner.getName())) return false;
			if (!"here/there/banner.png".equals(banner.getPath())) return false;
			return true;
		});
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		bannerController.create(params(), Json.createJsonFromString(
			"{ 'version':0, 'name':'banner', 'path':'here/there/banner.png' }"
		));
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateAnAlreadyExistingBanner() {
		dataManager.register("persist", null,
			new EntityExistsException("Entity already Exists"),
				(Predicate) entity->{
					return (entity instanceof Banner);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
				"{ 'version':0, 'name':'banner', 'path':'here/there/banner.png' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(500, sce.getStatus());
			Assert.assertEquals("Banner with name (banner) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewBannerWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
					"{ 'version':0, 'name':'banner', 'path':'here/there/banner.png' }"
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
	public void failToCreateABannerForUnknownReason() {
		dataManager.register("persist", null,
				new PersistenceException("Some reason"),
				(Predicate) entity->{
					return (entity instanceof Banner);
				}
		);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
					"{ 'version':0, 'name':'banner', 'path':'here/there/banner.png' }"
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
	public void listAllBanners() {
		dataManager.register("createQuery", null, null, "select b from Banner b");
		dataManager.register("getResultList", arrayList(
			setEntityId(new Banner().setName("banner1").setPath("/there/where/banner1.png"), 1),
				setEntityId(new Banner().setName("banner2").setPath("/there/where/banner2.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.getAll(params(), null);
		Assert.assertEquals(
			"[" +
				"{\"path\":\"/there/where/banner1.png\",\"name\":\"banner1\",\"id\":1,\"version\":0}," +
				"{\"path\":\"/there/where/banner2.png\",\"name\":\"banner2\",\"id\":2,\"version\":0}" +
			"]", result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void tryToListAllBannersWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneBannerByName() {
		dataManager.register("createQuery", null, null, "select b from Banner b where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "banner");
		dataManager.register("getSingleResult",
			setEntityId(new Banner().setName("banner")
				.setPath("/there/where/banner.png"), 1),
		null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.getByName(params("name", "banner"), null);
		Assert.assertEquals(
			"{\"path\":\"/there/where/banner.png\",\"name\":\"banner\",\"id\":1,\"version\":0}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameAnUnknownBanner() {
		dataManager.register("createQuery", null, null, "select b from Banner b where b.name = :name");
		dataManager.register("setParameter", null, null,"name", "banner");
		dataManager.register("getSingleResult", null, null);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.getByName(params("name", "banner"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Banner with name banner", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindByNameABannerWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.getByName(params("name", "map1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void getOneBannerById() {
		dataManager.register("find",
				setEntityId(new Banner().setName("banner")
					.setPath("/there/where/banner.png"), 1L),
			null, Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.getById(params("id", "1"), null);
		Assert.assertEquals(
			"{\"path\":\"/there/where/banner.png\",\"name\":\"banner\",\"id\":1,\"version\":0}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownBanner() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Banner with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindABannerWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.getById(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void deleteABanner() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner")
				.setPath("/there/where/banner.png"), 1L),
			null, Banner.class, 1L);
		Ref<Banner> rBanner = new Ref<>();
		dataManager.register("merge", (Supplier)()->rBanner.get(), null,
			(Predicate) entity->{
				if (!(entity instanceof Banner)) return false;
				rBanner.set((Banner) entity);
				if (rBanner.get().getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("remove", null, null,
			(Predicate) entity->{
				if (!(entity instanceof Banner)) return false;
				Banner banner = (Banner) entity;
				if (banner.getId() != 1L) return false;
				return true;
			}
		);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.delete(params("id", "1"), null);
		Assert.assertEquals(result.toString(),
				"{\"deleted\":\"ok\"}"
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteAnUnknownBanner() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Banner with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteABannerAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToDeleteABannerWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.delete(params("id", "1"), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(403, sce.getStatus());
			Assert.assertEquals("Not authorized", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void upadteABanner() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner1")
				.setPath("/there/where/banner1.png"), 1L),
			null, Banner.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.update(params("id", "1"), Json.createJsonFromString(
			"{ 'id':1, 'version':1, 'name':'banner2', 'path':'here/there/banner2.png' }"
		));
		Assert.assertEquals(
		"{\"path\":\"here/there/banner2.png\",\"name\":\"banner2\",\"id\":1,\"version\":1}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownBanner() {
		dataManager.register("find",
			null,
			new EntityNotFoundException("Entity Does Not Exists"), Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':1, 'name':'banner2', 'path':'here/there/banner2.png' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(404, sce.getStatus());
			Assert.assertEquals("Unknown Banner with id 1", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateABannerAndFailsForAnUnknownReason() {
		dataManager.register("find",
				null,
				new PersistenceException("Some Reason"), Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.update(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'version':1, 'name':'banner2', 'path':'here/there/banner2.png' }"
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
	public void tryToUpdateABannerWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.update(params("id", "1"), Json.createJsonFromString(
					"{ 'id':1, 'version':1, 'name':'banner2', 'path':'here/there/banner2.png' }"
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
	public void checkBannerEntity() {
		Banner banner = new Banner().setName("banner").setPath("/there/where/banner.png");
		Assert.assertEquals(banner.getName(), "banner");
		Assert.assertEquals(banner.getPath(), "/there/where/banner.png");
	}

}
