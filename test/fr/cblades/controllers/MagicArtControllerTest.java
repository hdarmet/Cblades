package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.MagicArtController;
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

public class MagicArtControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    MagicArtController magicArtController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        magicArtController = new MagicArtController();
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
    public void checkRequiredFieldsForMagicArtCreation() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.create(params(), Json.createJsonFromString(
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
    public void checkMinFieldSizesForMagicArtCreation() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.create(params(), Json.createJsonFromString("{" +
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
    public void checkMaxFieldSizesForMagicArtCreation() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.create(params(), Json.createJsonFromString("{" +
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
    public void checkFieldValidityForMagicArtCreation() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.create(params(), Json.createJsonFromString("{ " +
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
            "}",
            sce.getMessage());
        }
    }

    @Test
    public void createNewMagicArtWithIllustration() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof MagicArt);
            MagicArt magicArt = (MagicArt) entity;
            Assert.assertEquals("Arcanic", magicArt.getName());
            Assert.assertEquals(MagicArtStatus.PENDING, magicArt.getStatus());
            Assert.assertEquals("A skilled magic art", magicArt.getDescription());
            return true;
        });
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream magicArtOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", magicArtOutputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("arcanic", "arcanic_magicArt.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt.png").getBytes())),
                new FileSpecification("arcanic-0", "arcanic_magicArt-0.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt-0.png").getBytes())),
                new FileSpecification("icon-arcanic-0", "icon-arcanic_magicArt-0.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'name':'Arcanic'," +
            " 'status':'pnd'," +
            " 'description':'A skilled magic art', " +
            " 'sheets': [{ " +
                "'ordinal':0, " +
                "'name':'infantry', " +
                "'description':'infantry units'" +
            " }] " +
        "}"));
        Assert.assertEquals("{" +
            "\"sheets\":[{" +
                "\"path\":\"/api/magicart/documents/sheet0_0-1739879980962.png\"," +
                "\"name\":\"infantry\"," +
                "\"icon\":\"/api/magicart/documents/sheeticon0_0-1739879980962.png\"," +
                "\"description\":\"infantry units\",\"id\":0" +
            "}]," +
            "\"comments\":[]," +
            "\"name\":\"Arcanic\",\"description\":\"A skilled magic art\"," +
            "\"illustration\":\"/api/magicart/documents/magicart0-1739879980962.png\"," +
            "\"id\":0,\"version\":0,\"status\":\"pnd\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /magicArts/arcanic_magicArt.png", outputStreamToString(magicArtOutputStream));
        Assert.assertEquals("Content of /magicArts/arcanic_magicArt-0.png", outputStreamToString(sheetOutputStream));
        Assert.assertEquals("Content of /magicArts/icon-arcanic_magicArt-0.png", outputStreamToString(iconOutputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void createNewMagicArtWithoutAnIllustration() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof MagicArt);
            MagicArt magicArt = (MagicArt) entity;
            Assert.assertEquals("Arcanic", magicArt.getName());
            Assert.assertEquals(MagicArtStatus.PENDING, magicArt.getStatus());
            Assert.assertEquals("A skilled magic art", magicArt.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.create(params(),
            Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magic art' " +
                "}"
            ));
        Assert.assertEquals("{" +
            "\"sheets\":[],\"comments\":[]," +
            "\"name\":\"Arcanic\"," +
            "\"description\":\"A skilled magic art\"," +
            "\"illustration\":\"\"," +
            "\"id\":0,\"version\":0," +
            "\"status\":\"pnd\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewMagicArtWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.create(params(), Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magicArt' " +
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
    public void failToCreateAMagicArtBecauseMoreThanOneImageFileAreReceived() {
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
            magicArtController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("arcanic", "arcanic_magicArt.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt.png").getBytes())),
                    new FileSpecification("arcanic_b", "arcanic_magicArt_b.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt_b.png").getBytes())),
                    new FileSpecification("arcanic-0", "arcanic_magicArt-0.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt-0.png").getBytes())),
                    new FileSpecification("icon-arcanic-0", "icon-arcanic_magicArt-0.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt-0.png").getBytes())),
                    new FileSpecification("arcanic_b-0", "arcanic_magicArt_b-0.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt_b-0.png").getBytes())),
                    new FileSpecification("icon-arcanic_b-0", "icon-arcanic_magicArt_b-0.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt_b-0.png").getBytes())),
                    new FileSpecification("arcanic-3", "arcanic_magicArt-3.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt-3.png").getBytes())),
                    new FileSpecification("icon-arcanic-3", "icon-arcanic_magicArt-3.png", "png",
                        new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt-3.png").getBytes()))
                }), Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magicArt', " +
                " 'sheets': [{ " +
                    "'ordinal':0, " +
                    "'name':'Magic blade', " +
                    "'description':'gives magic to a blade'" +
                " }, {" +
                    "'ordinal':1, " +
                    "'name':'Protect from magic', " +
                    "'description':'protects from a magic attack'" +
                " }] " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals(
        "Only one MagicArt file must be loaded.\n" +
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
    public void tryToCreateAnAlreadyExistingMagicArt() {
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof MagicArt);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.create(params(), Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magic art' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Magic Art with name (Arcanic) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForMagicArtProposal() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.propose(params(), Json.createJsonFromString(
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
    public void checkMinFieldSizesForMagicArtProposal() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.propose(params(), Json.createJsonFromString("{" +
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
    public void checkMaxFieldSizesForMagicArtProposal() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.propose(params(), Json.createJsonFromString(  "{" +
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
    public void checkFieldValidityForMagicArtProposal() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.propose(params(), Json.createJsonFromString("{ " +
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
    public void createNewMagicArtProposal() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof MagicArt);
            MagicArt magicArt = (MagicArt) entity;
            Assert.assertEquals("Arcanic", magicArt.getName());
            Assert.assertEquals(MagicArtStatus.PROPOSED, magicArt.getStatus());
            Assert.assertEquals("A skilled magicArt", magicArt.getDescription());
            return true;
        });
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream magicArtOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", magicArtOutputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = magicArtController.propose(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("arcanic", "arcanic_magicArt.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt.png").getBytes())),
                new FileSpecification("arcanic-0", "arcanic_magicArt-0.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt-0.png").getBytes())),
                new FileSpecification("icon-arcanic-0", "icon-arcanic_magicArt-0.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'name':'Arcanic'," +
            " 'description':'A skilled magicArt', " +
            " 'sheets': [{ " +
                "'ordinal':0, " +
                "'name':'infantry', " +
                "'description':'infantry units'" +
            " }], " +
            " 'newComment':'A long awaited proposal' " +
        "}"));
        Assert.assertEquals("{" +
            "\"sheets\":[{" +
                "\"path\":\"/api/magicart/documents/sheet0_0-1739879980962.png\"," +
                "\"name\":\"infantry\"," +
                "\"icon\":\"/api/magicart/documents/sheeticon0_0-1739879980962.png\"," +
                "\"description\":\"infantry units\",\"id\":0" +
            "}]," +
            "\"comments\":[{" +
                "\"date\":\"2025-02-18\"," +
                "\"id\":0," +
                "\"text\":\"A long awaited proposal\"," +
                "\"version\":0" +
            "}]," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
            "\"name\":\"Arcanic\"," +
            "\"description\":\"A skilled magicArt\"," +
            "\"illustration\":\"/api/magicart/documents/magicart0-1739879980962.png\"," +
            "\"id\":0,\"version\":0," +
            "\"status\":\"prp\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /magicArts/arcanic_magicArt.png", outputStreamToString(magicArtOutputStream));
        Assert.assertEquals("Content of /magicArts/arcanic_magicArt-0.png", outputStreamToString(sheetOutputStream));
        Assert.assertEquals("Content of /magicArts/icon-arcanic_magicArt-0.png", outputStreamToString(iconOutputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAnAlreadyExistingMagicArt() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null,
                new EntityExistsException("Entity already Exists"),
                (Predicate) entity->{
                    return (entity instanceof MagicArt);
                }
        );
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.propose(params(), Json.createJsonFromString("{" +
                    " 'name':'Arcanic'," +
                    " 'description':'A skilled magicArt', " +
                    " 'newComment':'A long awaited proposal' " +
                    "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Magic Art with name (Arcanic) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAMagicArtFromAnUnknownAuthor() {
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.propose(params(), Json.createJsonFromString("{" +
                    " 'name':'Arcanic'," +
                    " 'description':'A skilled magicArt', " +
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
    public void tryToUpdateAMagicArtWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Magic Art ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForMagicArtUpdate() {
        dataManager.register("find",
                new MagicArt(),  null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.update(params("id", "1"), Json.createJsonFromString(
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
    public void checkMinFieldSizesForMagicArtUpdate() {
        dataManager.register("find",
                new MagicArt(),  null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.update(params("id", "1"), Json.createJsonFromString("{" +
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
    public void checkMaxFieldSizesForMagicArtUpdate() {
        dataManager.register("find",
                setEntityId(new MagicArt().setName("Magic"), 1L),
                null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        dataManager.register("flush", null, null);
        try {
            magicArtController.update(params("id", "1"), Json.createJsonFromString("{" +
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
    public void checkFieldValidityForMagicArtUpdate() {
        dataManager.register("find",
                setEntityId(new MagicArt().setName("Magic"), 1L),
                null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.update(params("id", "1"), Json.createJsonFromString("{ " +
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
    public void updateAMagicArt() {
        MagicArt magicArt = (MagicArt)setEntityId(new MagicArt().setName("The Mercenaries"), 1L);
        dataManager.register("find", magicArt, null, MagicArt.class, 1L);
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream magicArtOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", magicArtOutputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        platformManager.setTime(1739879980962L);
        Json result = magicArtController.update(params("id", "1",
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                        new FileSpecification("arcanic", "arcanic_magicArt.png", "png",
                                new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt.png").getBytes())),
                        new FileSpecification("arcanic-0", "arcanic_magicArt-0.png", "png",
                                new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt-0.png").getBytes())),
                        new FileSpecification("icon-arcanic-0", "icon-arcanic_magicArt-0.png", "png",
                                new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt-0.png").getBytes()))
                }
        ), Json.createJsonFromString("{" +
            " 'name':'Arcanic'," +
            " 'status':'pnd'," +
            " 'description':'A skilled magicArt', " +
            " 'sheets': [{ " +
            " 'ordinal':0, " +
            " 'name':'infantry', " +
            " 'description':'infantry units'" +
            " }] " +
        "}"));
        Assert.assertEquals("{" +
                "\"sheets\":[{" +
                    "\"path\":\"/api/magicart/documents/sheet1_0-1739879980962.png\"," +
                    "\"name\":\"infantry\"," +
                    "\"icon\":\"/api/magicart/documents/sheeticon1_0-1739879980962.png\"," +
                    "\"description\":\"infantry units\",\"id\":0" +
                "}]," +
                "\"comments\":[]," +
                "\"name\":\"Arcanic\"," +
                "\"description\":\"A skilled magicArt\"," +
                "\"illustration\":\"/api/magicart/documents/magicart1-1739879980962.png\"," +
                "\"id\":1,\"version\":0," +
                "\"status\":\"pnd\"" +
            "}",
            result.toString()
        );
        Assert.assertEquals("Content of /magicArts/arcanic_magicArt.png", outputStreamToString(magicArtOutputStream));
        Assert.assertEquals("Content of /magicArts/arcanic_magicArt-0.png", outputStreamToString(sheetOutputStream));
        Assert.assertEquals("Content of /magicArts/icon-arcanic_magicArt-0.png", outputStreamToString(iconOutputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAMagicArtAndFailPourAnUnknownReason() {
        MagicArt magicArt = (MagicArt)setEntityId(new MagicArt().setName("Magic"), 1L);
        dataManager.register("find", magicArt, null, MagicArt.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.update(params("id", "1"),
                Json.createJsonFromString("{" +
                    " 'title':'Magic'," +
                    " 'status':'pnd'," +
                    " 'category':'game'," +
                    " 'description':'A powerful feature' " +
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
    public void tryToUpdateAnUnknownMagicArt() {
        dataManager.register("find", null, null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magicArt' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Magic Art with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAMagicArtWithoutGivingItsID() {
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.amend(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Magic Art ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    MagicArt magicArtBelongingToSomeone() {
        return setEntityId(
            new MagicArt()
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
    public void checkMinFieldSizesForMagicArtAmend() {
        dataManager.register("find",
            magicArtBelongingToSomeone(),
            null, MagicArt.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.amend(params("id", "1"), Json.createJsonFromString("{" +
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
    public void checkMaxFieldSizesForMagicArtAmend() {
        dataManager.register("find",
            magicArtBelongingToSomeone(),
            null, MagicArt.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.amend(params("id", "1"), Json.createJsonFromString(            "{" +
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
            setEntityId(new MagicArt().setName("The Magic"), 1L),
            null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.amend(params("id", "1"), Json.createJsonFromString("{ " +
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
    public void amendAMagicArt() {
        MagicArt magicArt = magicArtBelongingToSomeone();
        dataManager.register("find", magicArt, null, MagicArt.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        OutputStream sheetOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", sheetOutputStream, null);
        OutputStream iconOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", iconOutputStream, null);
        OutputStream magicArtOutputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", magicArtOutputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = magicArtController.amend(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("arcanic", "arcanic_magicArt.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt.png").getBytes())),
                new FileSpecification("arcanic-0", "arcanic_magicArt-0.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/arcanic_magicArt-0.png").getBytes())),
                new FileSpecification("icon-arcanic-0", "icon-arcanic_magicArt-0.png", "png",
                    new ByteArrayInputStream(("Content of /magicArts/icon-arcanic_magicArt-0.png").getBytes()))
            }), Json.createJsonFromString("{" +
            " 'name':'Arcanic'," +
            " 'status':'pnd'," +
            " 'description':'A skilled magicArt', " +
            " 'sheets': [{ " +
                " 'ordinal':0, " +
                " 'name':'infantry', " +
                " 'description':'infantry units'" +
            " }] " +
        "}"));
        Assert.assertEquals("{" +
                "\"sheets\":[{" +
                    "\"path\":\"/api/magicart/documents/sheet1_0-1739879980962.png\"," +
                    "\"name\":\"infantry\"," +
                    "\"icon\":\"/api/magicart/documents/sheeticon1_0-1739879980962.png\"," +
                    "\"description\":\"infantry units\"," +
                    "\"id\":0" +
                "}]," +
                "\"comments\":[]," +
                "\"name\":\"Arcanic\"," +
                "\"description\":\"A skilled magicArt\"," +
                "\"illustration\":\"/api/magicart/documents/magicart1-1739879980962.png\"," +
                "\"id\":1,\"version\":0,\"status\":\"pnd\"" +
            "}",
            result.toString()
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void checkThatAnAdminIsAllowedToAmendAMagicArt() {
        MagicArt magicArt = magicArtBelongingToSomeone();
        dataManager.register("find", magicArt, null, MagicArt.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "admin");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        platformManager.setTime(1739879980962L);
        magicArtController.amend(params("id", "1"),
            Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magicArt' " +
            "}")
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAMagicArtAndFailPourAnUnknownReason() {
        MagicArt magicArt = magicArtBelongingToSomeone();
        dataManager.register("find", magicArt, null, MagicArt.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                    " 'name':'Arcanic'," +
                    " 'status':'pnd'," +
                    " 'description':'A skilled magicArt' " +
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
    public void tryToAmendAMagicArtByAnUnknownAccount() {
        MagicArt magicArt = magicArtBelongingToSomeone();
        dataManager.register("find", magicArt, null, MagicArt.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);        securityManager.doConnect("someone", 0);
        try {
            magicArtController.amend(params("id", "1"),
            Json.createJsonFromString("{" +
                " 'name':'Arcanic'," +
                " 'status':'pnd'," +
                " 'description':'A skilled magicArt' " +
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
    public void tryToAmendAnUnknownMagicArt() {
        dataManager.register("find", null, null, MagicArt.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                    " 'name':'Arcanic'," +
                    " 'status':'pnd'," +
                    " 'description':'A skilled magicArt' " +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Magic Art with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListMagicArtsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    MagicArt magicArt0() {
        return setEntityId(new MagicArt()
                .setName("Arcanic")
                .setStatus(MagicArtStatus.PROPOSED)
                .setDescription("Description of Arcanic"),
        1L);
    }

    MagicArt magicArt1() {
        return setEntityId(new MagicArt()
                .setName("Arcanic")
                .setStatus(MagicArtStatus.LIVE)
                .setDescription("Description of Arcanic"),
        1L);
    }

    MagicArt magicArt2() {
        return setEntityId(new MagicArt()
                .setName("Orc")
                .setStatus(MagicArtStatus.LIVE)
                .setDescription("Description of Orc"),
        2L);
    }

    @Test
    public void listAllMagicArts() {
        dataManager.register("createQuery", null, null,
                "select count(m) from MagicArt m");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
        "select m from MagicArt m " +
                "left outer join fetch m.author a " +
                "left outer join fetch a.access w"
        );
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                magicArt1(), magicArt2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.getAll(params("page", "0"), null);
        Assert.assertEquals("{" +
        "\"count\":2,\"pageSize\":10," +
        "\"magicArts\":[{" +
            "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\",\"illustration\":\"\"," +
            "\"id\":1,\"version\":0,\"status\":\"live\"" +
        "},{" +
            "\"name\":\"Orc\",\"description\":\"Description of Orc\",\"illustration\":\"\"," +
            "\"id\":2,\"version\":0,\"status\":\"live\"" +
        "}],\"page\":0}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listMagicArtsWithASearchPattern() {
        dataManager.register("createQuery", null, null,
                "select count(m) from MagicArt m " +
                        "where fts('pg_catalog.english', m.name||' '||m.description||' '||m.document.text " +
                        "||' '||m.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Arcanic");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select m from MagicArt m " +
                        "left outer join fetch m.author a " +
                        "left outer join fetch a.access w where " +
                        "fts('pg_catalog.english', m.name||' '||m.description||' '||m.document.text " +
                        "||' '||m.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Arcanic");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        MagicArt magicMagicArt = new MagicArt().setName("Arcanic");
        dataManager.register("getResultList", arrayList(
                magicArt1(), magicArt2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.getAll(params("page", "0", "search", "Arcanic"), null);
        Assert.assertEquals("{" +
        "\"count\":2,\"pageSize\":10," +
        "\"magicArts\":[{" +
            "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\",\"illustration\":\"\"," +
            "\"id\":1,\"version\":0,\"status\":\"live\"" +
        "},{" +
            "\"name\":\"Orc\",\"description\":\"Description of Orc\",\"illustration\":\"\"," +
            "\"id\":2,\"version\":0,\"status\":\"live\"" +
        "}],\"page\":0}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllMagicArtsWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAMagicArtByNameWithoutGivingTheName() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getByName(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Magic Art's name is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneMagicArtByName() {
        dataManager.register("createQuery", null, null,
        "select m from MagicArt m join fetch m.firstSheet s " +
            "join fetch m.author w " +
            "join fetch w.access where m.name=:name");
        dataManager.register("setParameter", null, null,"name", "Arcanic");
        dataManager.register("getSingleResult",
            magicArt1(), null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.getByName(params("name", "Arcanic"), null);
        Assert.assertEquals("{" +
                "\"sheets\":[],\"comments\":[]," +
                "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\"," +
                "\"illustration\":\"\"," +
                "\"id\":1,\"version\":0,\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByNameAnUnknownMagicArt() {
        dataManager.register("createQuery", null, null,
        "select m from MagicArt m " +
            "join fetch m.firstSheet s " +
            "join fetch m.author w " +
            "join fetch w.access " +
            "where m.name=:name");
        dataManager.register("setParameter", null, null,"name", "Arcanic");
        dataManager.register("getSingleResult", null, null);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getByName(params("name", "Arcanic"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Magic Art with name Arcanic", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByNameAMagicArtWithBadCredentials() {
        dataManager.register("createQuery", null, null,
        "select m from MagicArt m join fetch m.firstSheet s " +
            "join fetch m.author w " +
            "join fetch w.access " +
            "where m.name=:name");
        dataManager.register("setParameter", null, null,"name", "Arcanic");
        dataManager.register("getSingleResult",
            magicArt1(), null);
        securityManager.doConnect("someoneelse", 0);
        try {
            magicArtController.getByName(params("name", "Arcanic"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getLiveMagicArts() {
        dataManager.register("createQuery", null, null,
            "select m from MagicArt m where m.status=:status");
        dataManager.register("setParameter", null, null, "status", MagicArtStatus.LIVE);
        dataManager.register("getResultList", arrayList(
                magicArt1(), magicArt2()
        ), null);
        Json result = magicArtController.getLive(params(), null);
        Assert.assertEquals("[{" +
            "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\"," +
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
    public void tryToGetAMagicArtWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getMagicArtWithComments(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Magic Art ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneMagicArtById() {
        dataManager.register("find",
            magicArt1(), null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.getMagicArtWithComments(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"sheets\":[],\"comments\":[]," +
                "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\"," +
                "\"illustration\":\"\"," +
                "\"id\":1,\"version\":0,\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownMagicArt() {
        dataManager.register("find", null, null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getMagicArtWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Magic Art with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAMagicArtWithBadCredentials() {
        dataManager.register("find",
                magicArt1(), null, MagicArt.class, 1L);
        securityManager.doConnect("someoneelse", 0);
        try {
            magicArtController.getMagicArtWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAPublishedMagicArtWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getPublishedMagicArt(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Magic Art ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getAPublishedMagicArt() {
        dataManager.register("find",
                magicArt1(), null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.getPublishedMagicArt(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"sheets\":[]," +
                "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\"," +
                "\"illustration\":\"\"," +
                "\"id\":1" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownPublishedMagicArt() {
        dataManager.register("find", null, null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.getPublishedMagicArt(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Magic Art with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindANotLiveMagicArtWithAsPublished() {
        dataManager.register("find",
                magicArt0(), null, MagicArt.class, 1L);
        try {
            magicArtController.getPublishedMagicArt(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("MagicArt is not live.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMagicArtWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Magic Art ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAMagicArt() {
        dataManager.register("find", magicArt1(), null, MagicArt.class, 1L);
        Ref<MagicArt> rMagicArt = new Ref<>();
        dataManager.register("merge", (Supplier)()->rMagicArt.get(), null,
            (Predicate) entity->{
                if (!(entity instanceof MagicArt)) return false;
                rMagicArt.set((MagicArt) entity);
                if (rMagicArt.get().getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("remove", null, null,
            (Predicate) entity->{
                if (!(entity instanceof MagicArt)) return false;
                MagicArt magicArt = (MagicArt) entity;
                if (magicArt.getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
            "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownMagicArt() {
        dataManager.register("find", null, null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Magic Art with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMagicArtAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
                new PersistenceException("Some Reason"), MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMagicArtWithBadCredentials() {
        dataManager.register("find",
                magicArt1(),null);
        securityManager.doConnect("someoneelse", 0);
        try {
            magicArtController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAMagicArtStatusUpdate() {
        dataManager.register("find",
                magicArt1(), null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsForAMagicArtSStatusUpdate() {
        dataManager.register("find",
                magicArt1(),null, MagicArt.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void upadteAMagicArtSStatus() {
        dataManager.register("find",
            magicArt1(), null, MagicArt.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = magicArtController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
                "\"sheets\":[],\"comments\":[]," +
                "\"name\":\"Arcanic\",\"description\":\"Description of Arcanic\"," +
                "\"illustration\":\"\"," +
                "\"id\":1,\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAMagicArtSStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            magicArtController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
            magicArt1(), null, MagicArt.class, 1L);
        dataManager.register("flush", null,
            new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            magicArtController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void chargeMagicArtImage() {
        platformManager.register("getInputStream",
                new ByteArrayInputStream(("Content of /magics/magicArt.png").getBytes()),
                null,  "/magics/magicArt.png");
        FileSpecification image = magicArtController.getImage(params("imagename", "magicArt-10123456.png"));
        Assert.assertEquals("magicArt.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("magicArt.png", image.getFileName());
        Assert.assertEquals("Content of /magics/magicArt.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeMagicArtImage() {
        platformManager.register("getInputStream", null,
                new PersistenceException("For Any Reason..."),  "/magics/magicArt.png");
        try {
            magicArtController.getImage(params("imagename", "magicArt-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }

}
