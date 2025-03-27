package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.FactionController;
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
import javax.persistence.NoResultException;
import javax.persistence.PersistenceException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class FactionControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    FactionController factionController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        factionController = new FactionController();
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
    public void checkRequiredFieldsForFactionCreation() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.create(params(), Json.createJsonFromString(
                    "{ 'comments': [{}], 'sheets': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"required\"," +
                "\"comments-version\":\"required\"," +
                "\"sheets-name\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"name\":\"required\"," +
                "\"description\":\"required\"," +
                "\"sheets-ordinal\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForFactionCreation() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.create(params(), Json.createJsonFromString("{" +
                " 'name':'n'," +
                " 'description':'d'," +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'n', " +
                    "'description':'d'" +
                " }] " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must be greater of equals to 2\"," +
                "\"sheets-name\":\"must be greater of equals to 2\"," +
                "\"name\":\"must be greater of equals to 2\"," +
                "\"description\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForFactionCreation() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.create(params(), Json.createJsonFromString("{" +
                " 'name':'" + generateText("n", 201) + "'," +
                " 'description':'" + generateText("d", 20000) + "', " +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'" + generateText("n", 201) +"', " +
                    "'description':'" + generateText("d", 20000) +"'" +
                " }] " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must not be greater than 19995\"," +
                "\"sheets-name\":\"must not be greater than 200\"," +
                "\"name\":\"must not be greater than 200\"," +
                "\"description\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForFactionCreation() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.create(params(), Json.createJsonFromString(
            "{ " +
                    "'name':'...', 'status':'???', 'description': 0, " +
                    "'sheets': [ { 'name':'...', 'description': 0, ordinal:'un' } ] " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"not a valid string\"," +
                "\"sheets-name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"sheets-ordinal\":\"not a valid integer\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}",
            sce.getMessage());
        }
    }

    @Test
    public void createNewFactionWithIllustration() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Faction);
            Faction faction = (Faction) entity;
            Assert.assertEquals("Redneck", faction.getName());
            Assert.assertEquals(FactionStatus.PENDING, faction.getStatus());
            Assert.assertEquals("A skilled faction", faction.getDescription());
            return true;
        });
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream factionOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", factionOutputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("redneck", "redneck_faction.png", "png",
                    new ByteArrayInputStream(("Content of /factions/redneck_faction.png").getBytes())),
                new FileSpecification("redneck-0", "redneck_faction-0.png", "png",
                    new ByteArrayInputStream(("Content of /factions/redneck_faction-0.png").getBytes())),
                new FileSpecification("icon-redneck-0", "icon-redneck_faction-0.png", "png",
                    new ByteArrayInputStream(("Content of /factions/icon-redneck_faction-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction', " +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'infantry', " +
                    "'description':'infantry units'" +
                " }] " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"sheets\":[{" +
                "\"path\":\"/api/faction/documents/sheet0_0-1739879980962.png\"," +
                "\"name\":\"infantry\"," +
                "\"icon\":\"/api/faction/documents/sheeticon0_0-1739879980962.png\"," +
                "\"description\":\"infantry units\"," +
                "\"id\":0" +
            "}]," +
            "\"comments\":[]," +
            "\"name\":\"Redneck\"," +
            "\"description\":\"A skilled faction\"," +
            "\"illustration\":\"/api/faction/documents/faction0-1739879980962.png\"," +
            "\"id\":0,\"version\":0," +
            "\"status\":\"pnd\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /factions/redneck_faction.png", outputStreamToString(factionOutputStream));
        Assert.assertEquals("Content of /factions/redneck_faction-0.png", outputStreamToString(sheetOutputStream));
        Assert.assertEquals("Content of /factions/icon-redneck_faction-0.png", outputStreamToString(iconOutputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void createNewFactionWithoutAnIllustration() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Faction);
            Faction faction = (Faction) entity;
            Assert.assertEquals("Redneck", faction.getName());
            Assert.assertEquals(FactionStatus.PENDING, faction.getStatus());
            Assert.assertEquals("A skilled faction", faction.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.create(params(),
            Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction' " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"sheets\":[]," +
            "\"comments\":[]," +
            "\"name\":\"Redneck\"," +
            "\"description\":\"A skilled faction\"," +
            "\"illustration\":\"\"," +
            "\"id\":0," +
            "\"version\":0," +
            "\"status\":\"pnd\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewFactionWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            factionController.create(params(), Json.createJsonFromString("{" +
                    " 'name':'Redneck'," +
                    " 'status':'pnd'," +
                    " 'description':'A skilled faction' " +
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
    public void failToCreateAFactionBecauseMoreThanOneImageFileAreReceived() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            return true;
        });
        dataManager.register("flush", null, null, null);
        OutputStream outputStream = new ByteArrayOutputStream();
        for (int index=0; index<6; index ++) {
            platformManager.register("getOutputStream", outputStream, null);
        }
        securityManager.doConnect("admin", 0);
        try {
            factionController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("redneck", "redneck_faction.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction.png").getBytes())),
                    new FileSpecification("redneck_b", "redneck_faction_b.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction_b.png").getBytes())),
                    new FileSpecification("redneck-0", "redneck_faction-0.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction-0.png").getBytes())),
                    new FileSpecification("icon-redneck-0", "icon-redneck_faction-0.png", "png",
                        new ByteArrayInputStream(("Content of /factions/icon-redneck_faction-0.png").getBytes())),
                    new FileSpecification("redneck_b-0", "redneck_faction_b-0.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction_b-0.png").getBytes())),
                    new FileSpecification("icon-redneck_b-0", "icon-redneck_faction_b-0.png", "png",
                        new ByteArrayInputStream(("Content of /factions/icon-redneck_faction_b-0.png").getBytes())),
                    new FileSpecification("redneck-3", "redneck_faction-3.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction-3.png").getBytes())),
                    new FileSpecification("icon-redneck-3", "icon-redneck_faction-3.png", "png",
                        new ByteArrayInputStream(("Content of /factions/icon-redneck_faction-3.png").getBytes()))
            }), Json.createJsonFromString("{" +
                    " 'name':'Redneck'," +
                    " 'status':'pnd'," +
                    " 'description':'A skilled faction', " +
                    " 'sheets': [{ " +
                        "'ordinal':0, " +
                        "'name':'infantry', " +
                        "'description':'infantry units'" +
                    " }, {" +
                        "'ordinal':1, " +
                        "'name':'cavalry', " +
                        "'description':'cavalry units'" +
                    " }] " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals(
                "Only one Faction file must be loaded.\n" +
                "Only one Icon file must be loaded for sheet 0.\n" +
                "Only one Path file must be loaded.\n" +
                "No sheet with number 3 found for Icon.\n" +
                "No sheet with number 3 found for Path.\n" +
                "Sheet number 1 does not have an icon.\n" +
                "Sheet number 1 does not have a path.\n", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingFaction() {
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
            return (entity instanceof Faction);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            factionController.create(params(), Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Faction with name (Redneck) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForFactionProposal() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.propose(params(), Json.createJsonFromString(
                "{ 'sheets': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"required\"," +
                "\"sheets-name\":\"required\"," +
                "\"name\":\"required\"," +
                "\"description\":\"required\"," +
                "\"sheets-ordinal\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForFactionProposal() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.propose(params(), Json.createJsonFromString("{" +
                " 'name':'n'," +
                " 'description':'d'," +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'n', " +
                    "'description':'d'" +
                " }], " +
                "'newComment':'n'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must be greater of equals to 2\"," +
                "\"sheets-name\":\"must be greater of equals to 2\"," +
                "\"newComment\":\"must be greater of equals to 2\"," +
                "\"name\":\"must be greater of equals to 2\"," +
                "\"description\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForFactionProposal() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.propose(params(), Json.createJsonFromString(  "{" +
                " 'name':'" + generateText("n", 201) + "'," +
                " 'description':'" + generateText("d", 20000) + "', " +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'" + generateText("n", 201) +"', " +
                    "'description':'" + generateText("d", 20000) +"'" +
                " }], " +
                "'newComment':'" + generateText("c", 20000) + "'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must not be greater than 19995\"," +
                "\"sheets-name\":\"must not be greater than 200\"," +
                "\"newComment\":\"must not be greater than 200\"," +
                "\"name\":\"must not be greater than 200\"," +
                "\"description\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForFactionProposal() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.propose(params(), Json.createJsonFromString("{ " +
                "'name':'...', 'status':'???', 'description': 0, " +
                "'sheets': [ { 'name':'...', 'description': 0, ordinal:'un' } ] " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"not a valid string\"," +
                "\"sheets-name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"sheets-ordinal\":\"not a valid integer\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewFactionProposal() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
            "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Faction);
            Faction faction = (Faction) entity;
            Assert.assertEquals("Redneck", faction.getName());
            Assert.assertEquals(FactionStatus.PROPOSED, faction.getStatus());
            Assert.assertEquals("A skilled faction", faction.getDescription());
            return true;
        });
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream factionOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", factionOutputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = factionController.propose(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("redneck", "redneck_faction.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction.png").getBytes())),
                new FileSpecification("redneck-0", "redneck_faction-0.png", "png",
                        new ByteArrayInputStream(("Content of /factions/redneck_faction-0.png").getBytes())),
                new FileSpecification("icon-redneck-0", "icon-redneck_faction-0.png", "png",
                        new ByteArrayInputStream(("Content of /factions/icon-redneck_faction-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'name':'Redneck'," +
            " 'description':'A skilled faction', " +
            " 'sheets': [{ " +
                "'ordinal':0, " +
                "'name':'infantry', " +
                "'description':'infantry units'" +
            " }], " +
            " 'newComment':'A long awaited proposal' " +
        "}"));
        Assert.assertEquals("{" +
            "\"sheets\":[{" +
                "\"path\":\"/api/faction/documents/sheet0_0-1739879980962.png\"," +
                "\"name\":\"infantry\"," +
                "\"icon\":\"/api/faction/documents/sheeticon0_0-1739879980962.png\"," +
                "\"description\":\"infantry units\",\"id\":0" +
            "}]," +
            "\"comments\":[{" +
                "\"date\":\"2025-02-18\"," +
                "\"id\":0," +
                "\"text\":\"A long awaited proposal\"," +
                "\"version\":0" +
            "}]," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
            "\"name\":\"Redneck\"," +
            "\"description\":\"A skilled faction\"," +
            "\"illustration\":\"/api/faction/documents/faction0-1739879980962.png\"," +
            "\"id\":0,\"version\":0," +
            "\"status\":\"prp\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /factions/redneck_faction.png", outputStreamToString(factionOutputStream));
        Assert.assertEquals("Content of /factions/redneck_faction-0.png", outputStreamToString(sheetOutputStream));
        Assert.assertEquals("Content of /factions/icon-redneck_faction-0.png", outputStreamToString(iconOutputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAnAlreadyExistingFaction() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof Faction);
            }
        );
        securityManager.doConnect("someone", 0);
        try {
            factionController.propose(params(), Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'description':'A skilled faction', " +
                " 'newComment':'A long awaited proposal' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Faction with name (Redneck) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAFactionFromAnUnknownAuthor() {
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);
        securityManager.doConnect("someone", 0);
        try {
            factionController.propose(params(), Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'description':'A skilled faction', " +
                " 'newComment':'A long awaited proposal' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Account with Login name someone", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAFactionWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Faction ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForFactionUpdate() {
        dataManager.register("find",
            new Faction(),  null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'comments': [{}], 'sheets': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"required\"," +
                "\"comments-version\":\"required\"," +
                "\"sheets-name\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"sheets-ordinal\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForFactionUpdate() {
        dataManager.register("find",
            new Faction(),  null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'name':'n'," +
                " 'description':'d'," +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'n', " +
                    "'description':'d'" +
                "  }] " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must be greater of equals to 2\"," +
                "\"sheets-name\":\"must be greater of equals to 2\"," +
                "\"name\":\"must be greater of equals to 2\"," +
                "\"description\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForFactionUpdate() {
        dataManager.register("find",
                setEntityId(new Faction().setName("Magic"), 1L),
                null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        dataManager.register("flush", null, null);
        try {
            factionController.update(params("id", "1"), Json.createJsonFromString("{" +
            " 'name':'" + generateText("n", 201) + "'," +
            " 'description':'" + generateText("d", 20000) + "', " +
            " 'sheets': [{ " +
            " 'ordinal':0, " +
                "'name':'" + generateText("n", 201) +"', " +
                "'description':'" + generateText("d", 20000) +"'" +
            "  }] " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must not be greater than 19995\"," +
                "\"sheets-name\":\"must not be greater than 200\"," +
                "\"name\":\"must not be greater than 200\"," +
                "\"description\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForFactionUpdate() {
        dataManager.register("find",
                setEntityId(new Faction().setName("Magic"), 1L),
                null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'name':'...', 'status':'???', 'description': 0, " +
                "'sheets': [ { 'name':'...', 'description': 0, ordinal:'un' } ] " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"not a valid string\"," +
                "\"sheets-name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"sheets-ordinal\":\"not a valid integer\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void updateAFaction() {
        Faction faction = (Faction)setEntityId(new Faction().setName("The Mercenaries"), 1L);
        dataManager.register("find", faction, null, Faction.class, 1L);
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream factionOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", factionOutputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        platformManager.setTime(1739879980962L);
        Json result = factionController.update(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("redneck", "redneck_faction.png", "png",
                    new ByteArrayInputStream(("Content of /factions/redneck_faction.png").getBytes())),
                new FileSpecification("redneck-0", "redneck_faction-0.png", "png",
                    new ByteArrayInputStream(("Content of /factions/redneck_faction-0.png").getBytes())),
                new FileSpecification("icon-redneck-0", "icon-redneck_faction-0.png", "png",
                    new ByteArrayInputStream(("Content of /factions/icon-redneck_faction-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'name':'Redneck'," +
            " 'status':'pnd'," +
            " 'description':'A skilled faction', " +
            " 'sheets': [{ " +
                " 'ordinal':0, " +
                " 'name':'infantry', " +
                " 'description':'infantry units'" +
            " }] " +
        "}"));
        Assert.assertEquals("{" +
                "\"sheets\":[{" +
                    "\"path\":\"/api/faction/documents/sheet1_0-1739879980962.png\"," +
                    "\"name\":\"infantry\"," +
                    "\"icon\":\"/api/faction/documents/sheeticon1_0-1739879980962.png\"," +
                    "\"description\":\"infantry units\"," +
                    "\"id\":0" +
                "}]," +
                "\"comments\":[]," +
                "\"name\":\"Redneck\"," +
                "\"description\":\"A skilled faction\"," +
                "\"illustration\":\"/api/faction/documents/faction1-1739879980962.png\"," +
                "\"id\":1,\"version\":0," +
                "\"status\":\"pnd\"" +
            "}",
            result.toString()
        );
        Assert.assertEquals("Content of /factions/redneck_faction.png", outputStreamToString(factionOutputStream));
        Assert.assertEquals("Content of /factions/redneck_faction-0.png", outputStreamToString(sheetOutputStream));
        Assert.assertEquals("Content of /factions/icon-redneck_faction-0.png", outputStreamToString(iconOutputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAFactionAndFailPourAnUnknownReason() {
        Faction faction = (Faction)setEntityId(new Faction().setName("Magic"), 1L);
        dataManager.register("find", faction, null, Faction.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("admin", 0);
        try {
            factionController.update(params("id", "1"),
                Json.createJsonFromString("{" +
                        " 'title':'Magic'," +
                        " 'status':'pnd'," +
                        " 'category':'game'," +
                        " 'description':'A powerful feature' " +
                    "}"
                ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnUnknownFaction() {
        dataManager.register("find", null, null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Faction with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAFactionWithoutGivingItsID() {
        securityManager.doConnect("someone", 0);
        try {
            factionController.amend(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Faction ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Faction factionBelongingToSomeone() {
        return setEntityId(
            new Faction()
                .setName("The Magic")
                .setAuthor(
                    new Account()
                        .setAccess(
                            new Login()
                                .setLogin("someone")
                        )
                ),
            1L);
    }

    @Test
    public void checkMinFieldSizesForFactionAmend() {
        dataManager.register("find",
            factionBelongingToSomeone(),
            null, Faction.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            factionController.amend(params("id", "1"), Json.createJsonFromString("{" +
                " 'name':'n'," +
                " 'description':'d', " +
                " 'newComment': 'c', " +
                " 'sheets': [{ " +
                    " 'ordinal':0, " +
                    " 'name':'n', " +
                    " 'description':'d'" +
                " }] " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must be greater of equals to 2\"," +
                "\"sheets-name\":\"must be greater of equals to 2\"," +
                "\"newComment\":\"must be greater of equals to 2\"," +
                "\"name\":\"must be greater of equals to 2\"," +
                "\"description\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForFactionAmend() {
        dataManager.register("find",
            factionBelongingToSomeone(),
            null, Faction.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        try {
            factionController.amend(params("id", "1"), Json.createJsonFromString(            "{" +
                " 'name':'" + generateText("n", 201) + "'," +
                " 'description':'" + generateText("d", 20000) + "', " +
                " 'newComment': '"+ generateText("c", 20000) + "', " +
                " 'sheets': [{ " +
                    " 'ordinal':0, " +
                    " 'name':'" + generateText("n", 201) +"', " +
                    " 'description':'" + generateText("d", 20000) +"'" +
                "  }] " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"must not be greater than 19995\"," +
                "\"sheets-name\":\"must not be greater than 200\"," +
                "\"newComment\":\"must not be greater than 200\"," +
                "\"name\":\"must not be greater than 200\"," +
                "\"description\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForArticleAmend() {
        dataManager.register("find",
                setEntityId(new Faction().setName("The Magic"), 1L),
                null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.amend(params("id", "1"), Json.createJsonFromString("{ " +
                "'name':'...', 'status':'???', 'description': 0, 'newComment': 0, " +
                "'sheets': [ { 'name':'...', 'description': 0, ordinal:'un' } ] " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"sheets-description\":\"not a valid string\"," +
                "\"sheets-name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"newComment\":\"not a valid string\"," +
                "\"name\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"sheets-ordinal\":\"not a valid integer\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void amendAFaction() {
        Faction faction = factionBelongingToSomeone();
        dataManager.register("find", faction, null, Faction.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream factionOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", factionOutputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
    Json result = factionController.amend(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
            new FileSpecification("redneck", "redneck_faction.png", "png",
                new ByteArrayInputStream(("Content of /factions/redneck_faction.png").getBytes())),
            new FileSpecification("redneck-0", "redneck_faction-0.png", "png",
                new ByteArrayInputStream(("Content of /factions/redneck_faction-0.png").getBytes())),
            new FileSpecification("icon-redneck-0", "icon-redneck_faction-0.png", "png",
                new ByteArrayInputStream(("Content of /factions/icon-redneck_faction-0.png").getBytes()))
        }), Json.createJsonFromString("{" +
            " 'name':'Redneck'," +
            " 'status':'pnd'," +
            " 'description':'A skilled faction', " +
            " 'sheets': [{ " +
                " 'ordinal':0, " +
                " 'name':'infantry', " +
                " 'description':'infantry units'" +
            " }] " +
        "}"));
        Assert.assertEquals("{" +
                "\"sheets\":[{" +
                    "\"path\":\"/api/faction/documents/sheet1_0-1739879980962.png\"," +
                    "\"name\":\"infantry\"," +
                    "\"icon\":\"/api/faction/documents/sheeticon1_0-1739879980962.png\"," +
                    "\"description\":\"infantry units\"," +
                    "\"id\":0" +
                "}]," +
                "\"comments\":[]," +
                "\"name\":\"Redneck\"," +
                "\"description\":\"A skilled faction\"," +
                "\"illustration\":\"/api/faction/documents/faction1-1739879980962.png\"," +
                "\"id\":1,\"version\":0" +
            "}",
            result.toString()
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void checkThatAnAdminIsAllowedToAmendAFaction() {
        Faction faction = factionBelongingToSomeone();
        dataManager.register("find", faction, null, Faction.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "admin");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        platformManager.setTime(1739879980962L);
        Json result = factionController.amend(params("id", "1"),
            Json.createJsonFromString("{" +
            " 'name':'Redneck'," +
            " 'status':'pnd'," +
            " 'description':'A skilled faction' " +
            "}"));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAFactionAndFailPourAnUnknownReason() {
        Faction faction = factionBelongingToSomeone();
        dataManager.register("find", faction, null, Faction.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("someone", 0);
        try {
            factionController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction' " +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAFactionByAnUnknownAccount() {
        Faction faction = factionBelongingToSomeone();
        dataManager.register("find", faction, null, Faction.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);        securityManager.doConnect("someone", 0);
        try {
            factionController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction' " +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Account with Login name someone", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAnUnknownFaction() {
        dataManager.register("find", null, null, Faction.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            factionController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                " 'name':'Redneck'," +
                " 'status':'pnd'," +
                " 'description':'A skilled faction' " +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Faction with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListFactionsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Faction faction0() {
        return setEntityId(new Faction()
                .setName("Redneck")
                .setStatus(FactionStatus.PROPOSED)
                .setDescription("Description of Redneck"),
        1L);
    }

    Faction faction1() {
        return setEntityId(new Faction()
            .setName("Redneck")
            .setStatus(FactionStatus.LIVE)
            .setDescription("Description of Redneck"),
        1L);
    }

    Faction faction2() {
        return setEntityId(new Faction()
            .setName("Orc")
            .setStatus(FactionStatus.LIVE)
            .setDescription("Description of Orc"),
        2L);
    }

    @Test
    public void listAllFactions() {
        dataManager.register("createQuery", null, null,
                "select count(f) from Faction f");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
    "select f from Faction f " +
            "left outer join fetch f.author a " +
            "left outer join fetch a.access w"
        );
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                faction1(), faction2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.getAll(params("page", "0"), null);
        Assert.assertEquals("{" +
        "\"count\":2,\"pageSize\":10,\"page\":0," +
        "\"factions\":[{" +
            "\"name\":\"Redneck\",\"description\":\"Description of Redneck\",\"illustration\":\"\"," +
            "\"id\":1,\"version\":0,\"status\":\"live\"" +
        "},{" +
            "\"name\":\"Orc\",\"description\":\"Description of Orc\",\"illustration\":\"\"," +
            "\"id\":2,\"version\":0,\"status\":\"live\"" +
        "}]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listFactionsWithASearchPattern() {
        dataManager.register("createQuery", null, null,
            "select count(f) from Faction f " +
                "where fts('pg_catalog.english', f.name||' '||f.description||' '||f.document.text " +
                    "||' '||f.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Redneck");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select f from Faction f " +
                "left outer join fetch f.author a " +
                "left outer join fetch a.access w where " +
                "fts('pg_catalog.english', f.name||' '||f.description||' '||f.document.text " +
                    "||' '||f.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Redneck");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Faction magicFaction = new Faction().setName("Redneck");
        dataManager.register("getResultList", arrayList(
                faction1(), faction2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.getAll(params("page", "0", "search", "Redneck"), null);
        Assert.assertEquals("{" +
        "\"count\":2,\"pageSize\":10,\"page\":0," +
        "\"factions\":[{" +
            "\"name\":\"Redneck\",\"description\":\"Description of Redneck\",\"illustration\":\"\"," +
            "\"id\":1,\"version\":0,\"status\":\"live\"" +
        "},{" +
            "\"name\":\"Orc\",\"description\":\"Description of Orc\",\"illustration\":\"\"," +
            "\"id\":2,\"version\":0,\"status\":\"live\"" +
        "}]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllFactionsWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            factionController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAFactionByTitleWithoutGivingTheName() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.getByName(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Faction's name is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneFactionByName() {
        dataManager.register("createQuery", null, null,
            "select f from Faction f join fetch f.firstSheet s " +
                "join fetch f.author w " +
                "join fetch w.access where f.name=:name");
        dataManager.register("setParameter", null, null,"name", "Redneck");
        dataManager.register("getSingleResult",
                faction1(), null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.getByName(params("name", "Redneck"), null);
        Assert.assertEquals("{" +
                "\"sheets\":[],\"comments\":[]," +
                "\"name\":\"Redneck\",\"description\":\"Description of Redneck\"," +
                "\"illustration\":\"\"," +
                "\"id\":1,\"version\":0,\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByNameAnUnknownFaction() {
        dataManager.register("createQuery", null, null,
    "select f from Faction f " +
            "join fetch f.firstSheet s " +
            "join fetch f.author w " +
            "join fetch w.access " +
            "where f.name=:name");
        dataManager.register("setParameter", null, null,"name", "Redneck");
        dataManager.register("getSingleResult", null, null);
        securityManager.doConnect("admin", 0);
        try {
            factionController.getByName(params("name", "Redneck"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Faction with name Redneck", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByNameAFactionWithBadCredentials() {
        dataManager.register("createQuery", null, null,
            "select f from Faction f join fetch f.firstSheet s " +
            "join fetch f.author w " +
            "join fetch w.access " +
            "where f.name=:name");
        dataManager.register("setParameter", null, null,"name", "Redneck");
        dataManager.register("getSingleResult",
                faction1(), null);
        securityManager.doConnect("someoneelse", 0);
        try {
            factionController.getByName(params("name", "Redneck"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getLiveFactions() {
        dataManager.register("createQuery", null, null,
                "select f from Faction f where f.status=:status");
        dataManager.register("setParameter", null, null, "status", FactionStatus.LIVE);
        dataManager.register("getResultList", arrayList(
                faction1(), faction2()
        ), null);
        Json result = factionController.getLive(params(), null);
        Assert.assertEquals("[{" +
            "\"name\":\"Redneck\",\"description\":\"Description of Redneck\"," +
            "\"illustration\":\"\"," +
            "\"id\":1,\"version\":0," +
            "\"status\":\"live\"" +
        "},{" +
            "\"name\":\"Orc\",\"description\":\"Description of Orc\"," +
            "\"illustration\":\"\"," +
            "\"id\":2,\"version\":0," +
            "\"status\":\"live\"" +
        "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAFactionWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.getFactionWithComments(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Faction ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneFactionById() {
        dataManager.register("find",
                faction1(), null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = factionController.getFactionWithComments(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"sheets\":[],\"comments\":[]," +
                "\"name\":\"Redneck\",\"description\":\"Description of Redneck\"," +
                "\"illustration\":\"\"," +
                "\"id\":1,\"version\":0,\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownFaction() {
        dataManager.register("find", null, null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.getFactionWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Faction with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAFactionWithBadCredentials() {
        dataManager.register("find",
                faction1(), null, Faction.class, 1L);
        securityManager.doConnect("someoneelse", 0);
        try {
            factionController.getFactionWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAPublishedFactionWithoutGivingItsID() {
        try {
            factionController.getPublishedFaction(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Faction ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getAPublishedFaction() {
        dataManager.register("find",
                faction1(), null, Faction.class, 1L);
        Json result = factionController.getPublishedFaction(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"sheets\":[]," +
                "\"name\":\"Redneck\",\"description\":\"Description of Redneck\"," +
                "\"illustration\":\"\"," +
                "\"id\":1" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownPublishedFaction() {
        dataManager.register("find", null, null, Faction.class, 1L);
        try {
            factionController.getPublishedFaction(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Faction with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindANotLiveFactionWithAsPublished() {
        dataManager.register("find",
                faction0(), null, Faction.class, 1L);
        try {
            factionController.getPublishedFaction(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Faction is not live.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAFactionWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            factionController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Faction ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAFaction() {
        dataManager.register("find", faction1(), null, Faction.class, 1L);
        Ref<Faction> rFaction = new Ref<>();
        dataManager.register("merge", (Supplier)()->rFaction.get(), null,
                (Predicate) entity->{
                    if (!(entity instanceof Faction)) return false;
                    rFaction.set((Faction) entity);
                    if (rFaction.get().getId() != 1L) return false;
                    return true;
                }
        );
        dataManager.register("remove", null, null,
                (Predicate) entity->{
                    if (!(entity instanceof Faction)) return false;
                    Faction faction = (Faction) entity;
                    if (faction.getId() != 1L) return false;
                    return true;
                }
        );
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownFaction() {
        dataManager.register("find", null, null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Faction with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAFactionAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
                new PersistenceException("Some Reason"), Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAFactionWithBadCredentials() {
        dataManager.register("find",
                faction1(),null);
        securityManager.doConnect("someoneelse", 0);
        try {
            factionController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAFactionStatusUpdate() {
        dataManager.register("find",
                faction1(), null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsForAFactionSStatusUpdate() {
        dataManager.register("find",
                faction1(),null, Faction.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            factionController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':'1234', 'status':'???'}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                    "\"id\":\"Not a valid id\"," +
                    "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
                    "}", sce.getMessage());
        }
    }

    @Test
    public void upadteAFactionSStatus() {
        dataManager.register("find",
                faction1(), null, Faction.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = factionController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
                "\"sheets\":[],\"comments\":[]," +
                "\"name\":\"Redneck\",\"description\":\"Description of Redneck\"," +
                "\"illustration\":\"\"," +
                "\"id\":1,\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAFactionSStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            factionController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void failToUpdateAnArticleStatusForUnknownReason() {
        dataManager.register("find",
                faction1(), null, Faction.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            factionController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void chargeFactionImage() {
        platformManager.register("getInputStream",
                new ByteArrayInputStream(("Content of /factions/faction.png").getBytes()),
                null,  "/factions/faction.png");
        FileSpecification image = factionController.getImage(params("imagename", "faction-10123456.png"));
        Assert.assertEquals("faction.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("faction.png", image.getFileName());
        Assert.assertEquals("Content of /factions/faction.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeFactionImage() {
        platformManager.register("getInputStream", null,
                new PersistenceException("For Any Reason..."),  "/factions/faction.png");
        try {
            factionController.getImage(params("imagename", "faction-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }
}
