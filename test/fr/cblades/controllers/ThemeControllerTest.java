package fr.cblades.controllers;

import fr.cblades.StandardUsers;
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

import javax.persistence.EntityExistsException;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class ThemeControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    ThemeController themeController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        themeController = new ThemeController();
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
    public void checkRequiredFieldsForThemeCreation() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.create(params(), Json.createJsonFromString(
                    "{ 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"description\":\"required\"," +
                "\"title\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForThemeCreation() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.create(params(), Json.createJsonFromString("{" +
                " 'title':'n'," +
                " 'description':'f'" +
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
    public void checkMaxFieldSizesForThemeCreation() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.create(params(), Json.createJsonFromString("{" +
                " 'title':'" + generateText("f", 201) + "'," +
                " 'description':'" + generateText("f", 1001) + "' " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 1000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForThemeCreation() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.create(params(), Json.createJsonFromString(
                "{ 'description': '123', 'title':'...', 'status':'???', 'category':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"category\":\"??? must matches one of [game, legends, examples]\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewThemeWithIllustration() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Theme);
            Theme theme = (Theme) entity;
            Assert.assertEquals("Magic", theme.getTitle());
            Assert.assertEquals(ThemeStatus.PENDING, theme.getStatus());
            Assert.assertEquals(ThemeCategory.GAME, theme.getCategory());
            Assert.assertEquals("A powerful feature", theme.getDescription());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("theme", "theme.png", "png",
                    new ByteArrayInputStream(("Content of /theme/theme.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'status':'pnd'," +
                " 'category':'game'," +
                " 'description':'A powerful feature' " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"comments\":[]," +
            "\"description\":\"A powerful feature\"," +
            "\"illustration\":\"/api/theme/images/theme0-1739879980962.png\"," +
            "\"id\":0," +
            "\"category\":\"game\"," +
            "\"title\":\"Magic\"," +
            "\"version\":0," +
            "\"status\":\"pnd\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /theme/theme.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void createNewThemeWithoutAnIllustration() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Theme);
            Theme theme = (Theme) entity;
            Assert.assertEquals("Magic", theme.getTitle());
            Assert.assertEquals("A powerful feature", theme.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.create(params(), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'description':'A powerful feature' " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"comments\":[]," +
            "\"description\":\"A powerful feature\"," +
            "\"id\":0," +
            "\"title\":\"Magic\"," +
            "\"version\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewThemeWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            themeController.create(params(), Json.createJsonFromString("{" +
                    " 'title':'Magic'," +
                    " 'description':'A powerful feature' " +
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
    public void failToCreateAThemeBecauseMoreThanOneImageFileAreReceived() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            return true;
        });
        dataManager.register("flush", null, null, null);
        securityManager.doConnect("admin", 0);
        try {
            themeController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("magic_theme0-0", "magic_yheme0-0.png", "png",
                            new ByteArrayInputStream(("Content of /themes/magic_theme0-0.png").getBytes())),
                    new FileSpecification("magic_theme1-0", "magic_theme1-0.png", "png",
                            new ByteArrayInputStream(("Content of /themes/magic_theme1-0.png").getBytes()))
            }), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'description':'A powerful feature' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("One Theme file must be loaded.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingTheme() {
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
            return (entity instanceof Theme);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            themeController.create(params(), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'description':'A powerful feature' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Theme with title (Magic) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForThemeProposal() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.propose(params(), Json.createJsonFromString(
                "{ 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"description\":\"required\"," +
                "\"title\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForThemeProposal() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.propose(params(), Json.createJsonFromString("{" +
                " 'title':'n'," +
                " 'description':'f'" +
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
    public void checkMaxFieldSizesForThemeProposal() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.propose(params(), Json.createJsonFromString("{" +
                " 'title':'" + generateText("f", 201) + "'," +
                " 'description':'" + generateText("f", 1001) + "' " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 1000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForThemeProposal() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.propose(params(), Json.createJsonFromString(
                "{ 'description': '123', 'title':'...', 'category':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"category\":\"??? must matches one of [game, legends, examples]\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewThemeProposal() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
            "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Theme);
            Theme theme = (Theme) entity;
            Assert.assertEquals("Magic", theme.getTitle());
            Assert.assertEquals(ThemeStatus.PROPOSED, theme.getStatus());
            Assert.assertEquals(ThemeCategory.GAME, theme.getCategory());
            Assert.assertEquals("A powerful feature", theme.getDescription());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = themeController.propose(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("theme", "theme.png", "png",
                        new ByteArrayInputStream(("Content of /theme/theme.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'category':'game'," +
                " 'description':'A powerful feature', " +
                " 'newComment':'Interesting theme' " +
            "}"
        ));
        Assert.assertEquals("{" +
                "\"comments\":[{\"date\":\"2025-02-18\",\"id\":0,\"text\":\"Interesting theme\",\"version\":0}]," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
                "\"description\":\"A powerful feature\"," +
                "\"illustration\":\"/api/theme/images/theme0-1739879980962.png\"," +
                "\"id\":0," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"prp\"" +
            "}", result.toString());
        Assert.assertEquals("Content of /theme/theme.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAnAlreadyExistingTheme() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof Theme);
            }
        );
        securityManager.doConnect("someone", 0);
        try {
            themeController.propose(params(), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'category':'game'," +
                " 'description':'A powerful feature', " +
                " 'newComment':'Interesting theme' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Theme with title (Magic) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAThemeFromAnUnknownAuthor() {
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);
        securityManager.doConnect("someone", 0);
        try {
            themeController.propose(params(), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'category':'game'," +
                " 'description':'A powerful feature', " +
                " 'newComment':'Interesting theme' " +
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
    public void tryToUpdateAThemeWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Theme ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForThemeUpdate() {
        dataManager.register("find",
            new Theme(),  null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForThemeUpdate() {
        dataManager.register("find",
            new Theme(),  null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'n'," +
                " 'description':'f'" +
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
    public void checkMaxFieldSizesForThemeUpdate() {
        dataManager.register("find",
                setEntityId(new Theme().setTitle("Magic"), 1L),
                null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        dataManager.register("flush", null, null);
        try {
            themeController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'n'," +
                " 'description':'f'" +
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
    public void checkFieldValidityForThemeUpdate() {
        dataManager.register("find",
                setEntityId(new Theme().setTitle("Magic"), 1L),
                null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'description': '123', 'title':'...', 'status':'???', 'category':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"category\":\"??? must matches one of [game, legends, examples]\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void updateATheme() {
        Theme theme = (Theme)setEntityId(new Theme().setTitle("The Magic"), 1L);
        dataManager.register("find", theme, null, Theme.class, 1L);
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        platformManager.setTime(1739879980962L);
        Json result = themeController.update(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("theme", "theme.png", "png",
                    new ByteArrayInputStream(("Content of /theme/theme.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            "\"description\":\"A powerful feature\"," +
            "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
            "\"id\":1," +
            "\"category\":\"game\"," +
            "\"title\":\"Magic\"," +
            "\"version\":0," +
            "\"status\":\"pnd\"" +
        "}"));
        Assert.assertEquals("{" +
                "\"comments\":[]," +
                "\"description\":\"A powerful feature\"," +
                "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"pnd\"" +
            "}",
            result.toString()
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAThemeAndFailPourAnUnknownReason() {
        Theme theme = (Theme)setEntityId(new Theme().setTitle("Magic"), 1L);
        dataManager.register("find", theme, null, Theme.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("admin", 0);
        try {
            themeController.update(params("id", "1"),
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
    public void tryToUpdateAnUnknownTheme() {
        dataManager.register("find", null, null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'Magic'," +
                " 'status':'pnd'," +
                " 'category':'game'," +
                " 'description':'A powerful feature' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Theme with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAThemeWithoutGivingItsID() {
        securityManager.doConnect("someone", 0);
        try {
            themeController.amend(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Theme ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Theme themeBelongingToSomeone() {
        return setEntityId(
            new Theme()
                .setTitle("The Magic")
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
    public void checkMinFieldSizesForThemeAmend() {
        dataManager.register("find",
            themeBelongingToSomeone(),
            null, Theme.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            themeController.amend(params("id", "1"), Json.createJsonFromString("{ " +
                " 'title':'m'," +
                " 'description':'d', " +
                " 'newComments': 't'," +
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
    public void checkMaxFieldSizesForThemeAmend() {
        dataManager.register("find",
            themeBelongingToSomeone(),
            null, Theme.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        try {
            themeController.amend(params("id", "1"), Json.createJsonFromString("{ " +
                " 'title':'" + generateText("f", 201) + "'," +
                " 'description':'" + generateText("d", 1001) + "', " +
                " 'newComments': '"+ generateText("c", 20000) + "'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 1000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForArticleAmend() {
        dataManager.register("find",
                setEntityId(new Theme().setTitle("The Magic"), 1L),
                null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.amend(params("id", "1"), Json.createJsonFromString(
                    "{ 'title':'...', 'category':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"category\":\"??? must matches one of [game, legends, examples]\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void amendATheme() {
        Theme theme = themeBelongingToSomeone();
        dataManager.register("find", theme, null, Theme.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = themeController.amend(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[]{
            new FileSpecification("theme", "theme.png", "png",
                new ByteArrayInputStream(("Content of /theme/theme.png").getBytes()))
        }), Json.createJsonFromString("{" +
            "\"description\":\"A powerful feature\"," +
            "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
            "\"id\":1," +
            "\"category\":\"game\"," +
            "\"title\":\"Magic\"," +
//                "\"version\":0," +
            "\"newComment\":\"Interesting theme\"" +
        "}"));
        Assert.assertEquals("{" +
                "\"comments\":[{\"date\":\"2025-02-18\",\"id\":0,\"text\":\"Interesting theme\",\"version\":0}]," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
                "\"description\":\"A powerful feature\"," +
                "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0" +
            "}",
            result.toString()
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void checkThatAnAdminIsAllowedToAmendATheme() {
        Theme theme = themeBelongingToSomeone();
        dataManager.register("find", theme, null, Theme.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "admin");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        platformManager.setTime(1739879980962L);
        Json result = themeController.amend(params("id", "1"),
            Json.createJsonFromString("{" +
                "\"description\":\"A powerful feature\"," +
                "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
//                "\"version\":0," +
            "}"));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAThemeAndFailPourAnUnknownReason() {
        Theme theme = themeBelongingToSomeone();
        dataManager.register("find", theme, null, Theme.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("someone", 0);
        try {
            themeController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                    "\"description\":\"A powerful feature\"," +
                    "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
                    "\"id\":1," +
                    "\"category\":\"game\"," +
                    "\"title\":\"Magic\"," +
//                "\"version\":0," +
                    "\"newComment\":\"Interesting theme\"" +
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
    public void tryToAmendAThemeByAnUnknownAccount() {
        Theme theme = themeBelongingToSomeone();
        dataManager.register("find", theme, null, Theme.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);        securityManager.doConnect("someone", 0);
        try {
            themeController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                    "\"description\":\"A powerful feature\"," +
                    "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
                    "\"id\":1," +
                    "\"category\":\"game\"," +
                    "\"title\":\"Magic\"," +
//                "\"version\":0," +
                    "\"newComment\":\"Interesting theme\"" +
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
    public void tryToAmendAnUnknownTheme() {
        dataManager.register("find", null, null, Theme.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            themeController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                    "\"description\":\"A powerful feature\"," +
                    "\"illustration\":\"/api/theme/images/theme1-1739879980962.png\"," +
                    "\"id\":1," +
                    "\"category\":\"game\"," +
                    "\"title\":\"Magic\"," +
//                "\"version\":0," +
                    "\"newComment\":\"Interesting theme\"" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Theme with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListThemesWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Theme theme1() {
        return setEntityId(new Theme()
            .setTitle("Magic")
            .setStatus(ThemeStatus.LIVE)
            .setCategory(ThemeCategory.GAME)
            .setDescription("Description of Magic"),
        1L);
    }

    Theme theme2() {
        return setEntityId(new Theme()
            .setTitle("Armor")
            .setStatus(ThemeStatus.LIVE)
            .setCategory(ThemeCategory.GAME)
            .setDescription("Description of Armor"),
        2L);
    }

    @Test
    public void listAllThemes() {
        dataManager.register("createQuery", null, null,
                "select count(t) from Theme t");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select t from Theme t");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                theme1(), theme2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.getAll(params("page", "0"), null);
        Assert.assertEquals("{" +
            "\"themes\":[{" +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"description\":\"Description of Armor\"," +
                "\"id\":2,\"category\":\"game\"," +
                "\"title\":\"Armor\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"count\":2,\"pageSize\":10,\"page\":0" +
            "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listThemesWithASearchPattern() {
        dataManager.register("createQuery", null, null,
            "select count(t) from Theme t " +
                "where fts('pg_catalog.english', t.title||' '||t.category||' '||t.description||" +
                "' '||t.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select t from Theme t " +
                "where fts('pg_catalog.english', t.title||' '||t.category||' '||t.description||" +
                "' '||t.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Theme magicTheme = new Theme().setTitle("Magic");
        dataManager.register("getResultList", arrayList(
                theme1(), theme2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.getAll(params("page", "0", "search", "Magic"), null);
        Assert.assertEquals("{" +
            "\"themes\":[{" +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"description\":\"Description of Armor\"," +
                "\"id\":2,\"category\":\"game\"," +
                "\"title\":\"Armor\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"count\":2,\"pageSize\":10,\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllThemesWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            themeController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAThemeByTitleWithoutGivingTheTitle() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.getByTitle(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Title of the Theme is missing (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneThemeByTitle() {
        dataManager.register("createQuery", null, null,
            "select t from Theme t " +
                "left outer join fetch t.author a " +
                "left outer join fetch a.access " +
                "where t.title = :title");
        dataManager.register("setParameter", null, null,"title", "Magic");
        dataManager.register("getSingleResult",
                theme1(), null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.getByTitle(params("title", "Magic"), null);
        Assert.assertEquals("{" +
                "\"comments\":[]," +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByTitleAnUnknownTheme() {
        dataManager.register("createQuery", null, null,
            "select t from Theme t " +
                "left outer join fetch t.author a " +
                "left outer join fetch a.access " +
                "where t.title = :title");
        dataManager.register("setParameter", null, null,"title", "The power of Magic");
        dataManager.register("getSingleResult", null, null);
        securityManager.doConnect("admin", 0);
        try {
            themeController.getByTitle(params("title", "The power of Magic"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Theme with title The power of Magic", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByTitleAThemeWithBadCredentials() {
        dataManager.register("createQuery", null, null,
            "select t from Theme t " +
                "left outer join fetch t.author a " +
                "left outer join fetch a.access " +
                "where t.title = :title");
        dataManager.register("setParameter", null, null,"title", "The power of Magic");
        dataManager.register("getSingleResult",
                theme1(), null);
        securityManager.doConnect("someoneelse", 0);
        try {
            themeController.getByTitle(params("title", "The power of Magic"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }






    @Test
    public void tryToListThemesByCategoryWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.getByCategory(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        try {
            themeController.getByCategory(params("page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested category is invalid (null)", sce.getMessage());
        }
    }

    @Test
    public void listArticlesByTheme() {
        dataManager.register("createQuery", null, null,
                "select t from Theme t where t.category=:category and t.status=:status");
        Theme theme = (Theme)setEntityId(new Theme().setTitle("Power of Magic"), 101);
        dataManager.register("setParameter", null, null, "category", ThemeCategory.GAME);
        dataManager.register("setParameter", null, null, "status", ThemeStatus.LIVE);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Theme magicTheme = new Theme().setTitle("Magic");
        dataManager.register("getResultList", arrayList(
                theme1(), theme2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.getByCategory(params("page", "0", "category", "game"), null);
        Assert.assertEquals("[{" +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"title\":\"Magic\"" +
            "},{" +
                "\"description\":\"Description of Armor\"," +
                "\"id\":2," +
                "\"title\":\"Armor\"" +
            "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listThemesByCategoryAndASearchPattern() {
        dataManager.register("createQuery", null, null,
            "select t from Theme t " +
                "where t.category=:category and t.status=:status and " +
                "fts('pg_catalog.english', t.title||' '||t.category||' '||" +
                "t.description||' '||t.status, :search) = true");
        Theme theme = (Theme)setEntityId(new Theme().setTitle("Power of Magic"), 101);
        dataManager.register("setParameter", null, null, "category", ThemeCategory.GAME);
        dataManager.register("setParameter", null, null, "status", ThemeStatus.LIVE);
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                theme1(), theme2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.getByCategory(params("page", "0", "category", "game", "search", "Magic"), null);
        Assert.assertEquals("[{" +
            "\"description\":\"Description of Magic\"," +
            "\"id\":1," +
            "\"title\":\"Magic\"" +
        "},{" +
            "\"description\":\"Description of Armor\"," +
            "\"id\":2," +
            "\"title\":\"Armor\"" +
        "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void getLiveThemes() {
        dataManager.register("createQuery", null, null,
                "select t from Theme t where t.status=:status");
        dataManager.register("setParameter", null, null, "status", ThemeStatus.LIVE);
        dataManager.register("getResultList", arrayList(
                theme1(), theme2()
        ), null);
        Json result = themeController.getLive(params(), null);
        Assert.assertEquals("[{" +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0,\"status\":\"live\"" +
            "},{" +
                "\"description\":\"Description of Armor\"," +
                "\"id\":2," +
                "\"category\":\"game\"," +
                "\"title\":\"Armor\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAThemeWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.getThemeWithComments(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Theme ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneThemeById() {
        dataManager.register("find",
                theme1(), null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = themeController.getThemeWithComments(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"comments\":[]," +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownTheme() {
        dataManager.register("find", null, null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.getThemeWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Theme with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAThemeWithBadCredentials() {
        dataManager.register("find",
                theme1(), null, Theme.class, 1L);
        securityManager.doConnect("someoneelse", 0);
        try {
            themeController.getThemeWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAThemeWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            themeController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Theme ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteATheme() {
        dataManager.register("find", theme1(), null, Theme.class, 1L);
        Ref<Theme> rTheme = new Ref<>();
        dataManager.register("merge", (Supplier)()->rTheme.get(), null,
                (Predicate) entity->{
                    if (!(entity instanceof Theme)) return false;
                    rTheme.set((Theme) entity);
                    if (rTheme.get().getId() != 1L) return false;
                    return true;
                }
        );
        dataManager.register("remove", null, null,
                (Predicate) entity->{
                    if (!(entity instanceof Theme)) return false;
                    Theme theme = (Theme) entity;
                    if (theme.getId() != 1L) return false;
                    return true;
                }
        );
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownTheme() {
        dataManager.register("find", null, null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Theme with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAThemeAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
                new PersistenceException("Some Reason"), Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAThemeWithBadCredentials() {
        dataManager.register("find",
                theme1(),null);
        securityManager.doConnect("someoneelse", 0);
        try {
            themeController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAThemeStatusUpdate() {
        dataManager.register("find",
                theme1(), null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsForAThemeSStatusUpdate() {
        dataManager.register("find",
                theme1(),null, Theme.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            themeController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void upadteAThemeSStatus() {
        dataManager.register("find",
                theme1(), null, Theme.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = themeController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
                "\"comments\":[]," +
                "\"description\":\"Description of Magic\"," +
                "\"id\":1," +
                "\"category\":\"game\"," +
                "\"title\":\"Magic\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAThemeSStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            themeController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
                theme1(), null, Theme.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            themeController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void chargeThemeImage() {
        platformManager.register("getInputStream",
                new ByteArrayInputStream(("Content of /themes/theme.png").getBytes()),
                null,  "/themes/theme.png");
        FileSpecification image = themeController.getImage(params("imagename", "theme-10123456.png"));
        Assert.assertEquals("theme.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("theme.png", image.getFileName());
        Assert.assertEquals("Content of /themes/theme.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeThemeImage() {
        platformManager.register("getInputStream", null,
                new PersistenceException("For Any Reason..."),  "/themes/theme.png");
        try {
            themeController.getImage(params("imagename", "theme-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }
}
