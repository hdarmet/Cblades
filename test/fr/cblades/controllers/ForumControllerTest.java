package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.ForumController;
import fr.cblades.domain.*;
import fr.cblades.services.LikeVoteService;
import fr.cblades.services.LikeVoteServiceImpl;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataManipulatorSunbeam;
import org.summer.platform.PlatformManager;

import javax.persistence.EntityExistsException;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceException;
import java.util.function.Predicate;

public class ForumControllerTest implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    ForumController forumController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;
    InjectorForTest injector;
    Account someone, someoneelse;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        forumController = new ForumController();
        injector = (InjectorForTest)ApplicationManager.get().getInjector();
        injector.addComponent(LikeVoteService.class, new LikeVoteServiceImpl());
        dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
        securityManager.register(new MockSecurityManagerImpl.Credential("someoneelse", "someoneelse", StandardUsers.USER));
        platformManager.setTime(1739879980962L);
        someone = setEntityId(new Account().setAccess(new Login().setLogin("someone")), 1L);
        someoneelse = setEntityId(new Account().setAccess(new Login().setLogin("someoneelse")), 2L);
    }

    Forum forum0() {
        return setEntityId(new Forum()
            .setTitle("Armor")
            .setThreadCount(0)
            .setMessageCount(0)
            .setStatus(ForumStatus.PENDING)
            .setAuthor(someone)
            .setDescription("Discussion about armor"),
    1L);
    }

    ForumMessage forumMessage1() {
        return setEntityId(new ForumMessage()
            .setPublishedDate(platformManager.today())
            .setStatus(ForumMessageStatus.LIVE)
            .setText("At start, Amarys was a small kingdom.")
            .setAuthor(someone),
        1L);
    }

    ForumThread forumThread0() {
        return setEntityId(new ForumThread()
            .setTitle("Sword of Eternity")
            .setLastMessage(forumMessage1())
            .setMessageCount(4)
            .setStatus(ForumThreadStatus.PENDING)
            .setAuthor(someone)
            .setDescription("History of the Sword Of Eternity"),
        1L);
    }

    ForumThread forumThread1() {
        return setEntityId(new ForumThread()
            .setTitle("Origin of Amarys")
            .setLastMessage(forumMessage1())
            .setMessageCount(4)
            .setStatus(ForumThreadStatus.LIVE)
            .setAuthor(someone)
            .setDescription("History of the Origin of Amarys"),
        1L);
    }

    ForumThread forumThread2() {
        return setEntityId(new ForumThread()
            .setTitle("Golden Age of Amarys")
            .setMessageCount(8)
            .setStatus(ForumThreadStatus.LIVE)
            .setAuthor(someone)
            .setDescription("History of the Golden Age of Amarys"),
        2L);
    }

    Forum forum1() {
        return setEntityId(new Forum()
            .setTitle("Amarys")
            .setThreadCount(3)
            .setLastMessage(forumMessage1())
            .setMessageCount(12)
            .setStatus(ForumStatus.LIVE)
            .setAuthor(someone)
            .setDescription("History of Amarys"),
        1L);
    }

    ForumMessage forumMessage2() {
        return setEntityId(new ForumMessage()
            .setPublishedDate(platformManager.today())
            .setStatus(ForumMessageStatus.LIVE)
            .setText("There are many spells.")
            .setAuthor(someone),
        1L);
    }

    Forum forum2() {
        return setEntityId(new Forum()
            .setTitle("Arcanic Magic")
            .setThreadCount(5)
            .setLastMessage(forumMessage2())
            .setMessageCount(22)
            .setStatus(ForumStatus.LIVE)
            .setAuthor(someone)
            .setDescription("Catalog of spells"),
        2L);
    }

    @Test
    public void getLiveForums() {
        dataManager.register("createQuery", null, null,
            "select f from Forum f " +
                "left join fetch f.lastMessage m " +
                "left join fetch m.thread " +
                "where f.status=:status");
        dataManager.register("setParameter", null, null, "status", ForumStatus.LIVE);
        dataManager.register("getResultList", arrayList(
                forum1(), forum2()
        ), null);
        Json result = forumController.getLive(params(), null);
        Assert.assertEquals("[{" +
            "\"messageCount\":12," +
            "\"lastMessage\":{" +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\"," +
                    "\"messageCount\":0,\"rating\":\"Squire\"" +
                "}," +
                "\"publishedDate\":\"2025-02-18\"" +
            "}," +
            "\"description\":\"History of Amarys\"," +
            "\"threadCount\":3,\"id\":1," +
            "\"title\":\"Amarys\"," +
            "\"version\":0,\"status\":\"live\"" +
        "},{" +
            "\"messageCount\":22," +
            "\"lastMessage\":{" +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\"," +
                    "\"messageCount\":0,\"rating\":\"Squire\"" +
                "}," +
                "\"publishedDate\":\"2025-02-18\"" +
            "}," +
            "\"description\":\"Catalog of spells\"," +
            "\"threadCount\":5,\"id\":2," +
            "\"title\":\"Arcanic Magic\"," +
            "\"version\":0,\"status\":\"live\"" +
        "}]", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetThreadsOfALivingForumWithoutGivingItsID() {
        try {
            forumController.getForumThreads(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetThreadsOfALivingForumWithoutGivingThePageNumber() {
        try {
            forumController.getForumThreads(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetThreadsOfANonLivingForum() {
        dataManager.register("find", forum0(), null, Forum.class, 1L);
        try {
            forumController.getForumThreads(params("id", "1", "page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Forum is not live.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getThreadsOfALivingForum() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("createQuery",
            null, null,
            "select count(t) from ForumThread t " +
                    "where t.status=:status and t.forum=:forum");
        dataManager.register("setParameter", null, null, "status", ForumThreadStatus.LIVE);
        dataManager.register("setParameter", null, null, "forum", forum);
        dataManager.register("getSingleResult", 2L, null, null);
        dataManager.register("createQuery",
        null, null,
    "select t from ForumThread t " +
            "left join fetch t.author w " +
            "left join fetch w.access " +
            "left join fetch t.lastMessage " +
            "join fetch t.forum " +
            "where t.status=:status and t.forum=:forum"
        );
        dataManager.register("setParameter", null, null, "status", ForumThreadStatus.LIVE);
        dataManager.register("setParameter", null, null, "forum", forum);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 16);
        dataManager.register("getResultList", arrayList(
                forumThread1(), forumThread2()
        ), null, null);
        Json result = forumController.getForumThreads(params("id", "1", "page", "0"), null);
        Assert.assertEquals("{" +
            "\"count\":2," +
            "\"threads\":[{" +
                "\"messageCount\":4," +
                "\"lastMessage\":{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"" +
                    "}," +
                    "\"publishedDate\":\"2025-02-18\"" +
                "}," +
                "\"description\":\"History of the Origin of Amarys\"," +
                "\"likeCount\":0," +
                "\"id\":1," +
                "\"title\":\"Origin of Amarys\"," +
                "\"version\":0,\"status\":\"live\"" +
            "},{" +
                "\"messageCount\":8," +
                "\"description\":\"History of the Golden Age of Amarys\"," +
                "\"likeCount\":0," +
                "\"id\":2," +
                "\"title\":\"Golden Age of Amarys\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]," +
            "\"pageSize\":16," +
            "\"page\":0" +
        "}",
        result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetMessagesOfAThreadWithoutGivingItsID() {
        try {
            forumController.getThreadMessages(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Thread ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetMessagesOfAThreadWithoutGivingThePageNumber() {
        try {
            forumController.getThreadMessages(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetMessagesOfANonLiveThread() {
        dataManager.register("find", forumThread0(), null, ForumThread.class, 1L);
        try {
            forumController.getThreadMessages(params("id", "1", "page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Thread is not live.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getMessagesOfALiveThread() {
        ForumThread forumThread = forumThread1();
        dataManager.register("find", forumThread, null, ForumThread.class, 1L);
        dataManager.register("createQuery",
            null, null,
            "select count(m) from ForumMessage m " +
                    "where m.thread=:thread and m.status=:status");
        dataManager.register("setParameter", null, null, "thread", forumThread);
        dataManager.register("setParameter", null, null, "status", ForumMessageStatus.LIVE);
        dataManager.register("getSingleResult", 2L, null, null);
        dataManager.register("createQuery",
            null, null,
            "select m from ForumMessage m " +
            "left join fetch m.author w " +
            "left join fetch w.access " +
            "join fetch m.thread " +
            "join fetch m.poll " +
            "where m.thread=:thread and m.status=:status " +
            "order by m.publishedDate desc"
        );
        dataManager.register("setParameter", null, null, "thread", forumThread);
        dataManager.register("setParameter", null, null, "status", ForumMessageStatus.LIVE);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 16);
        dataManager.register("getResultList", arrayList(
                forumMessage1(), forumMessage2()
        ), null, null);
        Json result = forumController.getThreadMessages(params("id", "1", "page", "0"), null);
        Assert.assertEquals("{" +
                "\"count\":2," +
                "\"messages\":[{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"," +
                        "\"id\":1,\"login\":\"someone\"" +
                    "}," +
                    "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                    "\"text\":\"At start, Amarys was a small kingdom.\"," +
                    "\"version\":0,\"status\":\"live\"" +
                "},{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"," +
                        "\"id\":1,\"login\":\"someone\"" +
                    "}," +
                    "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                    "\"text\":\"There are many spells.\"," +
                    "\"version\":0,\"status\":\"live\"" +
                "}]," +
                "\"pageSize\":16,\"page\":0" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAllMessagesOfAThreadWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.getAllThreadMessages(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Thread ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAllMessagesOfAThreadWithoutGivingThePageNumber() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.getAllThreadMessages(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAllGetMessagesOfANonLiveThread() {
        dataManager.register("find", forumThread0(), null, ForumThread.class, 1L);
        try {
            securityManager.doConnect("admin", 0);
            forumController.getAllThreadMessages(params("id", "1", "page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Thread is not live.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAllMessagesAsANonAdminUser() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.getAllThreadMessages(params("id", "1", "page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getAllMessagesOfAThread() {
        ForumThread forumThread = forumThread1();
        dataManager.register("find", forumThread, null, ForumThread.class, 1L);
        dataManager.register("createQuery",
            null, null,
            "select count(m) from ForumMessage m " +
                    "where m.thread=:thread");
        dataManager.register("setParameter", null, null, "thread", forumThread);
        dataManager.register("getSingleResult", 2L, null, null);
        dataManager.register("createQuery",
            null, null,
            "select m from ForumMessage m " +
                "left join fetch m.author w " +
                "left join fetch w.access " +
                "join fetch m.thread " +
                "join fetch m.poll " +
                "where m.thread=:thread " +
                "order by m.publishedDate desc"
        );
        dataManager.register("setParameter", null, null, "thread", forumThread);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 16);
        dataManager.register("getResultList", arrayList(
                forumMessage1(), forumMessage2()
        ), null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.getAllThreadMessages(params("id", "1", "page", "0"), null);
        Assert.assertEquals("{" +
                "\"count\":2," +
                "\"messages\":[{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"," +
                        "\"id\":1,\"login\":\"someone\"" +
                    "}," +
                    "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                    "\"text\":\"At start, Amarys was a small kingdom.\"," +
                    "\"version\":0,\"status\":\"live\"" +
                "},{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"," +
                        "\"id\":1,\"login\":\"someone\"" +
                    "}," +
                    "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                    "\"text\":\"There are many spells.\"," +
                    "\"version\":0,\"status\":\"live\"" +
                "}]," +
                "\"pageSize\":16,\"page\":0" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAllForumsAsANonAdminUser() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.getAllForums(params("id", "1", "page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getAllForums() {
        ForumThread forumThread = forumThread1();
        dataManager.register("createQuery",
            null, null,
            "select f from Forum f"
        );
        dataManager.register("getResultList", arrayList(
            forum1(), forum2()
        ), null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.getAllForums(params("id", "1", "page", "0"), null);
        Assert.assertEquals("[{" +
                "\"messageCount\":12," +
                "\"lastMessage\":{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"" +
                    "}," +
                    "\"publishedDate\":\"2025-02-18\"" +
                "}," +
                "\"description\":\"History of Amarys\"," +
                "\"threadCount\":3," +
                "\"id\":1," +
                "\"title\":\"Amarys\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "},{" +
                "\"messageCount\":22," +
                "\"lastMessage\":{" +
                    "\"author\":{" +
                        "\"firstName\":\"\",\"lastName\":\"\"," +
                        "\"messageCount\":0,\"rating\":\"Squire\"" +
                    "}," +
                    "\"publishedDate\":\"2025-02-18\"" +
                "}," +
                "\"description\":\"Catalog of spells\"," +
                "\"threadCount\":5," +
                "\"id\":2," +
                "\"title\":\"Arcanic Magic\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}]",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForForumCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.create(params(), Json.createJsonFromString(
                "{ 'comments': [{}], 'forum':1 }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
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
    public void checkMinFieldSizesForForumCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.create(params(), Json.createJsonFromString(
                "{ 'title':'t', 'description':'d', 'forum':1 }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForForumCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.create(params(), Json.createJsonFromString("{ " +
                    "'title':'" + generateText("a", 201) + "'," +
                    "'description':'" + generateText("d", 2001) + "', " +
                    "'forum':1 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 2000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForForumCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.create(params(), Json.createJsonFromString(
                    "{ 'forum':'ONE', 'title':'', 'description':'123', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"forum\":\"not a valid integer\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewForum() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Forum);
            Forum forum = (Forum) entity;
            Assert.assertEquals("Amarys", forum.getTitle());
            Assert.assertEquals("History of Amarys", forum.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.create(params(), Json.createJsonFromString(
        "{ " +
                "'title':'Amarys', " +
                "'description':'History of Amarys', " +
                "'forum':1 " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"comments\":[]," +
            "\"description\":\"History of Amarys\"," +
            "\"id\":0," +
            "\"title\":\"Amarys\"," +
            "\"version\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingForum() {
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof Forum);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.create(params(), Json.createJsonFromString("{ " +
                    "'title':'Amarys', " +
                    "'description':'History of Amarys', " +
                    "'forum':1 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Forum with title (Amarys) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewForumWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.create(params(), Json.createJsonFromString("{ " +
                    "'title':'Amarys', " +
                    "'description':'History of Amarys', " +
                    "'forum':1 " +
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
    public void failToCreateAForumForUnknownReason() {
        dataManager.register("persist", null,
            new PersistenceException("Some reason"),
            (Predicate) entity->{
                return (entity instanceof Forum);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.create(params(), Json.createJsonFromString("{ " +
                    "'title':'Amarys', " +
                    "'description':'History of Amarys', " +
                    "'forum':1 " +
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
    public void tryToGetAForumWithoutGivingItsID() {
        try {
            securityManager.doConnect("admin", 0);
            forumController.loadForum(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneForumById() {
        dataManager.register("find", forum1(), null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.loadForum(params("id", "1"), null);
        Assert.assertEquals("{" +
                "\"comments\":[]," +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\"," +
                    "\"id\":1,\"login\":\"someone\"" +
                "}," +
                "\"description\":\"History of Amarys\"," +
                "\"id\":1," +
                "\"title\":\"Amarys\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownForum() {
        dataManager.register("find",
                null, null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.loadForum(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAForumWithByCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.loadForum(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAForumWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAForum() {
        Forum forum = forum1();
        dataManager.register("find", forum,
                null, Forum.class, 1L);
        dataManager.register("createQuery", null, null,
                "select count(t) from ForumThread t where t.forum=:forum");
        dataManager.register("setParameter", null, null,
                "forum", forum);
        dataManager.register("getSingleResult", 0L, null);
        dataManager.register("merge", forum, null,
                forum);
        dataManager.register("remove", null, null,
                forum);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteANotEmptyForum() {
        Forum forum = forum1();
        dataManager.register("find", forum,
                null, Forum.class, 1L);
        dataManager.register("createQuery", null, null,
                "select count(t) from ForumThread t where t.forum=:forum");
        dataManager.register("setParameter", null, null,
                "forum", forum);
        dataManager.register("getSingleResult", 1L, null);
        securityManager.doConnect("admin", 0);
        try {
            forumController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Only empty forums may be deleted.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownForum() {
        dataManager.register("find",
                null, null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAForumAndFailsForAnUnknownReason() {
        dataManager.register("find",
                null,
                new PersistenceException("Some Reason"), Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAForumWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForForumUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString(
                    "{ 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForForumUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString(
                    "{ 'title':'t', 'description':'d' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForForumUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString("{ " +
                    "'title':'" + generateText("a", 201) + "'," +
                    "'description':'" + generateText("d", 2001) + "' " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 2000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForForumUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString(
                    "{ 'title':'', 'description':'123', 'status':'???' }"
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
    public void updateAnExistingForum() {
        Forum forum = setEntityId(new Forum(), 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.update(params("id", "1"), Json.createJsonFromString("{ " +
            "'title':'Amarys', " +
            "'description':'History of Amarys'" +
        "}"));
        Assert.assertEquals("{" +
            "\"comments\":[]," +
            "\"description\":\"History of Amarys\"," +
            "\"id\":1," +
            "\"title\":\"Amarys\"," +
            "\"version\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpateAForumThatDoesNotExists() {
        dataManager.register("find", null, null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'Amarys', " +
                "'description':'History of Amarys'" +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnExistingForumWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'Amarys', " +
                "'description':'History of Amarys'" +
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
    public void failToUpdateAForumForUnknownReason() {
        dataManager.register("find", null, new PersistenceException("Some Reason"), Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.update(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'Amarys', " +
                "'description':'History of Amarys'" +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAnUpdateAForumSStatus() {
        dataManager.register("find", forum0(),
                null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsForAnUpadteAForumSStatus() {
        dataManager.register("find", forum0(),
                null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void updateAForumSStatus() {
        Forum forum = forum0().setLastMessage(
            forumMessage1().setForumThread(forumThread1())
        );
        dataManager.register("find", forum,
                null, Forum.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.updateStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
            "\"messageCount\":0," +
            "\"lastMessage\":{" +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\"," +
                    "\"messageCount\":0,\"rating\":\"Squire\"" +
                "}," +
                "\"publishedDate\":\"2025-02-18\"," +
                "\"thread\":{" +
                    "\"title\":\"Origin of Amarys\"" +
                "}" +
            "}," +
            "\"description\":\"Discussion about armor\"," +
            "\"threadCount\":0," +
            "\"id\":1," +
            "\"title\":\"Armor\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}",
        result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAForumSStatusWithBadCredential() {
        dataManager.register("find", forum0(),
                null, Forum.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.updateStatus(params("id", "1"), Json.createJsonFromString(
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
    public void failToUpdateAForumSStatusForUnknownReason() {
        dataManager.register("find", forum0(),
                null, Forum.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':1, 'status': 'live' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetThreadsOfAForumWithoutGivingItsID() {
        try {
            securityManager.doConnect("admin", 0);
            forumController.getAllThreads(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetThreadsOfAForumWithoutGivingThePageNumber() {
        try {
            securityManager.doConnect("admin", 0);
            forumController.getAllThreads(params("forum", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void listAllForumThreads() {
        Forum forum = forum0();
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("createQuery", null, null,
        "select count(t) from ForumThread t " +
            "where t.forum=:forum");
        dataManager.register("setParameter", null, null, "forum", forum);
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
        "select t from ForumThread t " +
            "left outer join fetch t.forum " +
            "left outer join fetch t.author a " +
            "left outer join fetch a.access " +
            "where t.forum=:forum");
        dataManager.register("setParameter", null, null, "forum", forum);
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 16);
        dataManager.register("getResultList", arrayList(
                forumThread1(), forumThread2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.getAllThreads(params("page", "0", "forum", "1"), null);
        Assert.assertEquals(
            "{" +
                "\"count\":2," +
                "\"threads\":[{" +
                    "\"messageCount\":4,\"lastMessage\":{" +
                        "\"author\":{" +
                            "\"firstName\":\"\",\"lastName\":\"\"," +
                            "\"messageCount\":0,\"rating\":\"Squire\"" +
                        "}," +
                        "\"publishedDate\":\"2025-02-18\"" +
                    "}," +
                    "\"description\":\"History of the Origin of Amarys\"," +
                    "\"likeCount\":0," +
                    "\"id\":1," +
                    "\"title\":\"Origin of Amarys\"," +
                    "\"version\":0," +
                    "\"status\":\"live\"" +
                "},{" +
                    "\"messageCount\":8," +
                    "\"description\":\"History of the Golden Age of Amarys\"," +
                    "\"likeCount\":0," +
                    "\"id\":2," +
                    "\"title\":\"Golden Age of Amarys\"," +
                    "\"version\":0," +
                    "\"status\":\"live\"" +
                "}]," +
                "\"pageSize\":16,\"page\":0" +
            "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForThreadCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString(
                "{ 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"forum\":\"required\"," +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"description\":\"required\"," +
                "\"title\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForThreadCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString(
                "{ 'forum':1, 'title':'t', 'description':'d' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForThreadCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString("{ " +
                "'forum':1," +
                "'title':'" + generateText("a", 201) + "'," +
                "'description':'" + generateText("d", 2001) + "' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 2000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForThreadCreation() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString(
                    "{ 'forum':'ONE', 'title':'', 'description':'123', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"forum\":\"not a valid integer\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewThread() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof ForumThread);
            ForumThread forumThread = (ForumThread) entity;
            Assert.assertEquals("Origin of Amarys", forumThread.getTitle());
            Assert.assertEquals(forum, forumThread.getForum());
            Assert.assertEquals("History of Origin of Amarys", forumThread.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.createThread(params(), Json.createJsonFromString("{ " +
            "'title':'Origin of Amarys', " +
            "'forum':1, " +
            "'description':'History of Origin of Amarys'" +
        "}"));
        Assert.assertEquals("{" +
            "\"messageCount\":0," +
            "\"comments\":[]," +
            "\"description\":\"History of Origin of Amarys\"," +
            "\"likeCount\":0," +
            "\"id\":0," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingThread() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof ForumThread);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString("{ " +
                "'title':'Origin of Amarys', " +
                "'forum':1, " +
                "'description':'History of Origin of Amarys'" +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Thread with title (Origin of Amarys) already exists inside the forum", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewThreadWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString("{ " +
                "'title':'Origin of Amarys', " +
                "'forum':1, " +
                "'description':'History of Origin of Amarys'" +
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
    public void failToCreateAThreadForUnknownReason() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("persist", null,
            new PersistenceException("Some reason"),
            (Predicate) entity->{
                return (entity instanceof ForumThread);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.createThread(params(), Json.createJsonFromString("{ " +
                "'title':'Origin of Amarys', " +
                "'forum':1, " +
                "'description':'History of Origin of Amarys'" +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForThreadProposal() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.proposeThread(params(), Json.createJsonFromString(
                    "{ }"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"forum\":\"required\"," +
                "\"description\":\"required\"," +
                "\"title\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForThreadProposal() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.proposeThread(params(), Json.createJsonFromString("{" +
                " 'title':'n'," +
                " 'description':'f'," +
                " 'forum':1" +
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
    public void checkMaxFieldSizesForThreadProposal() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.proposeThread(params(), Json.createJsonFromString("{" +
                " 'title':'" + generateText("f", 201) + "'," +
                " 'description':'" + generateText("f", 2001) + "', " +
                " 'forum':1" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 2000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForThreadProposal() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.proposeThread(params(), Json.createJsonFromString(
                "{ 'description': '123', 'title':'...', 'forum':1, 'status':'???' }"
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
    public void createNewThreadProposal() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof ForumThread);
            ForumThread forumThread = (ForumThread) entity;
            Assert.assertEquals("Origin of Amarys", forumThread.getTitle());
            Assert.assertEquals(forum, forumThread.getForum());
            Assert.assertEquals("History of Origin of Amarys", forumThread.getDescription());
            return true;
        });
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = forumController.proposeThread(params(), Json.createJsonFromString("{" +
                "'title':'Origin of Amarys', " +
                "'forum':1, " +
                "'description':'History of Origin of Amarys'" +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"messageCount\":0," +
            "\"description\":\"History of Origin of Amarys\"," +
            "\"likeCount\":0,\"id\":0," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0," +
            "\"status\":\"prp\"" +
        "}", result.toString());
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAnAlreadyExistingThread() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null,
                new EntityExistsException("Entity already Exists"),
                (Predicate) entity->{
                    return (entity instanceof ForumThread);
                }
        );
        securityManager.doConnect("someone", 0);
        try {
            forumController.proposeThread(params(), Json.createJsonFromString("{" +
                "'title':'Origin of Amarys', " +
                "'forum':1, " +
                "'description':'History of Origin of Amarys'" +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Thread with title (Origin of Amarys) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToProposeAThreadFromAnUnknownAuthor() {
        Forum forum = forum1();
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", null, new NoResultException("Account not found."), null);
        securityManager.doConnect("someone", 0);
        try {
            forumController.proposeThread(params(), Json.createJsonFromString("{" +
                "'title':'Origin of Amarys', " +
                "'forum':1, " +
                "'description':'History of Origin of Amarys'" +
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
    public void tryToAmendAThemeWithoutGivingItsID() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.amendThread(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Thread ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    ForumThread threadBelongingToSomeone() {
        return forumThread1().setAuthor(
            new Account().setAccess(
                new Login().setLogin("someone")
            )
        );
    }

    @Test
    public void checkMinFieldSizesForThemeAmend() {
        dataManager.register("find",
            threadBelongingToSomeone(),
            null, ForumThread.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.amendThread(params("id", "1"), Json.createJsonFromString("{ " +
                " 'title':'n'," +
                " 'description':'f'," +
                " 'forum':1" +
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
                threadBelongingToSomeone(),
                null, Theme.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        try {
            forumController.amendThread(params("id", "1"), Json.createJsonFromString("{ " +
                " 'title':'" + generateText("f", 201) + "'," +
                " 'description':'" + generateText("f", 2001) + "', " +
                " 'forum':1" +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 2000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForAThreadAmend() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.amendThread(params("id", "1"), Json.createJsonFromString(
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
    public void amendAThread() {
        Forum forum = forum1();
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = forumController.amendThread(params("id", "1"), Json.createJsonFromString("{" +
            "'title':'Origin of Amarys', " +
            "'forum':1, " +
            "'description':'History of Origin of Amarys'" +
        "}"));
        Assert.assertEquals("{" +
            "\"messageCount\":4," +
            "\"lastMessage\":{" +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\"," +
                    "\"messageCount\":0,\"rating\":\"Squire\"" +
                "}," +
                "\"publishedDate\":\"2025-02-18\"" +
            "}," +
            "\"description\":\"History of Origin of Amarys\"," +
            "\"likeCount\":0,\"id\":1," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}",
        result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAThreadReferringToAnUnknownForum() {
        Forum forum = forum1();
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", null, null, Forum.class, 1L);
        try {
            securityManager.doConnect("someone", 0);
            forumController.amendThread(params("id", "1"),
                Json.createJsonFromString("{" +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unknown Forum with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkThatAnAdminIsAllowedToAmendAThread() {
        Forum forum = forum1();
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.amendThread(params("id", "1"), Json.createJsonFromString("{" +
            "'title':'Origin of Amarys', " +
            "'forum':1, " +
            "'description':'History of Origin of Amarys'" +
        "}"));
        Assert.assertEquals("{" +
            "\"messageCount\":4," +
            "\"lastMessage\":{" +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"messageCount\":0,\"rating\":\"Squire\"}," +
                "\"publishedDate\":\"2025-02-18\"" +
            "}," +
            "\"description\":\"History of Origin of Amarys\"," +
            "\"likeCount\":0,\"id\":1," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}",
        result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void checkThatAnAdminIsAllowedToAmendAThreadBelongingToNobody() {
        Forum forum = forum1();
        ForumThread thread = forumThread1().setAuthor(null);
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.amendThread(params("id", "1"), Json.createJsonFromString("{" +
            "'title':'Origin of Amarys', " +
            "'forum':1, " +
            "'description':'History of Origin of Amarys'" +
        "}"));
        Assert.assertEquals("{" +
            "\"messageCount\":4," +
            "\"lastMessage\":{" +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"messageCount\":0,\"rating\":\"Squire\"}," +
                "\"publishedDate\":\"2025-02-18\"" +
            "}," +
            "\"description\":\"History of Origin of Amarys\"," +
            "\"likeCount\":0,\"id\":1," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}",
        result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAThreadByAnUnknownAccount() {
        Forum forum = forum1();
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        try {
            securityManager.doConnect("someoneelse", 0);
            forumController.amendThread(params("id", "1"),
                Json.createJsonFromString("{" +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
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
    public void tryToAmendAnUnknownThread() {
        dataManager.register("find", null, null, ForumThread.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.amendThread(params("id", "1"),
                Json.createJsonFromString("{" +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Thread with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToAmendAThemeAndFailPourAnUnknownReason() {
        Forum forum = forum1();
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("flush", null, new PersistenceException("Some Reason."));
        securityManager.doConnect("someone", 0);
        try {
            forumController.amendThread(params("id", "1"),
                Json.createJsonFromString("{" +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAThreadWithoutGivingItsID() {
        try {
            securityManager.doConnect("admin", 0);
            forumController.loadThread(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Thread ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getAThreadById() {
        dataManager.register("find", forumThread1(), null, ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.loadThread(params("id", "1"), null);
        Assert.assertEquals("{" +
            "\"messageCount\":4," +
            "\"comments\":[]," +
            "\"author\":{" +
                "\"firstName\":\"\",\"lastName\":\"\"," +
                "\"messageCount\":0,\"rating\":\"Squire\"," +
                "\"id\":1,\"login\":\"someone\"" +
            "}," +
            "\"description\":\"History of the Origin of Amarys\"," +
            "\"likeCount\":0,\"id\":1," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0,\"status\":\"live\"" +
        "}",
        result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownThread() {
        dataManager.register("find",
                null, null, ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.loadThread(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Thread with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAThreadWithByCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.loadThread(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAThreadWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteThread(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Thread ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAThread() {
        ForumThread forumThread = forumThread1();
        dataManager.register("find", forumThread,
            null, ForumThread.class, 1L);
        dataManager.register("createQuery", null, null,
            "select count(m) from ForumMessage m where m.thread=:thread");
        dataManager.register("setParameter", null, null,
            "thread", forumThread);
        dataManager.register("getSingleResult", 0L, null);
        dataManager.register("merge", forumThread, null,
            forumThread);
        dataManager.register("remove", null, null,
            forumThread);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.deleteThread(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
            "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteANotEmptyThread() {
        ForumThread forumThread = forumThread1();
        dataManager.register("find", forumThread,
            null, ForumThread.class, 1L);
        dataManager.register("createQuery", null, null,
            "select count(m) from ForumMessage m where m.thread=:thread");
        dataManager.register("setParameter", null, null,
            "thread", forumThread);
        dataManager.register("getSingleResult", 1L, null);
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteThread(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Only empty threads may be deleted.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownThread() {
        dataManager.register("find",
                null, null, ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteThread(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Thread with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAThreadAndFailsForAnUnknownReason() {
        dataManager.register("find",
                null,
                new PersistenceException("Some Reason"), ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteThread(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAThreadWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.deleteThread(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForAThreadUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString(
                    "{ 'comments': [{}] }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"comments-version\":\"required\"," +
                "\"comments-date\":\"required\"," +
                "\"comments-text\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForAThreadUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString(
                "{ 'title':'t', 'description':'d' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must be greater of equals to 2\"," +
                "\"title\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForAThreadUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString("{ " +
                "'title':'" + generateText("a", 201) + "'," +
                "'description':'" + generateText("d", 2001) + "' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"description\":\"must not be greater than 2000\"," +
                "\"title\":\"must not be greater than 200\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForAThreadUpdate() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString(
                    "{ 'title':'', 'description':'123', 'forum':'ONE', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"forum\":\"not a valid integer\"," +
                "\"title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"status\":\"??? must matches one of [pnd, live, prp]\"" +
            "}", sce.getMessage());
        }
    }

    @Test
        public void updateAnExistingThread() {
        ForumThread forumThread = forumThread1();
        Forum forum = forum1();
        dataManager.register("find", forumThread, null, ForumThread.class, 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("find", someoneelse, null, Account.class, 2L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.updateThread(params("id", "1"), Json.createJsonFromString(   "{ " +
            "'title':'Origin of Amarys', " +
            "'forum':1, " +
            "'author':2, " +
            "'description':'History of Origin of Amarys'" +
        "}"));
        Assert.assertEquals("{" +
            "\"messageCount\":4," +
            "\"comments\":[]," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"messageCount\":0,\"rating\":\"Squire\",\"id\":2,\"login\":\"someoneelse\"}," +
            "\"description\":\"History of Origin of Amarys\"," +
            "\"likeCount\":0," +
            "\"id\":1," +
            "\"title\":\"Origin of Amarys\"," +
            "\"version\":0," +
            "\"status\":\"live\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAThreadReferringToAnUnknownForum() {
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", null, null, Forum.class, 1L);
        try {
            securityManager.doConnect("admin", 0);
            forumController.updateThread(params("id", "1"),
                Json.createJsonFromString("{" +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'author':2, " +
                    "'description':'History of Origin of Amarys'" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unknown Forum with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAThreadReferringToAnUnknownAuthor() {
        Forum forum = forum1();
        ForumThread thread = threadBelongingToSomeone();
        dataManager.register("find", thread, null, ForumThread.class, 1L);
        dataManager.register("find", forum, null, Forum.class, 1L);
        dataManager.register("find", null, null, Account.class, 2L);
        try {
            securityManager.doConnect("admin", 0);
            forumController.updateThread(params("id", "1"),
                Json.createJsonFromString("{" +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'author':2, " +
                    "'description':'History of Origin of Amarys'" +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unknown Account with id 2", sce.getMessage());
        }
        dataManager.hasFinished();
    }






    @Test
    public void tryToUpateAThreadThatDoesNotExists() {
        dataManager.register("find", null, null, ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString("{ " +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Thread with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpateAThreadOfAForumThatDoesNotExists() {
        dataManager.register("find", forumThread1(), null, ForumThread.class, 1L);
        dataManager.register("find", null, null, Forum.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString("{ " +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unknown Forum with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnExistingThreadWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString("{ " +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
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
    public void failToUpdateAThreadForUnknownReason() {
        dataManager.register("find", null, new PersistenceException("Some Reason"), ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThread(params("id", "1"), Json.createJsonFromString("{ " +
                    "'title':'Origin of Amarys', " +
                    "'forum':1, " +
                    "'description':'History of Origin of Amarys'" +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsForAnUpdateAThreadSStatus() {
        dataManager.register("find", forumThread0(),
                null, ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThreadStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsForAnUpadteAThreadSStatus() {
        dataManager.register("find", forumThread0(),
                null, ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThreadStatus(params("id", "1"), Json.createJsonFromString(
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
    public void upadteAThreadSStatus() {
        dataManager.register("find", forumThread0(),
                null, ForumThread.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.updateThreadStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'live' }"
        ));
        Assert.assertEquals("{" +
                "\"messageCount\":4," +
                "\"lastMessage\":{" +
                    "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"messageCount\":0,\"rating\":\"Squire\"}," +
                    "\"publishedDate\":\"2025-02-18\"" +
                "}," +
                "\"description\":\"History of the Sword Of Eternity\"," +
                "\"likeCount\":0," +
                "\"id\":1," +
                "\"title\":\"Sword of Eternity\"," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAThreadSStatusWithBadCredential() {
        dataManager.register("find", forumThread0(),
                null, ForumThread.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.updateThreadStatus(params("id", "1"), Json.createJsonFromString(
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
    public void failToUpdateAThreadSStatusForUnknownReason() {
        dataManager.register("find", forumThread0(),
                null, ForumThread.class, 1L);
        dataManager.register("flush", null,
                new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateThreadStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':1, 'status': 'live' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForMessagePost() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.postMessage(params(), Json.createJsonFromString(
                    "{ }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"text\":\"required\",\"thread\":\"required\"}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForMessagePost() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.postMessage(params(), Json.createJsonFromString(
                    "{ 'text':'t', 'thread':1 }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"text\":\"must be greater of equals to 2\"}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForMessagePost() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.postMessage(params(), Json.createJsonFromString("{ " +
                    "'text':'" + generateText("a", 10001) + "', 'thread':1" +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"text\":\"must not be greater than 10000\"}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForMessagePost() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.postMessage(params(), Json.createJsonFromString(
                    "{ 'thread':'ONE', 'text':'123' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"thread\":\"not a valid integer\"}", sce.getMessage());
        }
    }

    @Test
    public void postAMessage() {
        Ref<ForumMessage> forumMessage = new Ref<>();
        Forum forum = forum1();
        ForumThread forumThread = forumThread1().setForum(forum);
        dataManager.register("find", forumThread, null, ForumThread.class, 1L);
        Account account = new Account().setAccess(new Login().setLogin("someone"));
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null, "login", "someone");
        dataManager.register("getSingleResult", account, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof ForumMessage);
            forumMessage.set((ForumMessage) entity);
            Assert.assertEquals("I think so.", forumMessage.get().getText());
            Assert.assertEquals(forumThread, forumMessage.get().getForumThread());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("merge", forumMessage, null, forumMessage);
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = forumController.postMessage(params(), Json.createJsonFromString("{ " +
                "'text':'I think so.'," +
                "'thread':1 " +
            "}"
        ));
        Assert.assertEquals("{" +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\",\"messageCount\":0,\"rating\":\"Squire\"," +
                    "\"id\":0,\"login\":\"someone\"" +
                "}," +
                "\"id\":0," +
                "\"publishedDate\":\"2025-02-18\"," +
                "\"text\":\"I think so.\"," +
                "\"poll\":{\"id\":0,\"likes\":0}," +
                "\"version\":0," +
                "\"status\":\"live\"" +
            "}", result.toString());
        Assert.assertEquals(forumMessage.get(), forumThread.getLastMessage());
        Assert.assertEquals(forumMessage.get(), forum.getLastMessage());
        dataManager.hasFinished();
    }

    @Test
    public void tryToPostAMessageWithoutBeingConnected() {
        try {
            forumController.postMessage(params(), Json.createJsonFromString("{ " +
                    "'text':'I think so.'," +
                    "'thread':1 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not connected", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void failToPostAMessageForAnUnknownReason() {
        Forum forum = forum1();
        dataManager.register("find", null, new PersistenceException("Some reason"), ForumThread.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.postMessage(params(), Json.createJsonFromString("{ " +
                    "'text':'I think so.'," +
                    "'thread':1 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMessageWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteMessage(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Message ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAMessage() {
        Forum forum = forum1();
        ForumThread forumThread = forumThread1().setForum(forum);
        ForumMessage forumMessage = forumMessage1().setForumThread(forumThread);
        ForumMessage lastMessage = forumMessage2().setForumThread(forumThread);
        forumThread.setLastMessage(lastMessage);
        forum.setLastMessage(lastMessage);
        dataManager.register("find", forumMessage,
                null, ForumMessage.class, 1L);
        dataManager.register("merge", forumMessage, null,
                forumMessage);
        dataManager.register("remove", null, null,
                forumMessage);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.deleteMessage(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        Assert.assertEquals(lastMessage, forum.getLastMessage());
        Assert.assertEquals(lastMessage, forumThread.getLastMessage());
        dataManager.hasFinished();
    }

    @Test
    public void deleteTheLastMessage() {
        Forum forum = forum1();
        ForumThread forumThread = forumThread1().setForum(forum);
        ForumMessage forumMessage = forumMessage1().setForumThread(forumThread);
        forumThread.setLastMessage(forumMessage);
        forum.setLastMessage(forumMessage);
        dataManager.register("find", forumMessage,
                null, ForumMessage.class, 1L);
        dataManager.register("merge", forumMessage, null,
                forumMessage);
        dataManager.register("remove", null, null,
                forumMessage);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.deleteMessage(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        Assert.assertNull(forum.getLastMessage());
        Assert.assertNull(forumThread.getLastMessage());
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownMessage() {
        dataManager.register("find",
                null, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteMessage(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Message with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMessageAndFailsForAnUnknownReason() {
        dataManager.register("find",
                null,
                new PersistenceException("Some Reason"), ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.deleteMessage(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAMessageWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.deleteMessage(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequestedFieldsToUpdateAMessageSStatus() {
        dataManager.register("find", forumMessage1(),
                null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateMessageStatus(params("id", "1"), Json.createJsonFromString(
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
    public void checkFieldValidationsToUpdateAMessageSStatus() {
        dataManager.register("find", forumMessage1(),
                null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateMessageStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':'1234', 'status':'???'}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{\"id\":\"Not a valid id\",\"status\":\"??? must matches one of [blk, arc, live]\"}", sce.getMessage());
        }
    }

    @Test
    public void upadteAMessageSStatus() {
        dataManager.register("find", forumMessage1(),
                null, ForumMessage.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.updateMessageStatus(params("id", "1"), Json.createJsonFromString(
                "{ 'id':1, 'status': 'blk' }"
        ));
        Assert.assertEquals("{" +
                "\"author\":{" +
                    "\"firstName\":\"\",\"lastName\":\"\",\"messageCount\":0,\"rating\":\"Squire\"," +
                    "\"id\":1,\"login\":\"someone\"" +
                "}," +
                "\"id\":1," +
                "\"publishedDate\":\"2025-02-18\"," +
                "\"text\":\"At start, Amarys was a small kingdom.\"," +
                "\"version\":0," +
                "\"status\":\"blk\"" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpadteAMessageSStatusWithBadCredential() {
        dataManager.register("find", forumMessage1(),
                null, ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.updateMessageStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':1, 'status': 'blk' }"
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
    public void failToUpdateAMessageSStatusForUnknownReason() {
        dataManager.register("find", forumMessage1(),
            null, ForumMessage.class, 1L);
        dataManager.register("flush", null,
            new PersistenceException("Some reason"), null
        );
        securityManager.doConnect("admin", 0);
        try {
            forumController.updateMessageStatus(params("id", "1"), Json.createJsonFromString(
                    "{ 'id':1, 'status': 'live' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void voteALike() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.DISLIKE);
        ForumThread forumThread = forumThread1().setLikeCount(120);
        ForumMessage forumMessage = forumMessage1()
            .setForumThread(forumThread)
            .setPoll(likePoll);
        dataManager.register("find",
            forumMessage, null, ForumMessage.class, 1L);
        dataManager.register("createQuery",
            null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
            null, null, "poll", likePoll);
        dataManager.register("setParameter",
            null, null, "user", "someone");
        dataManager.register("getSingleResult",
            likeVote, null, null);
        dataManager.register("find",
            forumMessage, null, ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        Json result = forumController.vote(params("message", "1"), Json.createJsonFromString(
                "{ 'option': 'like' }"
        ));
        Assert.assertEquals("{" +
            "\"dislikes\":7," +
            "\"likes\":103," +
            "\"option\":\"like\"" +
        "}", result.toString());
        Assert.assertEquals(103, likePoll.getLikes());
        Assert.assertEquals(7, likePoll.getDislikes());
        Assert.assertEquals(121, forumThread.getlikeCount());
        dataManager.hasFinished();
    }

    @Test
    public void voteADislike() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.LIKE);
        ForumThread forumThread = forumThread1().setLikeCount(120);
        ForumMessage forumMessage = forumMessage1()
                .setForumThread(forumThread)
                .setPoll(likePoll);
        dataManager.register("find",
                forumMessage, null, ForumMessage.class, 1L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                likeVote, null, null);
        dataManager.register("find",
                forumMessage, null, ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        Json result = forumController.vote(params("message", "1"), Json.createJsonFromString(
                "{ 'option': 'dislike' }"
        ));
        Assert.assertEquals("{" +
                "\"dislikes\":9," +
                "\"likes\":101," +
                "\"option\":\"dislike\"" +
                "}", result.toString());
        Assert.assertEquals(101, likePoll.getLikes());
        Assert.assertEquals(9, likePoll.getDislikes());
        Assert.assertEquals(121, forumThread.getlikeCount());
        dataManager.hasFinished();
    }

    @Test
    public void removeALike() {
        LikePoll likePoll = new LikePoll().setLikes(102).setDislikes(8);
        LikeVote likeVote = new LikeVote().setPoll(likePoll).setVoter(someone).setOption(LikeVoteOption.LIKE);
        ForumThread forumThread = forumThread1().setLikeCount(120);
        ForumMessage forumMessage = forumMessage1()
                .setForumThread(forumThread)
                .setPoll(likePoll);
        dataManager.register("find",
                forumMessage, null, ForumMessage.class, 1L);
        dataManager.register("createQuery",
                null, null, "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user");
        dataManager.register("setParameter",
                null, null, "poll", likePoll);
        dataManager.register("setParameter",
                null, null, "user", "someone");
        dataManager.register("getSingleResult",
                likeVote, null, null);
        dataManager.register("merge",
                likeVote, null, likeVote);
        dataManager.register("remove",
                null, null, likeVote);
        dataManager.register("flush",
                null, null, null);
        dataManager.register("find",
                forumMessage, null, ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        Json result = forumController.vote(params("message", "1"), Json.createJsonFromString(
                "{ 'option': 'none' }"
        ));
        Assert.assertEquals("{" +
            "\"dislikes\":8," +
            "\"likes\":101," +
            "\"option\":\"none\"" +
        "}", result.toString());
        Assert.assertEquals(101, likePoll.getLikes());
        Assert.assertEquals(8, likePoll.getDislikes());
        Assert.assertEquals(119, forumThread.getlikeCount());
        dataManager.hasFinished();
    }

    @Test
    public void voteOnAnNonExistingVote() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        ForumThread forumThread = forumThread1().setLikeCount(120);
        ForumMessage forumMessage = forumMessage1()
            .setForumThread(forumThread)
            .setPoll(likePoll);
        dataManager.register("find",
            forumMessage, null, ForumMessage.class, 1L);
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
        dataManager.register("find",
            forumMessage, null, ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        Json result = forumController.vote(params("message", "1"), Json.createJsonFromString(
            "{ 'option': 'like' }"
        ));
        Assert.assertEquals("{" +
            "\"dislikes\":8," +
            "\"likes\":103," +
            "\"option\":\"like\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void voteAndMeetAPersistenceExceptionBeforeVoteProcessing() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        ForumThread forumThread = forumThread1().setLikeCount(120);
        ForumMessage forumMessage = forumMessage1()
                .setForumThread(forumThread)
                .setPoll(likePoll);
        dataManager.register("find",
                null, new PersistenceException("Some Reason"), ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.vote(params("message", "1"), Json.createJsonFromString(
                    "{ 'option': 'like' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void voteAndMeetAPersistenceExceptionInVoteProcessing() {
        LikePoll likePoll = setEntityId(new LikePoll().setLikes(102).setDislikes(8), 101L);
        ForumThread forumThread = forumThread1().setLikeCount(120);
        ForumMessage forumMessage = forumMessage1()
                .setForumThread(forumThread)
                .setPoll(likePoll);
        dataManager.register("find",
                forumMessage, null, ForumMessage.class, 1L);
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
            forumController.vote(params("message", "1"), Json.createJsonFromString(
                    "{ 'option': 'like' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void nonVoteOnAnExistingMessage() {
        dataManager.register("find",
                null, null, ForumMessage.class, 1L);
        securityManager.doConnect("someone", 0);
        try {
            forumController.vote(params("message", "1"), Json.createJsonFromString(
                    "{ 'option': 'like' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Message with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToVoteWithoutGivingVoteId() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.vote(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("A valid Message Id must be provided.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToVoteWithoutGivingAWrongVoteOption() {
        securityManager.doConnect("someone", 0);
        try {
            securityManager.doConnect("someone", 0);
            Json result = forumController.vote(params("message", "1"), Json.createJsonFromString(
                    "{ }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Vote option must be one of these: 'like', 'dislike' or 'none'.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToVoteWithoutGivingAnyVoteOption() {
        securityManager.doConnect("someone", 0);
        try {
            securityManager.doConnect("someone", 0);
            Json result = forumController.vote(params("message", "1"), Json.createJsonFromString(
                    "{ 'option': '???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("Vote option must be one of these: 'like', 'dislike' or 'none'.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    Report report1() {
        return setEntityId(new Report()
            .setSendDate(platformManager.today())
            .setCategory("forum-message")
            .setTarget(1L)
            .setReason("False report")
            .setStatus(ReportStatus.IN_PROGRESS)
            .setText("This is a false report.")
            .setAuthor(someone),
        1L);
    }

    Report report2() {
        return setEntityId(new Report()
            .setSendDate(platformManager.today())
            .setCategory("forum-message")
            .setTarget(2L)
            .setReason("Violent report")
            .setStatus(ReportStatus.IN_PROGRESS)
            .setText("This is a violent report.")
            .setAuthor(someone),
        1L);
    }

    @Test
    public void tryToListReportsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.getAllReports(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void listAllReports() {
        dataManager.register("createQuery", null, null,
                "select count(r) from Report r " +
                "where r.category=:category");
        dataManager.register("setParameter", null, null,"category", "forum-message");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
            "select r from Report r " +
                "left outer join fetch r.author a " +
                "left outer join fetch a.access " +
                "where r.category=:category order by r.sendDate desc"
        );
        dataManager.register("setParameter", null, null,"category", "forum-message");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 16);
        dataManager.register("getResultList", arrayList(
                report1(), report2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.getAllReports(params("page", "0"), null);
        Assert.assertEquals("{" +
            "\"reports\":[{" +
                "\"reason\":\"False report\"," +
                "\"sendDate\":\"2025-02-18\"," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1," +
                "\"text\":\"This is a false report.\"," +
                "\"version\":0," +
                "\"target\":1" +
            "},{" +
                "\"reason\":\"Violent report\"," +
                "\"sendDate\":\"2025-02-18\"," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1," +
                "\"text\":\"This is a violent report.\"," +
                "\"version\":0," +
                "\"target\":2" +
            "}]," +
            "\"count\":2," +
            "\"pageSize\":16," +
            "\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listReportsWithASearchPattern() {
        dataManager.register("createQuery", null, null,
        "select count(r) from Report r " +
            "where r.category=:category " +
            "and fts('pg_catalog.english', r.reason||' '||" +
            "r.text||' '||r.status, :search) = true"
        );
        dataManager.register("setParameter", null, null,"category", "forum-message");
        dataManager.register("setParameter", null, null,"search", "Violent");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
        "select r from Report r " +
            "left outer join fetch r.author a " +
            "left outer join fetch a.access " +
            "where r.category=:category and fts('pg_catalog.english', r.reason||' '||" +
            "r.text||' '||r.status, :search) = true order by r.sendDate desc"
        );
        dataManager.register("setParameter", null, null,"category", "forum-message");
        dataManager.register("setParameter", null, null,"search", "Violent");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 16);
        dataManager.register("getResultList", arrayList(
                report1(), report2()
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = forumController.getAllReports(params("page", "0", "search", "Violent"), null);
        Assert.assertEquals("{" +
            "\"reports\":[{" +
                "\"reason\":\"False report\"," +
                "\"sendDate\":\"2025-02-18\"," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1," +
                "\"text\":\"This is a false report.\"," +
                "\"version\":0," +
                "\"target\":1" +
            "},{" +
                "\"reason\":\"Violent report\"," +
                "\"sendDate\":\"2025-02-18\"," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1," +
                "\"text\":\"This is a violent report.\"," +
                "\"version\":0," +
                "\"target\":2" +
            "}]," +
            "\"count\":2," +
            "\"pageSize\":16," +
            "\"page\":0" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllReportsWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.getAllReports(params("page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToGetAReportWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.loadReport(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Report ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneReportById() {
        ForumMessage message = forumMessage1();
        message.setForumThread(forumThread1().setForum(forum1()));
        dataManager.register("find",
                report1(), null, Report.class, 1L);
        dataManager.register("find",
                message, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.loadReport(params("id", "1"), null);
        Assert.assertEquals("{" +
                        "\"reason\":\"False report\"," +
                        "\"sendDate\":\"2025-02-18\"," +
                        "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                        "\"id\":1," +
                        "\"text\":\"This is a false report.\"," +
                        "\"message\":{" +
                            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                            "\"id\":1," +
                            "\"publishedDate\":\"2025-02-18\"," +
                            "\"text\":\"At start, Amarys was a small kingdom.\"," +
                            "\"thread\":{" +
                                "\"forum\":{" +
                                    "\"id\":1," +
                                    "\"title\":\"Amarys\"" +
                                "}," +
                                "\"id\":1," +
                                "\"title\":\"Origin of Amarys\"" +
                            "}," +
                            "\"version\":0" +
                        "}," +
                        "\"version\":0," +
                        "\"target\":1" +
                    "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownReport() {
        dataManager.register("find", null, null, Report.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.loadReport(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Report with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAReportWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.loadReport(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForReporting() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.report(params(), Json.createJsonFromString(
                    "{ }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reason\":\"required\"," +
                "\"text\":\"required\"," +
                "\"target\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForReporting() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.report(params(), Json.createJsonFromString(
                "{ 'reason':'r', 'text':'t', 'target':101 }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reason\":\"must be greater of equals to 2\"," +
                "\"text\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForReporting() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                    "'reason':'" + generateText("r", 201) + "'," +
                    "'text':'" + generateText("t", 5001) + "', " +
                    "'target':101 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reason\":\"must not be greater than 200\"," +
                "\"text\":\"must not be greater than 5000\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkFieldValidityForReporting() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.report(params(), Json.createJsonFromString(
                    "{ 'target':'ONE', 'reason':'???', 'text':'123', 'status':'???' }"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reason\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"target\":\"not a valid integer\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void report() {
        dataManager.register("createQuery", null, null,
            "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter",
                null, null, "login", "someone");
        dataManager.register("getSingleResult",
                someone, null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Report);
            Report report = (Report) entity;
            Assert.assertEquals("False report", report.getReason());
            Assert.assertEquals("The message is false", report.getText());
            Assert.assertEquals(PlatformManager.get().today(), report.getSendDate());
            Assert.assertEquals(101L, report.getTarget());
            Assert.assertEquals(someone, report.getAuthor());
            Assert.assertEquals("forum-message", report.getCategory());
            Assert.assertEquals(ReportStatus.IN_PROGRESS, report.getStatus());
            return true;
        });
        dataManager.register("flush", null, null);
        securityManager.doConnect("someone", 0);
        Json result = forumController.report(params(), Json.createJsonFromString("{ " +
                "'reason':'False report', " +
                "'text':'The message is false', " +
                "'target':101 " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"reason\":\"False report\"," +
            "\"sendDate\":\"2025-02-18\"," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
            "\"id\":0,\"text\":\"The message is false\"," +
            "\"version\":0," +
            "\"target\":101" +
        "}", result.toString());
        dataManager.hasFinished();
    }






    @Test
    public void failToReportBecauseTheAuthorCannotBeFound() {
        dataManager.register("createQuery", null, null,
                "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter",
                null, null, "login", "someone");
        dataManager.register("getSingleResult",
                someone, new NoResultException(), null);
        securityManager.doConnect("someone", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                    "'reason':'False report', " +
                    "'text':'The message is false', " +
                    "'target':101 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("User not found: someone", sce.getMessage());
        }
        dataManager.hasFinished();
    }







    @Test
    public void failToReportForUnknownReason() {
        dataManager.register("createQuery", null, null,
            "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter",
            null, null, "login", "someone");
        dataManager.register("getSingleResult",
            someone, null, null);
        dataManager.register("persist", null,
            new PersistenceException("Some reason"),
            (Predicate) entity->{
                return (entity instanceof Report);
            }
        );
        securityManager.doConnect("someone", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                    "'reason':'False report', " +
                    "'text':'The message is false', " +
                    "'target':101 " +
                "}"
            ));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(500, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report: Some reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCloseAReportWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.closeReport(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Report ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCloseAReportAboutAnUnknownMessage() {
        Report report = report1();
        dataManager.register("find",
                report, null, Report.class, 1L);
        dataManager.register("find",
                null, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.closeReport(params("id", "1", "thread", "2"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Message with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void closeAReport() {
        Report report = report1();
        ForumMessage message = forumMessage1();
        dataManager.register("find",
            report, null, Report.class, 1L);
        dataManager.register("find",
            message, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.closeReport(params("id", "1"), Json.createJsonFromString("{ }"));
        Assert.assertEquals("{" +
                "\"reason\":\"False report\"," +
                "\"sendDate\":\"2025-02-18\"," +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1," +
                "\"text\":\"This is a false report.\"," +
                "\"message\":{" +
                    "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                    "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                    "\"text\":\"At start, Amarys was a small kingdom.\"," +
                    "\"version\":0" +
                "}," +
                "\"version\":0," +
                "\"target\":1" +
            "}",
            result.toString()
        );
        Assert.assertEquals(ReportStatus.CANCELLED, report.getStatus());
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyACloseReportWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.closeReport(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyARemoveMessageReportWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.removeMessage(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Report ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyAReportToRemoveAnUnknownMessage() {
        Report report = report1();
        dataManager.register("find",
                report, null, Report.class, 1L);
        dataManager.register("find",
                null, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.removeMessage(params("id", "1", "thread", "2"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Message with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void applyAReportToRemoveAMessage() {
        Report report = report1();
        ForumMessage message = forumMessage1();
        dataManager.register("find",
            report, null, Report.class, 1L);
        dataManager.register("find",
            message, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.removeMessage(params("id", "1"), Json.createJsonFromString("{ }"));
        Assert.assertEquals("{" +
            "\"reason\":\"False report\"," +
            "\"sendDate\":\"2025-02-18\"," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
            "\"id\":1," +
            "\"text\":\"This is a false report.\"," +
            "\"message\":{" +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                "\"text\":\"At start, Amarys was a small kingdom.\"," +
                "\"version\":0" +
            "}," +
            "\"version\":0," +
            "\"target\":1" +
        "}",
        result.toString());
        Assert.assertEquals(ReportStatus.PROCESSED, report.getStatus());
        Assert.assertEquals(ForumMessageStatus.BLOCKED, message.getStatus());
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyARemoveMessageReportWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.removeMessage(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyABanAccountReport() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.removeMessageAndBanAuthor(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Report ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyABanAccountAndRemoceAnUnknownMessage() {
        Report report = report1();
        dataManager.register("find",
                report, null, Report.class, 1L);
        dataManager.register("find",
                null, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.removeMessageAndBanAuthor(params("id", "1", "thread", "2"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Message with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void applyAReportToBanAnAccount() {
        Report report = report1();
        ForumMessage message = forumMessage1();
        dataManager.register("find",
            report, null, Report.class, 1L);
        dataManager.register("find",
            message, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.removeMessageAndBanAuthor(params("id", "1"), Json.createJsonFromString("{ }"));
        Assert.assertEquals("{" +
            "\"reason\":\"False report\"," +
            "\"sendDate\":\"2025-02-18\"," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
            "\"id\":1," +
            "\"text\":\"This is a false report.\"," +
            "\"message\":{" +
                "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
                "\"id\":1,\"publishedDate\":\"2025-02-18\"," +
                "\"text\":\"At start, Amarys was a small kingdom.\"," +
                "\"version\":0" +
            "}," +
            "\"version\":0," +
            "\"target\":1" +
        "}",
        result.toString());
        Assert.assertEquals(ReportStatus.PROCESSED, report.getStatus());
        Assert.assertEquals(ForumMessageStatus.BLOCKED, message.getStatus());
        Assert.assertEquals(AccountStatus.BLOCKED, someone.getStatus());
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyABanAccountReportWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.removeMessageAndBanAuthor(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyAMoveMessageReportWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.moveMessage(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Report ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyAMoveMessageReportWithoutGivingTheThreadID() {
        securityManager.doConnect("admin", 0);
        try {
            forumController.moveMessage(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Forum Thread ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void applyAReportToMoveAMessage() {
        Report report = report1();
        ForumThread forumThread = forumThread2();
        ForumMessage message = forumMessage1();
        dataManager.register("find",
            report, null, Report.class, 1L);
        dataManager.register("find",
            message, null, ForumMessage.class, 1L);
        dataManager.register("find",
            forumThread, null, ForumThread.class, 2L);
        securityManager.doConnect("admin", 0);
        Json result = forumController.moveMessage(params("id", "1", "thread", "2"), Json.createJsonFromString("{ }"));
        Assert.assertEquals("{" +
            "\"reason\":\"False report\"," +
            "\"sendDate\":\"2025-02-18\"," +
            "\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
            "\"id\":1," +
            "\"text\":\"This is a false report.\"," +
            "\"message\":{\"author\":{\"firstName\":\"\",\"lastName\":\"\",\"id\":1,\"login\":\"someone\"}," +
            "\"id\":1," +
            "\"publishedDate\":\"2025-02-18\"," +
            "\"text\":\"At start, Amarys was a small kingdom.\"," +
            "\"thread\":{\"id\":2,\"title\":\"Golden Age of Amarys\"},\"version\":0}," +
            "\"version\":0," +
            "\"target\":1" +
        "}",
        result.toString());
        Assert.assertEquals(ReportStatus.PROCESSED, report.getStatus());
        Assert.assertEquals(ForumMessageStatus.LIVE, message.getStatus());
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyAReportToMoveAnUnknownMessage() {
        Report report = report1();
        dataManager.register("find",
                report, null, Report.class, 1L);
        dataManager.register("find",
                null, null, ForumMessage.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.moveMessage(params("id", "1", "thread", "2"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Message with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyAReportToMoveAMessageToAnUnknownThread() {
        Report report = report1();
        ForumMessage message = forumMessage1();
        dataManager.register("find",
                report, null, Report.class, 1L);
        dataManager.register("find",
                message, null, ForumMessage.class, 1L);
        dataManager.register("find",
                null, null, ForumThread.class, 2L);
        securityManager.doConnect("admin", 0);
        try {
            forumController.moveMessage(params("id", "1", "thread", "2"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Forum Thread with id 2", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToApplyAMoveMessageReportWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.moveMessage(params("id", "1", "thread", "2"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredEventFields() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                "'reason':'False report', " +
                "'text':'The message is false', " +
                "'target':101, " +
                "'reporter': { }, " +
                "'author': { } " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reporter-title\":\"required\"," +
                "\"author-title\":\"required\"," +
                "\"author-description\":\"required\"," +
                "\"reporter-description\":\"required\"" +
            "}", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkMinEventFieldsValues() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                "'reason':'False report', " +
                "'text':'The message is false', " +
                "'target':101, " +
                "'reporter': { 'title':'t', 'description':'d'  }, " +
                "'author': { 'title':'t', 'description':'d' } " +
                "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reporter-title\":\"must be greater of equals to 2\"," +
                "\"author-title\":\"must be greater of equals to 2\"," +
                "\"author-description\":\"must be greater of equals to 2\"," +
                "\"reporter-description\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkMaxEventFieldsValues() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                "'reason':'False report', " +
                "'text':'The message is false', " +
                "'target':101, " +
                "'reporter': { " +
                    "'title':'" + generateText("r", 201) + "', " +
                    "'description':'" + generateText("r", 20001) + "'  " +
                "}, " +
                "'author': { " +
                    "'title':'" + generateText("r", 201) + "', " +
                    "'description':'" + generateText("r", 20001) + "' " +
                "} " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reporter-title\":\"must not be greater than 200\"," +
                "\"author-title\":\"must not be greater than 200\"," +
                "\"author-description\":\"must not be greater than 19995\"," +
                "\"reporter-description\":\"must not be greater than 19995\"" +
            "}", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkMaxEventFieldsValidities() {
        securityManager.doConnect("someone", 0);
        try {
            forumController.report(params(), Json.createJsonFromString("{ " +
                "'reason':'False report', " +
                "'text':'The message is false', " +
                "'target':101, " +
                "'reporter': { " +
                    "'title':'???', " +
                    "'description':'123'  " +
                "}, " +
                "'author': { " +
                    "'title':'???', " +
                    "'description':'123' " +
                "} " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"reporter-title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"," +
                "\"author-title\":\"must matches '[\\\\d\\\\s\\\\w]+'\"" +
            "}", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void closeAReportWithEvents() {
        Report report = report1().setAuthor(someoneelse);
        ForumMessage message = forumMessage1();
        dataManager.register("find",
            report, null, Report.class, 1L);
        dataManager.register("find",
            message, null, ForumMessage.class, 1L);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Event);
            Event event = (Event) entity;
            Assert.assertEquals("Refused", event.getTitle());
            Assert.assertEquals("Your report is refused", event.getDescription());
            Assert.assertEquals(someoneelse, event.getTarget());
            Assert.assertEquals(EventStatus.LIVE, event.getStatus());
            Assert.assertEquals(PlatformManager.get().today(), event.getDate());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Event);
            Event event = (Event) entity;
            Assert.assertEquals("Report dismissed", event.getTitle());
            Assert.assertEquals("The report about your message has been dismissed", event.getDescription());
            Assert.assertEquals(someone, event.getTarget());
            Assert.assertEquals(EventStatus.LIVE, event.getStatus());
            Assert.assertEquals(PlatformManager.get().today(), event.getDate());
            return true;
        });
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        forumController.closeReport(params("id", "1"), Json.createJsonFromString("{ 'reporter':{ " +
                "'title':'Refused', " +
                "'description':'Your report is refused' " +
            "}, 'author':{ " +
                "'title':'Report dismissed', " +
                "'description':'The report about your message has been dismissed' " +
            "} " +
        "}"));
        Assert.assertEquals(ReportStatus.CANCELLED, report.getStatus());
        dataManager.hasFinished();
    }

}
