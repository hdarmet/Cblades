package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.ArticleController;
import fr.cblades.domain.*;
import fr.cblades.services.LikeVoteService;
import fr.cblades.services.LikeVoteServiceImpl;
import org.checkerframework.checker.units.qual.A;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.*;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class ArticleControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    ArticleController articleController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;
    InjectorForTest injector;
    Account someone;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        someone = new Account().setAccess(
                new Login().setLogin("someone").setPassword("someone")
        );
        injector = (InjectorForTest)ApplicationManager.get().getInjector();
        injector.addComponent(LikeVoteService.class, new LikeVoteServiceImpl());
        articleController = new ArticleController();
        dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
        securityManager.register(new MockSecurityManagerImpl.Credential("someoneelse", "someoneelse", StandardUsers.USER));
        platformManager.setTime(1739879980962L);
    }

    Article article1() {
        Theme magicTheme = new Theme().setTitle("Magic");
        Paragraph paragraph = new Paragraph().setTitle("What is Magic Power")
            .setText("Here we describe the power of Magic")
            .setIllustration("power-magin.png")
            .setIllustrationPosition(IllustrationPosition.CENTER);
        return setEntityId(
            new Article().setTitle("Power of Magic").setStatus(ArticleStatus.PROPOSED)
                .addTheme(magicTheme)
                .addParagraph(paragraph)
                .setFirstParagraph(paragraph)
                .setPoll(
                    new LikePoll().setLikes(10).setDislikes(2)
                ), 1);
    }

    Article tinyArticle1() {
        Theme magicTheme = new Theme().setTitle("Magic");
        return (Article)setEntityId(new Article().setTitle("The power of Magic").setStatus(ArticleStatus.LIVE)
                .addTheme(magicTheme), 2);
    }

    Article tintArticle2() {
        Theme magicTheme = new Theme().setTitle("Magic");
        return (Article)setEntityId(new Article().setTitle("Danger of Magic").setStatus(ArticleStatus.LIVE)
            .addTheme(magicTheme), 2);
    }

    @Test
    public void checkRequiredFieldsForArticleCreation() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(), Json.createJsonFromString(
            "{ 'themes': [{}], 'paragraphs': [{}], 'comments':[{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"paragraphs-text\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"themes-id\":\"required\"," +
                "\"paragraphs-title\":\"required\"," +
                "\"paragraphs-version\":\"required\"," +
                "\"paragraphs-ordinal\":\"required\"," +
                "\"title\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForArticleCreation() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(), Json.createJsonFromString("{ " +
                "'title':'t', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'t', " +
                    "'text':'x' " +
                "}], " +
                " 'comments':[{ " +
                    "'version':0, " +
                    "'date':'2025-11-12', " +
                    "'text': 't'," +
                " }]" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must be greater of equals to 2\"," +
                "\"paragraphs-title\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"," +
                "\"comments-text\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForArticleCreation() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(), Json.createJsonFromString("{ " +
                "'title':'"+ generateText("f", 201) +"', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'"+ generateText("f", 201) +"', " +
                    "'text':'"+ generateText("f", 20000) +"' " +
                " }]," +
                " 'comments':[{ " +
                    "'version':0, " +
                    "'date':'2025-11-12', " +
                    "'text': '" + generateText("f", 20000) + "'," +
                " }]" +
            " }"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must not be greater than 19995\"," +
                "\"paragraphs-title\":\"must not be greater than 200\"," +
                "\"title\":\"must not be greater than 200\"," +
                "\"comments-text\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForArticleCreation() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(), Json.createJsonFromString(
                "{ 'title':'...', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewArticle() {
        Theme theme = new Theme();
        dataManager.register("find", theme, null, Theme.class, 101L);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Article);
            Article article = (Article)entity;
            Assert.assertEquals("The power of Magic", article.getTitle());
            Assert.assertEquals(ArticleStatus.LIVE, article.getStatus());
            Assert.assertEquals(new ArrayList<Theme>() {{ add(theme); }}, article.getThemes());
            Assert.assertEquals(1, article.getParagraphs().size());
            Paragraph paragraph = article.getParagraphs().get(0);
            Assert.assertEquals("Why Magic is so important", paragraph.getTitle());
            Assert.assertEquals("Because its powerful !", paragraph.getText());
            Assert.assertEquals(1, article.getComments().size());
            Comment comment = article.getComments().get(0);
            Assert.assertEquals("Some explanations here", comment.getText());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        articleController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("magic_article-0", "magic_article-0.png", "png",
                    new ByteArrayInputStream(("Content of /avatars/magic_article-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'title':'The power of Magic'," +
            " 'status':'live'," +
            " 'themes':[{ " +
                " 'id':101 " +
            "  }]," +
            " 'paragraphs':[{ " +
                " 'title':'Why Magic is so important'," +
                " 'text':'Because its powerful !'," +
                " 'ordinal':0," +
                " 'version':0," +
            " }]," +
            " 'comments':[{ " +
                " 'text': 'Some explanations here'," +
                " 'date': '2024-11-12'," +
                " 'version':0," +
            " }]" +
            "}"
        ));
        Assert.assertEquals("Content of /avatars/magic_article-0.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewArticleWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            articleController.create(params(), Json.createJsonFromString("{" +
                    " 'title':'The power of Magic'," +
                    " 'status':'live'," +
                    " 'paragraphs':[{ " +
                        " 'title':'While Magic is so important'," +
                        " 'text':'Because its powerful !'," +
                        " 'ordinal':0," +
                        " 'version':0," +
                    "}]" +
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
    public void failToCreateAnArticleBecauseMoreThanOneImageFile() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            return true;
        });
        dataManager.register("flush", null, null, null);
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("magic_article0-0", "magic_article0-0.png", "png",
                        new ByteArrayInputStream(("Content of /avatars/magic_article0-0.png").getBytes())),
                    new FileSpecification("magic_article1-0", "magic_article1-0.png", "png",
                        new ByteArrayInputStream(("Content of /avatars/magic_article1-0.png").getBytes()))
                }
            ), Json.createJsonFromString("{" +
                    " 'title':'The power of Magic'," +
                    " 'status':'live'," +
                    " 'paragraphs':[{ " +
                        " 'title':'While Magic is so important'," +
                        " 'text':'Because its powerful !'," +
                        " 'ordinal':0," +
                        " 'version':0," +
                    "}]" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Only one illustration file may be loaded for a paragraph.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewArticleAssociatedToAnUnknownTheme() {
        dataManager.register("find", null, null, Theme.class, 101L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("magic_article-0", "magic_article-0.png", "png",
                        new ByteArrayInputStream(("Content of /avatars/magic_article-0.png").getBytes()))
                }
            ), Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'status':'live'," +
                " 'themes':[{ " +
                    " 'id':101 " +
                "  }]" +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Theme with id 101", sce.getMessage());
        }
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingArticle() {
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof Article);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            articleController.create(params(), Json.createJsonFromString("{" +
                    " 'title':'The power of Magic'," +
                    " 'status':'live'," +
                    " 'paragraphs':[{ " +
                        " 'title':'While Magic is so important'," +
                        " 'text':'Because its powerful !'," +
                        " 'ordinal':0," +
                        " 'version':0," +
                    "}]" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Article with title (The power of Magic) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForArticleProposal() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.propose(params(), Json.createJsonFromString(
                    "{ 'themes': [{}], 'paragraphs': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"required\"," +
                "\"themes-id\":\"required\"," +
                "\"paragraphs-title\":\"required\"," +
                "\"paragraphs-version\":\"required\"," +
                "\"paragraphs-ordinal\":\"required\"," +
                "\"title\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForArticleProposal() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.propose(params(), Json.createJsonFromString("{ " +
                "'title':'t', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'t', " +
                    "'text':'x' " +
                "}], " +
                "'newComment':'t'," +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must be greater of equals to 2\"," +
                "\"newComment\":\"must be greater of equals to 2\"," +
                "\"paragraphs-title\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForArticleProposal() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.propose(params(), Json.createJsonFromString("{ " +
                "'title':'"+ generateText("f", 201) +"', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'"+ generateText("f", 201) +"', " +
                    "'text':'"+ generateText("f", 20000) +"' " +
                " }]," +
                " 'newComment': '" + generateText("f", 20000) + "'," +
            " }"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must not be greater than 19995\"," +
                "\"newComment\":\"must not be greater than 200\"," +
                "\"paragraphs-title\":\"must not be greater than 200\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForArticleProposal() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.propose(params(), Json.createJsonFromString(
                    "{ 'title':'...' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createAProposalWithMoreImagesThanParagraphs() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null);
        OutputStream outputStream = new ByteArrayOutputStream();
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        try {
            articleController.propose(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("magic_article-0", "magic_article-0.png", "png",
                        new ByteArrayInputStream(("Content of /avatars/magic_article-0.png").getBytes()))
                }
            ), Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'paragraphs':[]," +
                " 'newComment': 'Some explanations here'," +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("No paragraph for image : 0", sce.getMessage());
        }
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void createNewProposal() {
        Theme theme = new Theme();
        dataManager.register("find", theme, null, Theme.class, 101L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Article);
            Article article = (Article)entity;
            Assert.assertEquals("The power of Magic", article.getTitle());
            Assert.assertEquals(ArticleStatus.PROPOSED, article.getStatus());
            Assert.assertEquals(new ArrayList<Theme>() {{ add(theme); }}, article.getThemes());
            Assert.assertEquals(1, article.getParagraphs().size());
            Paragraph paragraph = article.getParagraphs().get(0);
            Assert.assertEquals("Why Magic is so important", paragraph.getTitle());
            Assert.assertEquals("Because its powerful !", paragraph.getText());
            Assert.assertEquals(1, article.getComments().size());
            Comment comment = article.getComments().get(0);
            Assert.assertEquals("Some explanations here", comment.getText());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.propose(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("magic_article-0", "magic_article-0.png", "png",
                    new ByteArrayInputStream(("Content of /avatars/magic_article-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'title':'The power of Magic'," +
            " 'themes':[{ " +
                " 'id':101 " +
            "  }]," +
            " 'paragraphs':[{ " +
                " 'title':'Why Magic is so important'," +
                " 'text':'Because its powerful !'," +
                " 'ordinal':0," +
                " 'version':0," +
            " }]," +
            " 'newComment': 'Some explanations here'," +
            "}"
        ));
        Assert.assertEquals("{" +
                "\"themes\":[{\"id\":0,\"title\":\"\"}]," +
                "\"comments\":[{\"date\":\"2025-02-18\",\"id\":0,\"text\":\"Some explanations here\",\"version\":0}]," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
                "\"id\":0," +
                "\"title\":\"The power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"/api/article/images/paragraph0_0-1739879980962.png\"," +
                    "\"id\":0," +
                    "\"text\":\"Because its powerful !\"," +
                    "\"title\":\"Why Magic is so important\"," +
                    "\"version\":0" +
                "}]," +
                "\"version\":0," +
                "\"status\":\"prp\"" +
            "}", result.toString());
        Assert.assertEquals("Content of /avatars/magic_article-0.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAnAlreadyExistingArticle() {
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
            "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof Article);
            }
        );
        securityManager.doConnect("someone", 0);
        try {
            articleController.propose(params(), Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'paragraphs':[{ " +
                    " 'title':'While Magic is so important'," +
                    " 'text':'Because its powerful !'," +
                    " 'ordinal':0," +
                    " 'version':0," +
                "}]" +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Article with title (The power of Magic) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAnArticleFromAnUnknownAuthor() {
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);
        securityManager.doConnect("someone", 0);
        try {
            articleController.propose(params(), Json.createJsonFromString("{" +
                    " 'title':'The power of Magic'," +
                    " 'paragraphs':[{ " +
                        " 'title':'While Magic is so important'," +
                        " 'text':'Because its powerful !'," +
                        " 'illustration':'strong-magic.png'," +
                        " 'ordinal':0," +
                        " 'version':0," +
                    " }]" +
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
    public void tryToUpdateAnArticleWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Article ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForArticleUpdate() {
        dataManager.register("find",
                tinyArticle1(),  null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.update(params("id", "1"), Json.createJsonFromString(
                    "{ 'themes': [{}], 'paragraphs': [{}], 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"paragraphs-text\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"themes-id\":\"required\"," +
                "\"paragraphs-title\":\"required\"," +
                "\"paragraphs-version\":\"required\"," +
                "\"paragraphs-ordinal\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForArticleUpdate() {
        dataManager.register("find",
                tinyArticle1(),  null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'t', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'t', " +
                    "'illustration':'i', " +
                    "'text':'x' " +
                "}], " +
                " 'comments':[{ " +
                    "'version':0, " +
                    "'date':'2025-11-12', " +
                    "'text': 't'," +
                " }]" +
                "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must be greater of equals to 2\"," +
                "\"paragraphs-title\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"," +
                "\"comments-text\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForArticleUpdate() {
        dataManager.register("find",
            setEntityId(new Article().setTitle("The power of Magic"), 1L),
            null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        dataManager.register("flush", null, null);
        try {
            articleController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'"+ generateText("f", 201) +"', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'"+ generateText("f", 201) +"', " +
                    "'illustration':'"+ generateText("f", 201) +"', " +
                    "'text':'"+ generateText("f", 20000) +"' " +
                " }]," +
                " 'comments':[{ " +
                    "'version':0, " +
                    "'date':'2025-11-12', " +
                    "'text': '" + generateText("f", 20000) +"'," +
                " }]" +
                "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must not be greater than 19995\"," +
                "\"paragraphs-title\":\"must not be greater than 200\"," +
                "\"title\":\"must not be greater than 200\"," +
                "\"comments-text\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForArticleUpdate() {
        dataManager.register("find",
            setEntityId(new Article().setTitle("The power of Magic"), 1L),
            null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'title':'...', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void updateAnArticle() {
        Article article = (Article)setEntityId(new Article().setTitle("The power of Magic"), 1L);
        dataManager.register("find", article, null, Article.class, 1L);
        Theme theme = new Theme();
        dataManager.register("find", theme, null, Theme.class, 101L);
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.update(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("magic_article-0", "magic_article-0.png", "png",
                    new ByteArrayInputStream(("Content of /avatars/magic_article-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'title':'The power of Magic'," +
            " 'status':'live'," +
            " 'themes':[{ " +
                " 'id':101 " +
            "  }]," +
            " 'paragraphs':[{ " +
                " 'title':'Why Magic is so important'," +
                " 'text':'Because its powerful !'," +
                " 'illustration':'strong-magic.png'," +
                " 'ordinal':0," +
                " 'version':0," +
            " }]," +
            " 'comments':[{ " +
                " 'text': 'Some explanations here'," +
                " 'date': '2024-11-12'," +
                " 'version':0," +
            " }]" +
            "}"
        ));
        Assert.assertEquals("{" +
                "\"themes\":[{" +
                    "\"id\":0," +
                    "\"title\":\"\"" +
                "}]," +
                "\"comments\":[{" +
                    "\"date\":\"2024-11-12\"," +
                    "\"id\":0," +
                    "\"text\":\"Some explanations here\"," +
                    "\"version\":0" +
                "}]," +
                "\"id\":1," +
                "\"title\":\"The power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"/api/article/images/paragraph1_0-1739879980962.png\"," +
                    "\"id\":0," +
                    "\"text\":\"Because its powerful !\"," +
                    "\"title\":\"Why Magic is so important\"," +
                    "\"version\":0" +
                "}]," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnArticleAndFailPourAnUnknownReason() {
        Article article = (Article)setEntityId(new Article().setTitle("The power of Magic"), 1L);
        dataManager.register("find", article, null, Article.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("admin", 0);
        try {
            articleController.update(params("id", "1"),
                Json.createJsonFromString("{" +
                    " 'title':'The power of Magic'," +
                    " 'status':'live'," +
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
    public void tryToUpdateAnUnknownArticle() {
        dataManager.register("find", null, null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'status':'live'," +
                " 'paragraphs':[{ " +
                    " 'title':'While Magic is so important'," +
                    " 'text':'Because its powerful !'," +
                    " 'illustration':'strong-magic.png'," +
                    " 'ordinal':0," +
                    " 'version':0," +
                " }]" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Article with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAnArticleWithoutGivingItsID() {
        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Article ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Article articleBelongingToSomeone() {
        return setEntityId(
            new Article()
                .setTitle("The power of Magic")
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
    public void checkRequiredFieldsForArticleAmend() {
        dataManager.register("find",
            articleBelongingToSomeone(),
            null, Article.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params("id", "1"), Json.createJsonFromString(
                "{ 'themes': [{}], 'paragraphs': [{}] }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"required\"," +
                "\"themes-id\":\"required\"," +
                "\"paragraphs-title\":\"required\"," +
                "\"paragraphs-version\":\"required\"," +
                "\"paragraphs-ordinal\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForArticleAmend() {
        dataManager.register("find",
                articleBelongingToSomeone(),
            null, Article.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'t', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'t', " +
                    "'illustration':'i', " +
                    "'text':'x' " +
                " }], " +
                " 'newComments': 't'," +
                "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must be greater of equals to 2\"," +
                "\"paragraphs-title\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
                "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForArticleAmend() {
        dataManager.register("find",
                articleBelongingToSomeone(),
            null, Article.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'"+ generateText("f", 201) +"', " +
                "'paragraphs': [{ " +
                    "'version':0, " +
                    "'ordinal':0, " +
                    "'title':'"+ generateText("f", 201) +"', " +
                    "'illustration':'"+ generateText("f", 201) +"', " +
                    "'text':'"+ generateText("f", 20000) +"' " +
                " }]," +
                " 'newComments': '" + generateText("f", 20000) + "', " +
                "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"paragraphs-text\":\"must not be greater than 19995\"," +
                "\"paragraphs-title\":\"must not be greater than 200\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForArticleAmend() {
        dataManager.register("find",
            setEntityId(new Article().setTitle("The power of Magic"), 1L),
            null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.amend(params("id", "1"), Json.createJsonFromString(
                    "{ 'title':'...', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void amendAnArticle() {
        Article article = articleBelongingToSomeone();
        dataManager.register("find", article, null, Article.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        Theme theme = new Theme();
        dataManager.register("find", theme, null, Theme.class, 101L);
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.amend(params("id", "1",
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("magic_article-0", "magic_article-0.png", "png",
                    new ByteArrayInputStream(("Content of /avatars/magic_article-0.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
            " 'title':'The power of Magic'," +
            " 'status':'live'," +
            " 'themes':[{ " +
                " 'id':101 " +
            "  }]," +
            " 'paragraphs':[{ " +
                " 'title':'Why Magic is so important'," +
                " 'text':'Because its powerful !'," +
                " 'illustration':'strong-magic.png'," +
                " 'ordinal':0," +
                " 'version':0," +
            " }]," +
            " 'newComment': 'Some explanations here'" +
        "}"
        ));
        Assert.assertEquals("{" +
                "\"themes\":[{\"id\":0,\"title\":\"\"}]," +
                "\"comments\":[{\"date\":\"2025-02-18\",\"id\":0,\"text\":\"Some explanations here\",\"version\":0}]," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":0,\"login\":\"someone\"}," +
                "\"id\":1," +
                "\"title\":\"The power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"/api/article/images/paragraph1_0-1739879980962.png\"," +
                    "\"id\":0," +
                    "\"text\":\"Because its powerful !\",\"title\":\"Why Magic is so important\"," +
                    "\"version\":0" +
                "}]," +
                "\"version\":0" +
            "}",
            result.toString()
        );
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void checkThatAnAdminIsAllowedToAmendAnArticle() {
        Article article = articleBelongingToSomeone();
        dataManager.register("find", article, null, Article.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "admin");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.amend(params("id", "1"),
            Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'status':'live'" +
            "}"
        ));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAnArticleAndFailPourAnUnknownReason() {
        Article article = articleBelongingToSomeone();
        dataManager.register("find", article, null, Article.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params("id", "1"),
                Json.createJsonFromString("{" +
                    " 'title':'The power of Magic'," +
                    " 'status':'live'," +
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
    public void tryToAmendAnArticleByAnUnknownAccount() {
        Article article = articleBelongingToSomeone();
        dataManager.register("find", article, null, Article.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'status':'live'," +
                " 'paragraphs':[{ " +
                    " 'title':'While Magic is so important'," +
                    " 'text':'Because its powerful !'," +
                    " 'illustration':'strong-magic.png'," +
                    " 'ordinal':0," +
                    " 'version':0," +
                " }]" +
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
    public void tryToAmendAnUnknownArticle() {
        dataManager.register("find", null, null, Article.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            articleController.amend(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'The power of Magic'," +
                " 'status':'live'," +
                " 'paragraphs':[{ " +
                    " 'title':'While Magic is so important'," +
                    " 'text':'Because its powerful !'," +
                    " 'illustration':'strong-magic.png'," +
                    " 'ordinal':0," +
                    " 'version':0," +
                " }]" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Article with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListArticlesWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void listAllArticles() {
        dataManager.register("createQuery", null, null,
            "select count(a) from Article a");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select a from Article a " +
                "left outer join fetch a.themes t " +
                "left join fetch a.poll " +
                "left outer join fetch a.firstParagraph p");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
            article1(), tintArticle2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getAll(params("page", "0"), null);
        Assert.assertEquals("{" +
            "\"count\":2,\"pageSize\":10,\"page\":0," +
            "\"articles\":[{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"firstParagraph\":{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\"" +
                "}," +
                "\"id\":1,\"title\":\"Power of Magic\"," +
                "\"version\":0,\"status\":\"prp\"" +
            "},{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"id\":2,\"title\":\"Danger of Magic\"," +
                "\"version\":0,\"status\":\"live\"" +
            "}]" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listArticlesWithASearchPattern() {
        dataManager.register("createQuery", null, null,
        "select count(a) from Article a " +
                "where fts('pg_catalog.english', a.title||' '||a.document.text ||' '||a.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select a from Article a " +
                "left outer join fetch a.themes t " +
                "left join fetch a.poll " +
                "left outer join fetch a.firstParagraph p " +
                "where fts('pg_catalog.english', a.title||' '||a.document.text ||' '||a.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Theme magicTheme = new Theme().setTitle("Magic");
        dataManager.register("getResultList", arrayList(
            article1(), tintArticle2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getAll(params("page", "0", "search", "Magic"), null);
        Assert.assertEquals("{" +
            "\"count\":2,\"pageSize\":10,\"page\":0," +
            "\"articles\":[{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"firstParagraph\":{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\"" +
                "}," +
                "\"id\":1,\"title\":\"Power of Magic\"," +
                "\"version\":0," +
                "\"status\":\"prp\"" +
            "},{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"id\":2,\"title\":\"Danger of Magic\"," +
                "\"version\":0,\"status\":\"live\"" +
            "}" +
        "]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllArticlesWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            articleController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListNewArticlesWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.getLiveNew(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
    }

    @Test
    public void listRecentArticles() {
        dataManager.register("createQuery", null, null,
        "select a from Article a join fetch a.paragraphs join " +
                "fetch a.author join fetch a.poll " +
                "where a.status=:status and a.recent=:recent");
        dataManager.register("setParameter", null, null, "status", ArticleStatus.LIVE);
        dataManager.register("setParameter", null, null, "recent", true);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Theme magicTheme = new Theme().setTitle("Magic");
        dataManager.register("getResultList", arrayList(
            article1(), tintArticle2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getLiveNew(params("page", "0"), null);
        Assert.assertEquals("[{" +
                "\"id\":1," +
                "\"poll\":{\"dislikes\":2,\"id\":0,\"likes\":10}," +
                "\"title\":\"Power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"id\":0," +
                    "\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\"" +
                "}]" +
            "},{" +
                "\"id\":2," +
                "\"title\":\"Danger of Magic\"," +
                "\"paragraphs\":[]" +
            "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listRecentArticlesWithASearchPattern() {
        dataManager.register("createQuery", null, null,
        "select a from Article a " +
                "join fetch a.paragraphs join fetch a.author " +
                "join fetch a.poll where a.status=:status and a.recent=:recent and " +
                "fts('pg_catalog.english', a.title||' '||a.document.text, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        dataManager.register("setParameter", null, null, "status", ArticleStatus.LIVE);
        dataManager.register("setParameter", null, null, "recent", true);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                article1(), tintArticle2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getLiveNew(params("page", "0", "search", "Magic"), null);
        Assert.assertEquals("[" +
            "{\"id\":1," +
                "\"poll\":{\"dislikes\":2,\"id\":0,\"likes\":10}," +
                "\"title\":\"Power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"power-magin.png\",\"id\":0," +
                    "\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\",\"illustrationPosition\":\"center\"" +
                "}]" +
            "}," +
            "{\"id\":2,\"title\":\"Danger of Magic\",\"paragraphs\":[]}" +
        "]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListArticlesByThemeWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.getLiveByTheme(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        try {
            articleController.getLiveByTheme(params("page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Theme Id is invalid (null)", sce.getMessage());
        }
    }

    @Test
    public void listArticlesByTheme() {
        dataManager.register("createQuery", null, null,
            "select a from Article a join fetch a.paragraphs " +
                    "join fetch a.author " +
                    "join fetch a.poll " +
                    "where a.status=:status and :theme member of a.themes");
        Theme theme = setEntityId(new Theme().setTitle("Power of Magic"), 101);
        dataManager.register("find", theme, null, Theme.class, 101L);
        dataManager.register("setParameter", null, null, "status", ArticleStatus.LIVE);
        dataManager.register("setParameter", null, null, "theme", theme);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        Theme magicTheme = new Theme().setTitle("Magic");
        dataManager.register("getResultList", arrayList(
            article1(), tintArticle2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getLiveByTheme(params("page", "0", "theme", "101"), null);
        Assert.assertEquals("[{" +
                    "\"id\":1," +
                    "\"poll\":{\"dislikes\":2,\"id\":0,\"likes\":10}," +
                    "\"title\":\"Power of Magic\"," +
                    "\"paragraphs\":[{" +
                        "\"illustration\":\"power-magin.png\"," +
                        "\"id\":0," +
                        "\"text\":\"Here we describe the power of Magic\"," +
                        "\"title\":\"What is Magic Power\"," +
                        "\"illustrationPosition\":\"center\"" +
                    "}]" +
                "},{" +
                    "\"id\":2," +
                    "\"title\":\"Danger of Magic\"," +
                "\"paragraphs\":[]" +
            "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listArticlesByThemeAndASearchPattern() {
        dataManager.register("createQuery", null, null,
            "select a from Article a " +
                "join fetch a.paragraphs " +
                "join fetch a.author " +
                "join fetch a.poll " +
                "where a.status=:status and :theme member of a.themes and " +
                "fts('pg_catalog.english', a.title||' '||a.document.text, :search) = true");
        dataManager.register("setParameter", null, null,"search", "Magic");
        Theme theme = setEntityId(new Theme().setTitle("Power of Magic"), 101);
        dataManager.register("find", theme, null, Theme.class, 101L);
        dataManager.register("setParameter", null, null, "status", ArticleStatus.LIVE);
        dataManager.register("setParameter", null, null, "theme", theme);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
            article1(), tintArticle2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getLiveByTheme(params("page", "0", "theme", "101", "search", "Magic"), null);
        Assert.assertEquals("[{" +
                "\"id\":1," +
                "\"poll\":{\"dislikes\":2,\"id\":0,\"likes\":10}," +
                "\"title\":\"Power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"id\":0,\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\"" +
                "}]" +
            "},{" +
                "\"id\":2," +
                "\"title\":\"Danger of Magic\",\"paragraphs\":[]" +
            "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAnArticleByTitleWithoutGivingTheTitle() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.getByTitle(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Title of the Article is missing (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneArticleByTitle() {
        dataManager.register("createQuery", null, null,
            "select a from Article a " +
                "join fetch a.firstParagraph " +
                "join fetch a.themes " +
                "join fetch a.author w " +
                "join fetch w.access " +
                "where a.title=:title");
        dataManager.register("setParameter", null, null,"title", "The power of Magic");
        dataManager.register("getSingleResult",
                article1(), null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getByTitle(params("title", "The power of Magic"), null);
        Assert.assertEquals("{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"comments\":[]," +
                "\"id\":1,\"title\":\"Power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"id\":0,\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\",\"version\":0" +
                "}]," +
                "\"version\":0,\"status\":\"prp\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByTitleAnUnknownArticle() {
        dataManager.register("createQuery", null, null,
            "select a from Article a " +
                "join fetch a.firstParagraph " +
                "join fetch a.themes " +
                "join fetch a.author w " +
                "join fetch w.access " +
                "where a.title=:title");
        dataManager.register("setParameter", null, null,"title", "The power of Magic");
        dataManager.register("getSingleResult", null, null);
        securityManager.doConnect("admin", 0);
        try {
            articleController.getByTitle(params("title", "The power of Magic"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Article with title The power of Magic", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindByTitleAnArticleWithBadCredentials() {
        dataManager.register("createQuery", null, null,
        "select a from Article a " +
                "join fetch a.firstParagraph " +
                "join fetch a.themes " +
                "join fetch a.author w " +
                "join fetch w.access " +
                "where a.title=:title");
        dataManager.register("setParameter", null, null,"title", "The power of Magic");
        dataManager.register("getSingleResult",
                article1(), null);
        securityManager.doConnect("someoneelse", 0);
        try {
            articleController.getByTitle(params("title", "The power of Magic"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAnArticleWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.getArticleWithComments(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Article ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneArticleById() {
        dataManager.register("find",
                article1(), null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = articleController.getArticleWithComments(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"comments\":[]," +
                "\"id\":1,\"title\":\"Power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"id\":0," +
                    "\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\"," +
                    "\"version\":0" +
                "}]," +
                "\"version\":0,\"status\":\"prp\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownArticle() {
        dataManager.register("find", null, null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.getArticleWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Article with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnArticleWithBadCredentials() {
        dataManager.register("find",
                article1(), null, Article.class, 1L);
        securityManager.doConnect("someoneelse", 0);
        try {
            articleController.getArticleWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnArticleWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            articleController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Article ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAnArticle() {
        dataManager.register("find", article1(), null, Article.class, 1L);
        Ref<Article> rArticle = new Ref<>();
        dataManager.register("merge", (Supplier)()->rArticle.get(), null,
            (Predicate) entity->{
                if (!(entity instanceof Article)) return false;
                rArticle.set((Article) entity);
                if (rArticle.get().getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("remove", null, null,
            (Predicate) entity->{
                if (!(entity instanceof Article)) return false;
                Article article = (Article) entity;
                if (article.getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownArticle() {
        dataManager.register("find", null, null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Article with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnArticleAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
            new PersistenceException("Some Reason"), Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnArticleWithBadCredentials() {
        dataManager.register("find",
            article1(),null);
        securityManager.doConnect("someoneelse", 0);
        try {
            articleController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAnArticleStatusUpdate() {
        dataManager.register("find",
                article1(), null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsForAnArticleSStatusUpdate() {
        dataManager.register("find",
                article1(),null, Article.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            articleController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void upadteAnArticleSStatus() {
        dataManager.register("find",
                article1(),
                null, Article.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = articleController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
                "\"themes\":[{\"id\":0,\"title\":\"Magic\"}]," +
                "\"comments\":[]," +
                "\"id\":1," +
                "\"title\":\"Power of Magic\"," +
                "\"paragraphs\":[{" +
                    "\"illustration\":\"power-magin.png\"," +
                    "\"id\":0,\"text\":\"Here we describe the power of Magic\"," +
                    "\"title\":\"What is Magic Power\"," +
                    "\"illustrationPosition\":\"center\",\"version\":0" +
                "}]," +
                "\"version\":0,\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAnArticleSStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            articleController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
                article1(), null, Article.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            articleController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void tryToGetVote() {
        securityManager.doConnect("someone", 0);
        try {
            articleController.getVote(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("A valid Poll Id must be provided.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getLikeVote() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.LIKE);
        dataManager.register("find",
            likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
            null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                likeVote, null, null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.getVote(params("poll", "101"), null);
        Assert.assertEquals("{\"dislikes\":8,\"likes\":102,\"option\":\"like\"}",
            result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void getDislikeVote() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.DISLIKE);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                likeVote, null, null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.getVote(params("poll", "101"), null);
        Assert.assertEquals("{\"dislikes\":8,\"likes\":102,\"option\":\"dislike\"}",
                result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void nonExistingVote() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                null, new NoResultException(), null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.getVote(params("poll", "101"), null);
        Assert.assertEquals("{\"dislikes\":8,\"likes\":102,\"option\":\"none\"}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void nonExistingPoll() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        dataManager.register("find",
                null, null, LikePoll.class, 101L);
        securityManager.doConnect("someone", 0);
        try {
            articleController.getVote(params("poll", "101"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Poll with id 101.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAVoteAndExperimentPersistenceException() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                null, new PersistenceException("Some Reason"), null);
        securityManager.doConnect("someone", 0);
        try {
            articleController.getVote(params("poll", "101"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected exception: Some Reason.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void voteALike() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.DISLIKE);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                likeVote, null, null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.vote(params("poll", "101"), Json.createJsonFromString(
                "{ 'option': 'like' }"
        ));
        Assert.assertEquals("{" +
            "\"dislikes\":7," +
            "\"likes\":103," +
            "\"option\":\"like\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void voteADislike() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.DISLIKE);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                likeVote, null, null);
        securityManager.doConnect("someone", 0);
        Json result = articleController.vote(params("poll", "101"), Json.createJsonFromString(
                "{ 'option': 'dislike' }"
        ));
        Assert.assertEquals("{" +
            "\"dislikes\":8," +
            "\"likes\":102," +
            "\"option\":\"dislike\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void voteOnAnNonExistingVote() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                null, new NoResultException(), null);
        dataManager.register("createQuery",
            null, null, "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter",
            null, null, "login", "someone");
        dataManager.register("getSingleResult",
            someone, null, null);
        dataManager.register("persist",
            null, null, (Predicate) entity->{
                Assert.assertTrue(entity instanceof LikeVote);
                LikeVote likeVote = (LikeVote)entity;
                Assert.assertEquals(likeVote.getOption(), LikeVoteOption.LIKE);
                Assert.assertEquals(likeVote.getPoll(), likePoll);
                Assert.assertEquals(likeVote.getVoter(), someone);
                return true;
            });
        dataManager.register("flush",
                null, null, null);
        securityManager.doConnect("someone", 0);
        articleController.vote(params("poll", "101"), Json.createJsonFromString(
            "{ 'option': 'like' }"
        ));
        dataManager.hasFinished();
    }

    @Test
    public void voteAndMeetAPersistenceException() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        dataManager.register("find",
                likePoll, null, LikePoll.class, 101L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                null, new PersistenceException("Some Reason"), null);
        securityManager.doConnect("someone", 0);
        try {
            articleController.vote(params("poll", "101"), Json.createJsonFromString(
                    "{ 'option': 'like' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected exception: Some Reason.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void nonVoteOnAnExistingPoll() {
        dataManager.register("find",
                null, null, LikePoll.class, 101L);
        securityManager.doConnect("someone", 0);
        try {
            articleController.vote(params("poll", "101"), Json.createJsonFromString(
                    "{ 'option': 'like' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Poll with id 101.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToVoteWithoutGivingVoteId() {
        securityManager.doConnect("someone", 0);
        try {
            articleController.vote(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("A valid Poll Id must be provided.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToVoteWithoutGivingAWrongVoteOption() {
        securityManager.doConnect("someone", 0);
        try {
            securityManager.doConnect("someone", 0);
            Json result = articleController.vote(params("poll", "101"), Json.createJsonFromString(
                    "{ }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Vote option must be one of these: 'like' or 'dislike'.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToVoteWithoutGivingAnyVoteOption() {
        securityManager.doConnect("someone", 0);
        try {
            securityManager.doConnect("someone", 0);
            Json result = articleController.vote(params("poll", "101"), Json.createJsonFromString(
                    "{ 'option': '???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Vote option must be one of these: 'like' or 'dislike'.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void chargeArticleImage() {
        platformManager.register("getInputStream",
                new ByteArrayInputStream(("Content of /articles/article.png").getBytes()),
                null,  "/articles/article.png");
        FileSpecification image = articleController.getImage(params("imagename", "article-10123456.png"));
        Assert.assertEquals("article.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("article.png", image.getFileName());
        Assert.assertEquals("Content of /articles/article.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeArticleImage() {
        platformManager.register("getInputStream", null,
                new PersistenceException("For Any Reason..."),  "/articles/article.png");
        try {
            articleController.getImage(params("imagename", "article-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }

}
