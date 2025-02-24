package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.AnnouncementController;
import fr.cblades.domain.Announcement;
import fr.cblades.domain.AnnouncementStatus;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.EntityNotFoundException;
import javax.persistence.PersistenceException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class AnnouncementControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    AnnouncementController announcementController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        announcementController = new AnnouncementController();
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl)ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl)ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
    }

    @Test
    public void checkRequiredFieldsForAnnouncementCreation() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.create(params(), Json.createJsonFromString(
                "{}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForAnnouncementCreation() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.create(params(), Json.createJsonFromString(
                "{ 'description':'d', 'illustration':'i' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"" +
                "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForAnnouncementCreation() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.create(params(), Json.createJsonFromString("{" +
                " 'description':'" + generateText("a", 20000) + "'," +
                " 'illustration':'" + generateText("d", 101) + "' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewAnnouncement() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Announcement);
            Announcement announcement = (Announcement) entity;
            Assert.assertEquals("A very interesting new !", announcement.getDescription());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("news", "news.png", "png",
                    new ByteArrayInputStream(("Content of /announcement/news.png").getBytes()))
            }
        ), Json.createJsonFromString("{ " +
                "'version':0, " +
                "'description':'A very interesting new !'" +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"description\":\"A very interesting new !\"," +
            "\"illustration\":\"/api/announcement/images/illustration0-0.png\"," +
            "\"id\":0,\"version\":0" +
        "}", result.toString());
        Assert.assertEquals("Content of /announcement/news.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewAnnouncementWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            announcementController.create(params(), Json.createJsonFromString(
            "{ " +
                    "'version':0, " +
                    "'description':'A very interesting new !'" +
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
    public void failToCreateAnAnnouncementBecauseMoreThanOneImageFile() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            return true;
        });
        dataManager.register("flush", null, null, null);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("news1", "news1.png", "png",
                        new ByteArrayInputStream(("Content of /announcements/elf1.png").getBytes())),
                    new FileSpecification("news2", "news2.png", "png",
                        new ByteArrayInputStream(("Content of /announcements/elf2.png").getBytes()))
                }
            ), Json.createJsonFromString(
                "{ " +
                    "'version':0, " +
                    "'description':'A very interesting new !'" +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("One and only one illustration file may be loaded.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void failToCreateAnAnnouncementForUnknownReason() {
        dataManager.register("persist", null,
                new PersistenceException("Some reason"),
                (Predicate) entity->{
                    return (entity instanceof Announcement);
                }
        );
        securityManager.doConnect("admin", 0);
        try {
            announcementController.create(params(), Json.createJsonFromString(
                "{ " +
                    "'version':0, " +
                    "'description':'A very interesting new !'" +
                "}"
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
    public void listAllAnnouncements() {
        dataManager.register("createQuery", null, null,
                "select count(a) from Announcement a");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select a from Announcement a");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1),
                setEntityId(new Announcement().setDescription("Second news").setIllustration("/there/where/news2.png"), 2)
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.getAll(params("page", "0"), null);
        Assert.assertEquals("{" +
                "\"count\":2,\"pageSize\":10,\"page\":0,\"announcements\":[{" +
                    "\"description\":\"First news\",\"illustration\":\"/there/where/news1.png\",\"id\":1,\"version\":0}," +
                    "{\"description\":\"Second news\",\"illustration\":\"/there/where/news2.png\",\"id\":2,\"version\":0}" +
                "]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listAnnouncementsWithASearchPattern() {
        dataManager.register("createQuery", null, null,
        "select count(a) from Announcement a where " +
                "fts('pg_catalog.english', a.description||' '||a.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "new");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
        "select a from Announcement a where " +
                "fts('pg_catalog.english', a.description||' '||a.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "new");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1),
                setEntityId(new Announcement().setDescription("Second news").setIllustration("/there/where/news2.png"), 2)
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.getAll(params("page", "0", "search", "new"), null);
        Assert.assertEquals("{" +
            "\"count\":2,\"pageSize\":10,\"page\":0,\"announcements\":[{" +
            "\"description\":\"First news\",\"illustration\":\"/there/where/news1.png\",\"id\":1,\"version\":0}," +
            "{\"description\":\"Second news\",\"illustration\":\"/there/where/news2.png\",\"id\":2,\"version\":0}" +
        "]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllAnnouncementsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllAnnouncementsWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            announcementController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getLiveAnnouncement() {
        dataManager.register("createQuery", null, null,
                "select a from Announcement a where a.status=:status");
        dataManager.register("setParameter", null, null, "status", AnnouncementStatus.LIVE);
        dataManager.register("getResultList", arrayList(
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1),
                setEntityId(new Announcement().setDescription("Second news").setIllustration("/there/where/news2.png"), 2)
        ), null);
        Json result = announcementController.getLive(params(), null);
        dataManager.hasFinished();
    }

    @Test
    public void getOneAnnouncementById() {
        dataManager.register("find", setEntityId(
                new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.getById(params("id", "1"), null);
        Assert.assertEquals(
                "{\"description\":\"First news\",\"illustration\":\"/there/where/news1.png\",\"id\":1,\"version\":0}",
                result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnAnnouncementWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.getById(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Announcement ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownAnnouncement() {
        dataManager.register("find", null,
                new EntityNotFoundException("Entity Does Not Exists"), Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.getById(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Announcement with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnAnnouncementWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            announcementController.getById(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAnAnnouncement() {
        dataManager.register("find",
            setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        Ref<Announcement> rAnnouncement = new Ref<>();
        dataManager.register("merge", (Supplier)()->rAnnouncement.get(), null,
            (Predicate) entity->{
                if (!(entity instanceof Announcement)) return false;
                rAnnouncement.set((Announcement) entity);
                if (rAnnouncement.get().getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("remove", null, null,
            (Predicate) entity->{
                if (!(entity instanceof Announcement)) return false;
                Announcement announcement = (Announcement) entity;
                if (announcement.getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnAnnouncementWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Announcement ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownAnnouncement() {
        dataManager.register("find",
                null,
                new EntityNotFoundException("Entity Does Not Exists"), Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Announcement with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnAnnouncementAndFailsForAnUnknownReason() {
        dataManager.register("find",
                null,
                new PersistenceException("Some Reason"), Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnAnnouncementWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            announcementController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForAnnouncementUpdate() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        announcementController.update(params("id", "1"), Json.createJsonFromString(
                "{}"
        ));
        dataManager.hasFinished();
    }

    @Test
    public void checkMinFieldSizesForAnnouncementUpdate() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.update(params("id", "1"), Json.createJsonFromString(
                    "{ 'description':'d', 'illustration':'i' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForAnnouncementUpdate() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'description':'" + generateText("a", 20000) + "'," +
                " 'illustration':'" + generateText("d", 101) + "' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 19995\"" +
                "}", sce.getMessage());
        }
    }

    @Test
    public void tryToUpdateAnAnnouncementWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Announcement ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void upadteAnAnnouncement() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'version':0, 'description':'A very interesting new !' }"
        ));
        Assert.assertEquals("{" +
            "\"description\":\"A very interesting new !\"," +
            "\"illustration\":\"/there/where/news1.png\"," +
            "\"id\":1,\"version\":0" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnUnknownAnnouncement() {
        dataManager.register("find",
                null,
                new EntityNotFoundException("Entity Does Not Exists"), Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'version':0, 'description':'A very interesting new !' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Announcement with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnAnnoucementAndFailsForAnUnknownReason() {
        dataManager.register("find",
                null,
                new PersistenceException("Some Reason"), Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'version':0, 'description':'A very interesting new !' }"
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
    public void tryToUpdateAnAnnouncementWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            announcementController.update(params("id", "1"), Json.createJsonFromString(
                    "{ 'version':0, 'description':'A very interesting new !' }"
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
    public void checkRequestedFieldsForAAnnoucementsStatusUpdate() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void tryToUpdateAnAnnouncementStatusWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            announcementController.updateStatus(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Announcement ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkFieldValidationsForAnnouncementsStatusUpdate() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            announcementController.updateStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':'1234', 'status':'???'}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"id\":\"Not a valid id\",\"status\":\"??? must matches one of [arch, live, soon]\"}", sce.getMessage());
        }
    }

    @Test
    public void upadteAnAnnouncementsStatus() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = announcementController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
            "\"description\":\"First news\"," +
            "\"illustration\":\"/there/where/news1.png\"," +
            "\"id\":1,\"version\":0,\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAnAnnouncementsStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            announcementController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void failToUpdateAnAnnouncementStatusForUnknownReason() {
        dataManager.register("find",
                setEntityId(new Announcement().setDescription("First news").setIllustration("/there/where/news1.png"), 1L),
                null, Announcement.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            announcementController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
                new ByteArrayInputStream(("Content of /announcements/news.png").getBytes()),
                null,  "/announcements/news.png");
        FileSpecification image = announcementController.getImage(params("imagename", "news-10123456.png"));
        Assert.assertEquals("news.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("news.png", image.getFileName());
        Assert.assertEquals("Content of /announcements/news.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeBannerImage() {
        platformManager.register("getInputStream", null,
                new PersistenceException("For Any Reason..."),  "/announcements/news.png");
        try {
            announcementController.getImage(params("imagename", "news-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }

}
