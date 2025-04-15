package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.EventController;
import fr.cblades.controller.ThemeController;
import fr.cblades.domain.*;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;
import org.summer.platform.PlatformManager;

import javax.persistence.NoResultException;
import javax.persistence.PersistenceException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.function.Predicate;

public class EventControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    EventController eventController;
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
        eventController = new EventController();
        dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
        securityManager.register(new MockSecurityManagerImpl.Credential("someoneelse", "someoneelse", StandardUsers.USER));
        platformManager.setTime(1739879980962L);
    }

    @Test
    public void chargeThemeImage() {
        platformManager.register("getInputStream",
                new ByteArrayInputStream(("Content of /events/event.png").getBytes()),
                null,  "/events/event.png");
        FileSpecification image = eventController.getImage(params("imagename", "event-10123456.png"));
        Assert.assertEquals("event.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("event.png", image.getFileName());
        Assert.assertEquals("Content of /events/event.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeThemeImage() {
        platformManager.register("getInputStream", null,
                new PersistenceException("For Any Reason..."),  "/events/event.png");
        try {
            eventController.getImage(params("imagename", "event-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForEventCreation() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString(
                    "{ }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"date\":\"required\"," +
                "\"description\":\"required\"," +
                "\"title\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForThemeCreation() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'t'," +
                " 'description':'d'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForEventCreation() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'" + generateText("f", 1001) + "'," +
                " 'description':'" + generateText("f", 20001) + "' " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 19995\"," +
                "\"title\":\"must not be greater than 1000\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForEventCreation() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{ " +
                "'date': '???'," +
                "'description': '123', " +
                "'title':'...', " +
                "'status':'???' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"date\":\"not a valid date\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [arch, live, soon]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewEventWithIllustrationAndWithoutATarget() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Event);
            Event event = (Event) entity;
            Assert.assertEquals("New features", event.getTitle());
            Assert.assertEquals(EventStatus.COMING_SOON, event.getStatus());
            Assert.assertEquals("Tue Nov 12 00:00:00 CET 2024", event.getDate().toString());
            Assert.assertEquals("Powerful features", event.getDescription());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("event", "event.png", "png",
                    new ByteArrayInputStream(("Content of /event/event.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'date': '2024-11-12'," +
            " 'title':'New features'," +
            " 'status':'soon'," +
            " 'description':'Powerful features' " +
        "}"));
        Assert.assertEquals("{" +
            "\"date\":\"2024-11-12\"," +
            "\"description\":\"Powerful features\"," +
            "\"illustration\":\"/api/event/images/illustration0-1739879980962.png\"," +
            "\"id\":0," +
            "\"title\":\"New features\"," +
            "\"version\":0," +
            "\"status\":\"soon\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /event/event.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void createNewEventWithoutAnIllustrationButWithATarget() {
        dataManager.register("find", someone, null, Account.class, 1L);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Event);
            Event event = (Event) entity;
            Assert.assertEquals("New features", event.getTitle());
            Assert.assertEquals(EventStatus.COMING_SOON, event.getStatus());
            Assert.assertEquals("Tue Nov 12 00:00:00 CET 2024", event.getDate().toString());
            Assert.assertEquals("Powerful features", event.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.create(params(), Json.createJsonFromString("{" +
            " 'date': '2024-11-12'," +
            " 'title':'New features'," +
            " 'status':'soon'," +
            " 'target': { 'id':1 }," +
            " 'description':'Powerful features' " +
        "}"));
        Assert.assertEquals("{" +
            "\"date\":\"2024-11-12\"," +
            "\"description\":\"Powerful features\"," +
            "\"id\":0," +
            "\"title\":" +
            "\"New features\"," +
            "\"version\":0," +
            "\"status\":\"soon\"," +
            "\"target\":{" +
                "\"firstName\":\"\",\"lastName\":\"\"," +
                "\"id\":0,\"login\":\"someone\"" +
            "}" +
        "}", result.toString());
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateNewEventWithAnUnknownTarget() {
        dataManager.register("find", null, null, Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'target': { 'id':1 }," +
                " 'description':'Powerful features' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unknown Account with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewEventWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
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
    public void failToCreateAnEventBecauseMoreThanOneImageFileAreReceived() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            return true;
        });
        dataManager.register("flush", null, null, null);
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("event0-0", "event0-0.png", "png",
                        new ByteArrayInputStream(("Content of /events/event0-0.png").getBytes())),
                    new FileSpecification("event1-0", "event1-0.png", "png",
                        new ByteArrayInputStream(("Content of /events/event1-0.png").getBytes()))
                }), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Only one illustration file may be loaded.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateNewEventAndFailForAPersistenceProblem() {
        dataManager.register("persist", null, new PersistenceException("Some reason"), (Predicate) entity->{
            Assert.assertTrue(entity instanceof Event);
            return true;
        });
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
    }

    @Test
    public void tryToUpdateAEventWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Event ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkMinFieldSizesForEventUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'t'," +
                " 'description':'d'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForEventUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'" + generateText("f", 1001) + "'," +
                " 'description':'" + generateText("f", 20001) + "' " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 19995\"," +
                "\"title\":\"must not be greater than 1000\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForEventUpdate() {
        dataManager.register("find",
            setEntityId(new Event().setTitle("Happy new year"), 1L),
            null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.create(params(), Json.createJsonFromString("{ " +
                "'date': '???'," +
                "'description': '123', " +
                "'title':'...', " +
                "'status':'???' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"date\":\"not a valid date\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [arch, live, soon]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void updateAnEventWithATarget() {
        Event event = setEntityId(new Event().setTitle("Happy new year"), 1L);
        dataManager.register("find", event, null, Event.class, 1L);
        dataManager.register("find", someone, null, Account.class, 1L);
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.update(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("event", "event.png", "png",
                    new ByteArrayInputStream(("Content of /event/event.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'date': '2024-11-12'," +
            " 'title':'New features'," +
            " 'status':'soon'," +
            " 'target':{ 'id': 1 }," +
            " 'description':'Powerful features' " +
        "}"));
        Assert.assertEquals("{" +
            "\"date\":\"2024-11-12\"," +
            "\"description\":\"Powerful features\"," +
            "\"illustration\":\"/api/event/images/illustration1-1739879980962.png\"," +
            "\"id\":1," +
            "\"title\":\"New features\"," +
            "\"version\":0," +
            "\"status\":\"soon\"," +
            "\"target\":{" +
                "\"firstName\":\"\",\"lastName\":\"\"," +
                "\"id\":0,\"login\":\"someone\"" +
            "}" +
        "}", result.toString());
        Assert.assertEquals("Content of /event/event.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnEventWithAnUnknownTarget() {
        Event event = setEntityId(new Event().setTitle("Happy new year"), 1L);
        dataManager.register("find", event, null, Event.class, 1L);
        dataManager.register("find", null, null, Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'target': { 'id':1 }," +
                " 'description':'Powerful features' " +
            "}"));
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unknown Account with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void updateAnEventWithoutGivingAnIllustration() {
        Event event = setEntityId(new Event().setTitle("Happy new year"), 1L);
        dataManager.register("find", event, null, Event.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.update(params("id", "1"), Json.createJsonFromString("{" +
            " 'date': '2024-11-12'," +
            " 'title':'New features'," +
            " 'status':'soon'," +
            " 'description':'Powerful features' " +
        "}"));
        Assert.assertEquals("{" +
            "\"date\":\"2024-11-12\"," +
            "\"description\":\"Powerful features\"," +
            "\"id\":1," +
            "\"title\":\"New features\"," +
            "\"version\":0," +
            "\"status\":\"soon\"" +
        "}", result.toString());
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnUnknownEvent() {
        dataManager.register("find", null, null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
            "}"));
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Event with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void updateAnEventWithoutAnIllustration() {
        Event event = setEntityId(new Event().setTitle("Happy new year"), 1L);
        dataManager.register("find", event, null, Event.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.update(params("id", "1"), Json.createJsonFromString("{" +
            " 'date': '2024-11-12'," +
            " 'title':'New features'," +
            " 'status':'soon'," +
            " 'description':'Powerful features' " +
        "}"));
        Assert.assertEquals("{" +
            "\"date\":\"2024-11-12\"," +
            "\"description\":\"Powerful features\"," +
            "\"id\":1," +
            "\"title\":\"New features\"," +
            "\"version\":0," +
            "\"status\":\"soon\"" +
        "}", result.toString());
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnEventWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            eventController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
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
    public void failToUpdateAnEventBecauseMoreThanOneImageFileAreReceived() {
        Event event = setEntityId(new Event().setTitle("Happy new year"), 1L);
        dataManager.register("find", event, null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params("id", "1",
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("event0-0", "event0-0.png", "png",
                        new ByteArrayInputStream(("Content of /events/event0-0.png").getBytes())),
                    new FileSpecification("event1-0", "event1-0.png", "png",
                        new ByteArrayInputStream(("Content of /events/event1-0.png").getBytes()))
                }), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Only one illustration file may be loaded.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnEventAndFailForAPersistenceProblem() {
        Event event = setEntityId(new Event().setTitle("Happy new year"), 1L);
        dataManager.register("find", event, null, Event.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some reason"));
        securityManager.doConnect("admin", 0);
        try {
            eventController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'date': '2024-11-12'," +
                " 'title':'New features'," +
                " 'status':'soon'," +
                " 'description':'Powerful features' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
    }

    @Test
    public void tryToListEventsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Event event1() {
        return setEntityId(new Event()
            .setTitle("New features")
            .setStatus(EventStatus.LIVE)
            .setDate(PlatformManager.get().today())
            .setDescription("There are powerful features !"),
        1L);
    }

    Event event2() {
        return setEntityId(new Event()
            .setTitle("Happy new year")
            .setStatus(EventStatus.LIVE)
            .setDate(PlatformManager.get().today())
            .setDescription("Good luck !"),
        2L);
    }

    @Test
    public void listAllEvents() {
        dataManager.register("createQuery", null, null,
            "select count(e) from Event e");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select e from Event e " +
                "left outer join fetch e.target t " +
                "left outer join fetch t.access");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                event1(), event2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.getAll(params("page", "0"), null);
        Assert.assertEquals("{" +
            "\"count\":2,\"pageSize\":10," +
            "\"page\":0," +
            "\"events\":[{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"There are powerful features !\"," +
                "\"id\":1," +
                "\"title\":\"New features\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"Good luck !\"," +
                "\"id\":2," +
                "\"title\":\"Happy new year\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listEventsWithASearchPattern() {
        dataManager.register("createQuery", null, null,
            "select count(e) from Event e " +
                "where fts('pg_catalog.english', e.title||' '||" +
                    "e.description||' '||e.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select e from Event e " +
                "left outer join fetch e.target t " +
                "left outer join fetch t.access " +
                "where fts('pg_catalog.english', e.title||' '||" +
                    "e.description||' '||e.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Theme magicTheme = new Theme().setTitle("Magic");
        dataManager.register("getResultList", arrayList(
                event1(), event2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.getAll(params("page", "0", "search", "Magic"), null);
        Assert.assertEquals("{" +
            "\"count\":2,\"pageSize\":10," +
            "\"page\":0," +
            "\"events\":[{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"There are powerful features !\"," +
                "\"id\":1," +
                "\"title\":\"New features\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"Good luck !\"," +
                "\"id\":2," +
                "\"title\":\"Happy new year\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllEventsWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            eventController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAEventByIdWithoutGivingTheId() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.getById(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Event ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getAEventById() {
        dataManager.register("find", event1(), null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = eventController.getById(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"There are powerful features !\"," +
                "\"id\":1," +
                "\"title\":\"New features\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownEvent() {
        dataManager.register("find", null, null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.getById(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Event with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnEventWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            eventController.getById(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListLivingEventsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.getLive(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getLiveEvents() {
        dataManager.register("createQuery", null, null,
            "select e from Event e where e.status=:status and e.target is null order by e.date desc");
        dataManager.register("setParameter", null, null, "status", EventStatus.LIVE);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
            event1(), event2()
        ), null);
        Json result = eventController.getLive(params("page", "0"), null);
        Assert.assertEquals("{" +
            "\"events\":[{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"There are powerful features !\"," +
                "\"id\":1," +
                "\"title\":\"New features\"," +
                "\"version\":0,\"status\":\"live\"" +
            "},{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"Good luck !\"," +
                "\"id\":2," +
                "\"title\":\"Happy new year\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}" +
        "]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListLivingEventsForAnUserWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.getAccountLive(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getLivingEventsForAnUser() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
            "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("createQuery", null, null,
            "select e from Event e where e.status=:status and e.target=:account order by e.date desc");
        dataManager.register("setParameter", null, null, "account", account);
        dataManager.register("setParameter", null, null, "status", EventStatus.LIVE);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                event1(), event2()
        ), null);
        securityManager.doConnect("someone", 0);
        Json result = eventController.getAccountLive(params("page", "0"), null);
        Assert.assertEquals("{" +
                "\"events\":[{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"There are powerful features !\"," +
                "\"id\":1," +
                "\"title\":\"New features\"," +
                "\"version\":0,\"status\":\"live\"" +
            "},{" +
                "\"date\":\"2025-02-18\"," +
                "\"description\":\"Good luck !\"," +
                "\"id\":2," +
                "\"title\":\"Happy new year\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}" +
        "]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindLivingEventsForAUserWithoutBeingConnected() {
        try {
            eventController.getAccountLive(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not connected", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindLivingEventsForANonExistingUser() {
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException(), null);
        securityManager.doConnect("someone", 0);
        try {
            eventController.getAccountLive(params("page", "0", "id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("No Account for login: someone", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnEventWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            eventController.delete(params(), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Event ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAnEvent() {
        Event event = event1();
        dataManager.register("find", event, null, Event.class, 1L);
        dataManager.register("merge", event, null, event);
        dataManager.register("remove", null, null, event);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
            "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownEvent() {
        dataManager.register("find", null, null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Event with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnEventAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
                new PersistenceException("Some Reason"), Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnEventWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            eventController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAnEventStatusUpdate() {
        dataManager.register("find",
                event1(), null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.updateStatus(params("id", "1"), Json.createJsonFromString(
                    "{}"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"id\":\"required\",\"status\":\"required\"}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidationsForAEventSStatusUpdate() {
        dataManager.register("find",
                event1(), null, Event.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            eventController.updateStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':'1234', 'status':'???'}"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"id\":\"Not a valid id\"," +
                "\"status\":\"??? must matches one of [arch, live, soon]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void upadteAnEventSStatus() {
        dataManager.register("find",
            event1(), null, Event.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = eventController.updateStatus(params("id", "1"), Json.createJsonFromString(
            "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
            "\"date\":\"2025-02-18\"," +
            "\"description\":\"There are powerful features !\"," +
            "\"id\":1," +
            "\"title\":\"New features\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}",
        result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAnEventSStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            eventController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void failToUpdateAnEventStatusForUnknownReason() {
        dataManager.register("find",
                event1(), null, Event.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            eventController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

}

