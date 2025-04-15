package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.MessageModelController;
import fr.cblades.domain.*;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;

import javax.persistence.EntityExistsException;
import javax.persistence.PersistenceException;
import java.util.function.Predicate;

public class MessageModelControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    MessageModelController messageModelController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        messageModelController = new MessageModelController();
        dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
        platformManager.setTime(1739879980962L);
    }

    @Test
    public void checkRequiredFieldsForMessageModelCreation() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.create(params(), Json.createJsonFromString("{}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"required\"," +
                "\"title\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForMessageModelCreation() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.create(params(), Json.createJsonFromString("{" +
                " 'title':'t'," +
                " 'text':'t'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForMessageModelCreation() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.create(params(), Json.createJsonFromString("{" +
                " 'title':'" + generateText("t", 201) + "'," +
                " 'text':'" + generateText("t", 5001) + "'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"must not be greater than 5000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForMessageModelCreation() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.create(params(), Json.createJsonFromString("{ " +
                "'title':'...', 'text': 0, 'status':'???', 'category':'???'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"not a valid string\"," +
                "\"category\":\"??? must matches one of [msgr, msga]\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewMessageModel() {
        dataManager.register("persist", null, null, (Predicate) entity -> {
            Assert.assertTrue(entity instanceof MessageModel);
            MessageModel messageModel = (MessageModel) entity;
            Assert.assertEquals("New Message", messageModel.getTitle());
            Assert.assertEquals(MessageModelStatus.PENDING, messageModel.getStatus());
            Assert.assertEquals("This is a new message model.", messageModel.getText());
            return true;
        });
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.create(params(), Json.createJsonFromString("{" +
            " 'title':'New Message'," +
            " 'status':'pnd'," +
            " 'category':'msgr'," +
            " 'text':'This is a new message model.'" +
        "}"));
        Assert.assertEquals("{" +
            "\"comments\":[]," +
            "\"id\":0," +
            "\"text\":\"This is a new message model.\"," +
            "\"category\":\"msgr\"," +
            "\"title\":\"New Message\"," +
            "\"version\":0," +
            "\"status\":\"pnd\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewMessageModelWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            messageModelController.create(params(), Json.createJsonFromString("{" +
                " 'title':'New Message'," +
                " 'status':'pnd'," +
                " 'category':'msgr'," +
                " 'text':'This is a new message model.'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingMessageModel() {
        dataManager.register("persist", null,
                new EntityExistsException("Entity already Exists"),
                (Predicate) entity -> (entity instanceof MessageModel)
        );
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.create(params(), Json.createJsonFromString("{" +
                " 'title':'New Message'," +
                " 'status':'pnd'," +
                " 'category':'msgr'," +
                " 'text':'This is a new message model.'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Message Model with title (New Message) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAMessageModelWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.update(params(), Json.createJsonFromString("{" +
                " 'title':'New Message'," +
                " 'status':'pnd'," +
                " 'category':'msgr'," +
                " 'text':'This is a new message model.'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Message Model ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForMessageModelUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.update(params("id", "1"), Json.createJsonFromString("{ 'comments': [{}] }"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkMinFieldSizesForMessageModelUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'t'," +
                " 'text':'t'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForMessageModelUpdate() {
        securityManager.doConnect("admin", 0);
        dataManager.register("flush", null, null);
        try {
            messageModelController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'" + generateText("t", 201) + "'," +
                " 'text':'" + generateText("t", 5001) + "'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"must not be greater than 5000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForMessageModelUpdate() {
        dataManager.register("find", setEntityId(new MessageModel().setTitle("Magic"), 1L), null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'...', 'text': 0, 'status':'???', 'category':'???'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"text\":\"not a valid string\"," +
                "\"category\":\"??? must matches one of [msgr, msga]\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void updateAMessageModel() {
        MessageModel messageModel = setEntityId(new MessageModel().setTitle("The Magic"), 1L);
        dataManager.register("find", messageModel, null, MessageModel.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.update(params("id", "1"), Json.createJsonFromString("{" +
            " 'title':'Other Title'," +
            " 'status':'live'," +
            " 'category':'msgr'," +
            " 'text':'Another text'" +
        "}"));
        Assert.assertEquals("{" +
            "\"comments\":[]," +
            "\"id\":1," +
            "\"text\":\"Another text\"," +
            "\"category\":\"msgr\"," +
            "\"title\":\"Other Title\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}",
        result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAMessageModelAndFailPourAnUnknownReason() {
        MessageModel messageModel = setEntityId(new MessageModel().setTitle("Magic"), 1L);
        dataManager.register("find", messageModel, null, MessageModel.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.update(params("id", "1"),
                Json.createJsonFromString("{" +
                    " 'title':'Other Title'," +
                    " 'status':'live'," +
                    " 'category':'msgr'," +
                    " 'text':'Another text'" +
                "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnUnknownMessageModel() {
        dataManager.register("find", null, null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'title':'Other Title'," +
                " 'status':'live'," +
                " 'category':'msgr'," +
                " 'text':'Another text'" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Message Model with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMessageModelWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.delete(params(), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Message Model ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    MessageModel messageModel1() {
        return setEntityId(new MessageModel()
            .setTitle("Complain")
            .setStatus(MessageModelStatus.LIVE)
            .setCategory(MessageModelCategory.MESSAGE_AUTHOR)
            .setText("Description of a complain"),
        1L);
    }

    MessageModel messageModel2() {
        return setEntityId(new MessageModel()
            .setTitle("Suggestion")
            .setStatus(MessageModelStatus.LIVE)
            .setCategory(MessageModelCategory.MESSAGE_AUTHOR)
            .setText("Description of a suggestion"),
        1L);
    }

    @Test
    public void deleteAMessageModel() {
        MessageModel messageModel = messageModel1();
        dataManager.register("find", messageModel, null, MessageModel.class, 1L);
        dataManager.register("merge", messageModel, null, messageModel);
        dataManager.register("remove", null, null, messageModel);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownMessageModel() {
        dataManager.register("find", null, null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Message Model with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMessageModelAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
                new PersistenceException("Some Reason"), MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAMessageModelStatusUpdate() {
        dataManager.register("find",
                messageModel1(), null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.updateStatus(params("id", "1"), Json.createJsonFromString(
                    "{}"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"id\":\"required\",\"status\":\"required\"}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidationsForAMessageModelSStatusUpdate() {
        dataManager.register("find",
                messageModel1(), null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':'1234', 'status':'???'}"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"id\":\"Not a valid id\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void upadteAMessageModelSStatus() {
        dataManager.register("find",
                messageModel1(), null, MessageModel.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
                "\"id\":1," +
                "\"text\":\"Description of a complain\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Complain\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAMessageModelSStatusWithBadCredential() {
        securityManager.doConnect("someone", 0);
        try {
            messageModelController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void failToUpdateAMessageModelStatusForUnknownReason() {
        dataManager.register("find",
            messageModel1(), null, MessageModel.class, 1L);
        dataManager.register("flush", null,
            new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.updateStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':1, 'status': 'live' }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListMessageModelsByCategoryWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.getByCategory(params(), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        try {
            messageModelController.getByCategory(params("page", "0"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The category is missing or invalid (null)", sce.getMessage());
        }
    }

    @Test
    public void listMessageModelsByCategory() {
        dataManager.register("createQuery", null, null,
                "select count(m) from MessageModel m where m.category=:category");
        dataManager.register("setParameter", null, null,
                "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select m from MessageModel m where m.category=:category");
        dataManager.register("setParameter", null, null,
                "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                messageModel1(), messageModel2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.getByCategory(params("page", "0", "category", "msga"), null);
        Assert.assertEquals("{" +
            "\"messageModels\":[{" +
                "\"id\":1," +
                "\"text\":\"Description of a complain\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Complain\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"id\":1," +
                "\"text\":\"Description of a suggestion\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Suggestion\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"count\":2," +
            "\"pageSize\":10," +
            "\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listMessageModelsByCategoryAndASearchPattern() {
        dataManager.register("createQuery", null, null,
                "select count(m) from MessageModel m where m.category=:category and" +
                        " fts('pg_catalog.english', m.title||' '||m.category||' '||m.text||' '||m.status, :search) = true");
        dataManager.register("setParameter", null, null, "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setParameter", null, null, "search", "author");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select m from MessageModel m where m.category=:category and" +
                        " fts('pg_catalog.english', m.title||' '||m.category||' '||m.text||' '||m.status, :search) = true");
        dataManager.register("setParameter", null, null, "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setParameter", null, null, "search", "author");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                messageModel1(), messageModel2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.getByCategory(params("page", "0", "category", "msga", "search", "author"), null);
        Assert.assertEquals("{" +
            "\"messageModels\":[{" +
                "\"id\":1," +
                "\"text\":\"Description of a complain\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Complain\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"id\":1," +
                "\"text\":\"Description of a suggestion\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Suggestion\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"count\":2," +
            "\"pageSize\":10," +
            "\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListLiveMessageModelsByCategoryWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.getByLiveCategory(params(), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        try {
            messageModelController.getByCategory(params("page", "0"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The category is missing or invalid (null)", sce.getMessage());
        }
    }

    @Test
    public void listLiveMessageModelsByCategory() {
        dataManager.register("createQuery", null, null,
                "select count(m) from MessageModel m where m.category=:category and m.status=:status");
        dataManager.register("setParameter", null, null,
                "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setParameter", null, null,
                "status", MessageModelStatus.LIVE);
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select m from MessageModel m where m.category=:category and m.status=:status");
        dataManager.register("setParameter", null, null,
                "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setParameter", null, null,
                "status", MessageModelStatus.LIVE);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                messageModel1(), messageModel2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.getByLiveCategory(params("page", "0", "category", "msga"), null);
        Assert.assertEquals("{" +
            "\"messageModels\":[{" +
                "\"id\":1," +
                "\"text\":\"Description of a complain\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Complain\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"id\":1," +
                "\"text\":\"Description of a suggestion\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Suggestion\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"count\":2," +
            "\"pageSize\":10," +
            "\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listLiveMessageModelsByCategoryAndASearchPattern() {
        dataManager.register("createQuery", null, null,
                "select count(m) from MessageModel m where m.category=:category and m.status=:status and" +
                        " fts('pg_catalog.english', m.title||' '||m.category||' '||m.text||' '||m.status, :search) = true");
        dataManager.register("setParameter", null, null, "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setParameter", null, null, "status", MessageModelStatus.LIVE);
        dataManager.register("setParameter", null, null, "search", "author");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select m from MessageModel m where m.category=:category and m.status=:status and" +
                        " fts('pg_catalog.english', m.title||' '||m.category||' '||m.text||' '||m.status, :search) = true");
        dataManager.register("setParameter", null, null, "category", MessageModelCategory.MESSAGE_AUTHOR);
        dataManager.register("setParameter", null, null, "status", MessageModelStatus.LIVE);
        dataManager.register("setParameter", null, null, "search", "author");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 10);
        dataManager.register("getResultList", arrayList(
                messageModel1(), messageModel2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.getByLiveCategory(params("page", "0", "category", "msga", "search", "author"), null);
        Assert.assertEquals("{" +
            "\"messageModels\":[{" +
                "\"id\":1," +
                "\"text\":\"Description of a complain\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Complain\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"id\":1," +
                "\"text\":\"Description of a suggestion\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Suggestion\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"count\":2," +
            "\"pageSize\":10," +
            "\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAMessageModelWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.getMessageModelWithComments(params(), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Message Model ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneMessageModelById() {
        dataManager.register("find",
                messageModel1(), null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = messageModelController.getMessageModelWithComments(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"comments\":[]," +
                "\"id\":1," +
                "\"text\":\"Description of a complain\"," +
                "\"category\":\"msga\"," +
                "\"title\":\"Complain\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownMessageModel() {
        dataManager.register("find", null, null, MessageModel.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            messageModelController.getMessageModelWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Message Model with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAMessageModelWithBadCredentials() {
        dataManager.register("find",
                messageModel1(), null, MessageModel.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            messageModelController.getMessageModelWithComments(params("id", "1"), null);
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }


}
