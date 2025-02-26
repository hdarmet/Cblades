package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.BannerController;
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

public class BannerControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {
	
	BannerController bannerController;
	MockDataManagerImpl dataManager;
	MockPlatformManagerImpl platformManager;
	MockSecurityManagerImpl securityManager;
	
	@Before
	public void before() {
		ApplicationManager.set(new ApplicationManagerForTestImpl());
		bannerController = new BannerController();
		dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
		dataManager.openPersistenceUnit("default");
		platformManager = (MockPlatformManagerImpl)ApplicationManager.get().getPlatformManager();
		securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
		securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
		securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
	}

	@Test
	public void checkRequiredFieldsForBannerCreation() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
					"{}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"required\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMinFieldSizesForBannerCreation() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
				"{ 'name':'b', 'path':'t', 'description':'d' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must be greater of equals to 2\"," +
				"\"description\":\"must be greater of equals to 2\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMaxFieldSizesForBannerCreation() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
			"{ 'name':'" + generateText("a", 21) + "'," +
					" 'description':'" + generateText("d", 2001) + "' " +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must not be greater than 20\"," +
				"\"description\":\"must not be greater than 2000\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidityForBannerCreation() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
					"{ 'name':'...', 'status':'???' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must matches '[a-zA-Z0-9_\\\\-]+'\"," +
				"\"status\":\"??? must matches one of [pnd, live, prp]\"}", sce.getMessage());
		}
	}

	@Test
	public void createNewBanner() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			Assert.assertTrue(entity instanceof Banner);
			Banner banner = (Banner) entity;
			Assert.assertEquals("banner", banner.getName());
			return true;
		});
		OutputStream outputStream = new ByteArrayOutputStream();
		platformManager.register("getOutputStream", outputStream, null);
		dataManager.register("flush", null, null);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.create(params(
			ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
				new FileSpecification("banner-elf", "banner-elf.png", "png",
					new ByteArrayInputStream(("Content of /games/elf.png").getBytes()))
			}
		), Json.createJsonFromString(
		"{ 'version':0, 'name':'banner' }"
		));
		Assert.assertEquals("{" +
			"\"path\":\"/api/banner/images/banner0-0.png\"," +
			"\"comments\":[]," +
			"\"name\":\"banner\"," +
			"\"id\":0," +
			"\"version\":0" +
		"}", result.toString());
		Assert.assertEquals("Content of /games/elf.png", outputStreamToString(outputStream));
		platformManager.hasFinished();
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
				"{ 'version':0, 'name':'banner' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Banner with name (banner) already exists", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void tryToCreateANewBannerWithBadCredentials() {
		securityManager.doConnect("someone", 0);
		try {
			bannerController.create(params(), Json.createJsonFromString(
					"{ 'version':0, 'name':'banner' }"
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
	public void failToCreateABannerBecauseMoreThanOneImageFile() {
		dataManager.register("persist", null, null, (Predicate) entity->{
			return true;
		});
		dataManager.register("flush", null, null, null);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.create(params(
				ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
					new FileSpecification("banner-elf1", "banner-elf1.png", "png",
						new ByteArrayInputStream(("Content of /games/elf1.png").getBytes())),
					new FileSpecification("banner-elf2", "banner-elf2.png", "png",
						new ByteArrayInputStream(("Content of /games/elf2.png").getBytes()))
				}
			), Json.createJsonFromString(
					"{ 'version':0, 'name':'banner' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("One and only one banner file must be loaded.", sce.getMessage());
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
					"{ 'version':0, 'name':'banner' }"
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
	public void tryToGetBannersWithoutGivingParameters() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.getAll(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void listAllBanners() {
		dataManager.register("createQuery", null, null, "select count(b) from Banner b");
		dataManager.register("getSingleResult", 2L, null);
		dataManager.register("createQuery", null, null, "select b from Banner b");
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 16);
		dataManager.register("getResultList", arrayList(
			setEntityId(new Banner().setName("banner1").setPath("/there/where/banner1.png"), 1),
			setEntityId(new Banner().setName("banner2").setPath("/there/where/banner2.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.getAll(params("page", "0"), null);
		Assert.assertEquals(
			"{" +
					"\"count\":2," +
					"\"pageSize\":16," +
					"\"page\":0," +
					"\"banners\":[" +
						"{\"path\":\"/there/where/banner1.png\",\"comments\":[],\"name\":\"banner1\",\"id\":1,\"version\":0}," +
						"{\"path\":\"/there/where/banner2.png\",\"comments\":[],\"name\":\"banner2\",\"id\":2,\"version\":0}" +
					"]" +
			"}", result.toString());
		dataManager.hasFinished();
	}

	@Test
	public void listBannersWithASearchPattern() {
		dataManager.register("createQuery", null, null,
			"select count(b) from Banner b where " +
					"fts('pg_catalog.english', b.name||' '||b.description ||' '||b.status, :search) = true");
		dataManager.register("setParameter", null, null,"search", "elf");
		dataManager.register("getSingleResult", 2L, null);
		dataManager.register("createQuery", null, null,
			"select b from Banner b where " +
					"fts('pg_catalog.english', b.name||' '||b.description ||' '||b.status, :search) = true");
		dataManager.register("setParameter", null, null,"search", "elf");
		dataManager.register("setFirstResult", null, null, 0);
		dataManager.register("setMaxResults", null, null, 16);
		dataManager.register("getResultList", arrayList(
			setEntityId(new Banner().setName("banner1").setPath("/there/where/banner1.png"), 1),
			setEntityId(new Banner().setName("banner2").setPath("/there/where/banner2.png"), 2)
		), null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.getAll(params("page", "0", "search", "elf"), null);
		dataManager.hasFinished();
	}

	@Test
	public void getLiveBanners() {
		dataManager.register("createQuery", null, null,
				"select b from Banner b where b.status = :status");
		dataManager.register("setParameter", null, null, "status", BannerStatus.LIVE);
		dataManager.register("getResultList", arrayList(
			setEntityId(new Banner().setName("banner1").setPath("/there/where/banner1.png"), 1),
			setEntityId(new Banner().setName("banner2").setPath("/there/where/banner2.png"), 2)
		), null);
		Json result = bannerController.getLive(params(), null);
		Assert.assertEquals("[{" +
				"\"path\":\"/there/where/banner1.png\"," +
				"\"name\":\"banner1\"," +
				"\"id\":1," +
				"\"version\":0" +
			"},{" +
				"\"path\":\"/there/where/banner2.png\"," +
				"\"name\":\"banner2\"," +
				"\"id\":2," +
				"\"version\":0" +
			"}]", result.toString());
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
	public void tryToGetABannerWithoutGivingTheName() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.getByName(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Announcement ID is missing or invalid (null)", sce.getMessage());
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
			"{\"path\":\"/there/where/banner.png\",\"comments\":[],\"name\":\"banner\",\"id\":1,\"version\":0}",
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
	public void tryToGetABannerWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.getById(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Banner ID is missing or invalid (null)", sce.getMessage());
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
			"{\"path\":\"/there/where/banner.png\",\"comments\":[],\"name\":\"banner\",\"id\":1,\"version\":0}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToFindAnUnknownBanner() {
		dataManager.register("find",
			null, null, Banner.class, 1L);
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
	public void tryToDeleteABannerWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.delete(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Banner ID is missing or invalid (null)", sce.getMessage());
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
			null, null, Banner.class, 1L);
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
	public void tryToUpdateABannerWithoutGivingItsID() {
		securityManager.doConnect("admin", 0);
		try {
			bannerController.update(params(), null);
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("The Banner ID is missing or invalid (null)", sce.getMessage());
		}
		dataManager.hasFinished();
	}

	@Test
	public void checkRequiredFieldsForBannerUpdate() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner1")
				.setPath("/there/where/banner1.png"), 1L),
		null, Banner.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		bannerController.update(params("id", "1"), Json.createJsonFromString(
				"{}"
		));
		dataManager.hasFinished();
	}

	@Test
	public void checkMinFieldSizesForBannerUpdate() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner1")
				.setPath("/there/where/banner1.png"), 1L),
		null, Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.update(params("id", "1"), Json.createJsonFromString(
					"{ 'name':'b', 'path':'t', 'description':'d' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must be greater of equals to 2\"," +
				"\"description\":\"must be greater of equals to 2\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkMaxFieldSizesForBannerUpdate() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner1")
				.setPath("/there/where/banner1.png"), 1L),
		null, Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.update(params("id", "1"), Json.createJsonFromString("{" +
					" 'name':'" + generateText("a", 21) + "'," +
					" 'description':'" + generateText("d", 2001) + "'" +
				"}"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must not be greater than 20\"," +
				"\"description\":\"must not be greater than 2000\"" +
			"}", sce.getMessage());
		}
	}

	@Test
	public void checkFieldValidityForBannerUpdate() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner1")
				.setPath("/there/where/banner1.png"), 1L),
				null, Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.update(params("id", "1"), Json.createJsonFromString(
			"{ 'name':'...'," +
					" 'status':'???' }"
			));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(400, sce.getStatus());
			Assert.assertEquals("{" +
				"\"name\":\"must matches '[a-zA-Z0-9_\\\\-]+'\"," +
				"\"status\":\"??? must matches one of [pnd, live, prp]\"}", sce.getMessage());
		}
	}

	@Test
	public void updateABanner() {
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
		"{\"path\":\"/there/where/banner1.png\",\"comments\":[],\"name\":\"banner2\",\"id\":1,\"version\":1}",
			result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpdateAnUnknownBanner() {
		dataManager.register("find",
			null, null, Banner.class, 1L);
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
	public void checkRequestedFieldsForAnUpadteABannersStatus() {
		dataManager.register("find",
				setEntityId(new Banner().setName("banner1")
						.setPath("/there/where/banner1.png"), 1L),
				null, Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void checkFieldValidationsForAnUpadteABannersStatus() {
		dataManager.register("find",
				setEntityId(new Banner().setName("banner1")
						.setPath("/there/where/banner1.png"), 1L),
				null, Banner.class, 1L);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
				setEntityId(new Banner().setName("banner1")
						.setPath("/there/where/banner1.png"), 1L),
				null, Banner.class, 1L);
		dataManager.register("flush", null, null);
		securityManager.doConnect("admin", 0);
		Json result = bannerController.updateStatus(params("id", "1"), Json.createJsonFromString(
				"{ 'id':1, 'status': 'live' }"
		));
		Assert.assertEquals(
				"{\"path\":\"/there/where/banner1.png\",\"comments\":[],\"name\":\"banner1\",\"id\":1,\"version\":0,\"status\":\"live\"}",
				result.toString()
		);
		dataManager.hasFinished();
	}

	@Test
	public void tryToUpadteABannersStatusWithBadCredential() {
		dataManager.register("find",
				setEntityId(new Banner().setName("banner1")
						.setPath("/there/where/banner1.png"), 1L),
				null, Banner.class, 1L);
		securityManager.doConnect("someone", 0);
		try {
			bannerController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void failToUpdateABannersStatusForUnknownReason() {
		dataManager.register("find",
			setEntityId(new Banner().setName("banner1")
				.setPath("/there/where/banner1.png"), 1L),
		null, Banner.class, 1L);
		dataManager.register("flush", null,
			new PersistenceException("Some reason"), null
		);
		securityManager.doConnect("admin", 0);
		try {
			bannerController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
	public void chargeBannerImage() {
		platformManager.register("getInputStream",
				new ByteArrayInputStream(("Content of /games/elf.png").getBytes()),
				null,  "/games/elf.png");
		FileSpecification image = bannerController.getImage(params("imagename", "elf-10123456.png"));
		Assert.assertEquals("elf.png", image.getName());
		Assert.assertEquals("image/png", image.getType());
		Assert.assertEquals("elf.png", image.getFileName());
		Assert.assertEquals("Content of /games/elf.png", inputStreamToString(image.getStream()));
		Assert.assertEquals("png", image.getExtension());
		platformManager.hasFinished();
	}

	@Test
	public void failChargeBannerImage() {
		platformManager.register("getInputStream", null,
				new PersistenceException("For Any Reason..."),  "/games/elf.png");
		try {
			bannerController.getImage(params("imagename", "elf-10123456.png"));
			Assert.fail("The request should fail");
		}
		catch (SummerControllerException sce) {
			Assert.assertEquals(409, sce.getStatus());
			Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
		}
		platformManager.hasFinished();
	}

}
