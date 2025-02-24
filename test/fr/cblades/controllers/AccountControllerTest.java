package fr.cblades.controllers;

import fr.cblades.StandardUsers;
import fr.cblades.controller.AccountController;
import fr.cblades.domain.Account;
import fr.cblades.domain.Login;
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

public class AccountControllerTest  implements TestSeawave, CollectionSunbeam, DataManipulatorSunbeam {

    AccountController accountController;
    MockDataManagerImpl dataManager;
    MockPlatformManagerImpl platformManager;
    MockSecurityManagerImpl securityManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        accountController = new AccountController();
        dataManager = (MockDataManagerImpl) ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
        platformManager = (MockPlatformManagerImpl) ApplicationManager.get().getPlatformManager();
        securityManager = (MockSecurityManagerImpl) ApplicationManager.get().getSecurityManager();
        securityManager.register(new MockSecurityManagerImpl.Credential("admin", "admin", StandardUsers.ADMIN));
        securityManager.register(new MockSecurityManagerImpl.Credential("someone", "someone", StandardUsers.USER));
    }

    @Test
    public void checkRequiredFieldsForAccountCreation() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.create(params(), Json.createJsonFromString(
                    "{}"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"firstName\":\"required\"," +
                "\"lastName\":\"required\"," +
                "\"password\":\"required\"," +
                "\"login\":\"required\"," +
                "\"email\":\"required\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMinFieldSizesForAccountCreation() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.create(params(), Json.createJsonFromString("{" +
                " 'firstName':'f'," +
                " 'lastName':'n'," +
                " 'password':'p'," +
                " 'login':'l'," +
                " 'email':'m' " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"firstName\":\"must be greater of equals to 2\"," +
                "\"lastName\":\"must be greater of equals to 2\"," +
                "\"password\":\"must be greater of equals to 4\"," +
                "\"login\":\"must be greater of equals to 2\"," +
                "\"email\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForAccountCreation() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.create(params(), Json.createJsonFromString("{" +
                " 'firstName':'" + generateText("f", 101) + "'," +
                " 'lastName':'" + generateText("f", 101) + "'," +
                " 'password':'" + generateText("f", 101) + "'," +
                " 'login':'" + generateText("f", 21) + "'," +
                " 'email':'" + generateText("f", 101) + "' " +
                "}"
            ));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"firstName\":\"must not be greater than 100\"," +
                "\"lastName\":\"must not be greater than 100\"," +
                "\"password\":\"must not be greater than 20\"," +
                "\"login\":\"must not be greater than 20\"," +
                "\"email\":\"must not be greater than 100\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void createNewAccountWithAvatar() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Account);
            Account account = (Account) entity;
            Assert.assertEquals("John", account.getFirstName());
            Assert.assertEquals("Cook", account.getLastName());
            Assert.assertEquals("b693d6437d40aa024c4b6792cc66375c", account.getPassword());
            Assert.assertEquals("john", account.getLogin());
            Assert.assertEquals("jcook@gmail.com",account.getEmail());
            return true;
        });
        OutputStream outputStream = new ByteArrayOutputStream();
        platformManager.register("getOutputStream", outputStream, null);
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = accountController.create(params(
            ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                new FileSpecification("avatar", "avatar.png", "png",
                    new ByteArrayInputStream(("Content of /avatars/avatar.png").getBytes()))
            }
        ), Json.createJsonFromString("{" +
                " 'firstName':'John'," +
                " 'lastName':'Cook'," +
                " 'password':'p@ssW0rd'," +
                " 'login':'john'," +
                " 'email':'jcook@gmail.com' " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"firstName\":\"John\"," +
            "\"lastName\":\"Cook\"," +
            "\"messageCount\":0," +
            "\"role\":\"std\"," +
            "\"rating\":0," +
            "\"id\":0," +
            "\"avatar\":\"/api/account/images/avatar0-0.png\"," +
            "\"login\":\"john\"," +
            "\"version\":0," +
            "\"email\":\"jcook@gmail.com\"" +
        "}", result.toString());
        Assert.assertEquals("Content of /avatars/avatar.png", outputStreamToString(outputStream));
        platformManager.hasFinished();
        dataManager.hasFinished();
    }

    @Test
    public void createNewAccountWithoutAnAvatar() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            Assert.assertTrue(entity instanceof Account);
            Account account = (Account) entity;
            Assert.assertEquals("John", account.getFirstName());
            Assert.assertEquals("Cook", account.getLastName());
            Assert.assertEquals("b693d6437d40aa024c4b6792cc66375c", account.getPassword());
            Assert.assertNull(account.getAvatar());
            Assert.assertEquals("john", account.getLogin());
            Assert.assertEquals("jcook@gmail.com",account.getEmail());
            return true;
        });
        dataManager.register("flush", null, null);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = accountController.create(params(), Json.createJsonFromString("{" +
                " 'firstName':'John'," +
                " 'lastName':'Cook'," +
                " 'password':'p@ssW0rd'," +
                " 'login':'john'," +
                " 'email':'jcook@gmail.com' " +
            "}"
        ));
        Assert.assertEquals("{" +
            "\"firstName\":\"John\"," +
            "\"lastName\":\"Cook\"," +
            "\"messageCount\":0," +
            "\"role\":\"std\"," +
            "\"rating\":0," +
            "\"id\":0," +
            "\"login\":\"john\"," +
            "\"version\":0," +
            "\"email\":\"jcook@gmail.com\"" +
        "}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateANewAccountWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            accountController.create(params(), Json.createJsonFromString("{" +
                " 'firstName':'John'," +
                " 'lastName':'Cook'," +
                " 'password':'p@ssW0àrd'," +
                " 'login':'john'," +
                " 'email':'jcook@gmail.com' " +
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
    public void failToCreateAnAccountBecauseMoreThanOneImageFile() {
        dataManager.register("persist", null, null, (Predicate) entity->{
            return true;
        });
        dataManager.register("flush", null, null, null);
        securityManager.doConnect("admin", 0);
        try {
            accountController.create(params(
                ControllerSunbeam.MULTIPART_FILES, new FileSpecification[] {
                    new FileSpecification("avatar1", "avatar1.png", "png",
                        new ByteArrayInputStream(("Content of /avatars/avatar1.png").getBytes())),
                    new FileSpecification("avatar2", "avatar2.png", "png",
                        new ByteArrayInputStream(("Content of /avatars/avatar2.png").getBytes()))
                }
            ), Json.createJsonFromString("{" +
                " 'firstName':'John'," +
                " 'lastName':'Cook'," +
                " 'password':'p@ssW0àrd'," +
                " 'login':'john'," +
                " 'email':'jcook@gmail.com' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("One and only one avatar file may be loaded.", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToCreateAnAlreadyExistingAccount() {
        dataManager.register("persist", null,
            new EntityExistsException("Entity already Exists"),
            (Predicate) entity->{
                return (entity instanceof Account);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            accountController.create(params(), Json.createJsonFromString("{" +
                " 'firstName':'John'," +
                " 'lastName':'Cook'," +
                " 'password':'p@ssW0àrd'," +
                " 'login':'john'," +
                " 'email':'jcook@gmail.com' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Account with this login (john) or email (jcook@gmail.com) already exists", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void failToCreateAnAccountForUnknownReason() {
        dataManager.register("persist", null,
            new PersistenceException("Some reason"),
            (Predicate) entity->{
                return (entity instanceof Account);
            }
        );
        securityManager.doConnect("admin", 0);
        try {
            accountController.create(params(), Json.createJsonFromString("{" +
                " 'firstName':'John'," +
                " 'lastName':'Cook'," +
                " 'password':'p@ssW0àrd'," +
                " 'login':'john'," +
                " 'email':'jcook@gmail.com' " +
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
    public void listAllAccounts() {
        dataManager.register("createQuery", null, null,
                "select count(a) from Account a");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select a from Account a left outer join fetch a.access");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 20);
        dataManager.register("getResultList", arrayList(
                setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(new Login().setLogin("john")), 1),
                setEntityId(new Account().setFirstName("Mary").setLastName("Sue").setAccess(new Login().setLogin("mary")), 2)
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = accountController.getAll(params("page", "0"), null);
        Assert.assertEquals("{\"count\":2,\"pageSize\":20,\"page\":0,\"users\":[" +
                "{\"firstName\":\"John\",\"lastName\":\"Cook\",\"messageCount\":0,\"role\":\"std\",\"rating\":0," +
                "\"id\":1,\"login\":\"john\",\"version\":0}," +
                "{\"firstName\":\"Mary\",\"lastName\":\"Sue\",\"messageCount\":0,\"role\":\"std\",\"rating\":0," +
                "\"id\":2,\"login\":\"mary\",\"version\":0}" +
            "]}", result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void listAccountsWithASearchPattern() {
        dataManager.register("createQuery", null, null,
                "select count(a) from Account a where " +
                        "fts('pg_catalog.english', a.access.login||' '||a.access.role||' '||a.firstName||' " +
                        "'||a.lastName||' '||a.email||' '||a.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "new");
        dataManager.register("getSingleResult", 2L, null);
        dataManager.register("createQuery", null, null,
                "select a from Account a left outer join fetch a.access where " +
                        "fts('pg_catalog.english', a.access.login||' '||a.access.role||' '||a.firstName||' " +
                        "'||a.lastName||' '||a.email||' '||a.status, :search) = true");
        dataManager.register("setParameter", null, null,"search", "new");
        dataManager.register("setFirstResult", null, null, 0);
        dataManager.register("setMaxResults", null, null, 20);
        dataManager.register("getResultList", arrayList(
                setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(new Login().setLogin("john")), 1),
                setEntityId(new Account().setFirstName("Mary").setLastName("Sue").setAccess(new Login().setLogin("mary")), 2)
        ), null);
        securityManager.doConnect("admin", 0);
        Json result = accountController.getAll(params("page", "0", "search", "new"), null);
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllAccountsWithoutGivingParameters() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.getAll(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The requested Page Number is invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToListAllAccountsWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            accountController.getAll(params("page", "0"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void getOneAccounttById() {
        dataManager.register("find",
            setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(
                    new Login().setLogin("john")
            ), 1),null, Account.class, 1L);
        securityManager.doConnect("admin", 0);
        Json result = accountController.getById(params("id", "1"), null);
        Assert.assertEquals(
        "{" +
                "\"firstName\":\"John\"," +
                "\"lastName\":\"Cook\"," +
                "\"messageCount\":0," +
                "\"role\":\"std\",\"rating\":0,\"id\":1," +
                "\"login\":\"john\"," +
                "\"version\":0" +
            "}",
            result.toString()
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnAccountWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.getById(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Account ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownAccount() {
        dataManager.register("find", null,
                new EntityNotFoundException("Entity Does Not Exists"), Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.getById(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Account with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnAccountWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            accountController.getById(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void deleteAnAccount() {
        dataManager.register("find",
            setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(
                    new Login().setLogin("john")
            ), 1),null, Account.class, 1L);
        Ref<Account> rAccount = new Ref<>();
        dataManager.register("createQuery", null, null,
                "delete from Event e where e.target = :account");
        dataManager.register("setParameter", null, null, "account", (Predicate) entity->{
            if (!(entity instanceof Account)) return false;
            Account account = (Account) entity;
            if (account.getId() != 1L) return false;
            return true;
        });
        dataManager.register("executeUpdate", 0, null);
        dataManager.register("createQuery", null, null,
                "update from Board b set b.author = null where b.author = :account");
        dataManager.register("setParameter", null, null, "account", (Predicate) entity->{
            if (!(entity instanceof Account)) return false;
            Account account = (Account) entity;
            if (account.getId() != 1L) return false;
            return true;
        });
        dataManager.register("executeUpdate", 0, null);
        dataManager.register("merge", (Supplier)()->rAccount.get(), null,
            (Predicate) entity->{
                if (!(entity instanceof Account)) return false;
                rAccount.set((Account) entity);
                if (rAccount.get().getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("remove", null, null,
            (Predicate) entity->{
                if (!(entity instanceof Account)) return false;
                Account account = (Account) entity;
                if (account.getId() != 1L) return false;
                return true;
            }
        );
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = accountController.delete(params("id", "1"), null);
        Assert.assertEquals(result.toString(),
                "{\"deleted\":\"ok\"}"
        );
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnUnknownAccount() {
        dataManager.register("find",
                null,
                new EntityNotFoundException("Entity Does Not Exists"), Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Account with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnAccountWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.delete(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Account ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnAccountAndFailsForAnUnknownReason() {
        dataManager.register("find",
                null,
                new PersistenceException("Some Reason"), Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : Some Reason", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToDeleteAnAccountWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            accountController.delete(params("id", "1"), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(403, sce.getStatus());
            Assert.assertEquals("Not authorized", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void checkRequiredFieldsForAccountUpdate() {
        dataManager.register("find",
            setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(
                new Login().setLogin("john")
            ), 1),
            null, Account.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        accountController.update(params("id", "1"), Json.createJsonFromString(
                "{}"
        ));
        dataManager.hasFinished();
    }

    @Test
    public void checkMinFieldSizesForAccountUpdate() {
        dataManager.register("find",
            setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(
                new Login().setLogin("john")
            ), 1),
            null, Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'firstName':'f'," +
                " 'lastName':'n'," +
                " 'password':'p'," +
                " 'avatar':'a'," +
                " 'login':'l'," +
                " 'email':'m' " +
            "}"));
            Assert.fail("The request should fail");
        } catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"firstName\":\"must be greater of equals to 2\"," +
                "\"lastName\":\"must be greater of equals to 2\"," +
                "\"password\":\"must be greater of equals to 4\"," +
                "\"login\":\"must be greater of equals to 2\"," +
                "\"email\":\"must be greater of equals to 2\"" +
            "}", sce.getMessage());
        }
    }

    @Test
    public void checkMaxFieldSizesForAccountUpdate() {
        dataManager.register("find",
            setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(
                new Login().setLogin("john")
            ), 1),
            null, Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.update(params("id", "1"), Json.createJsonFromString("{" +
                " 'firstName':'" + generateText("f", 101) + "'," +
                " 'lastName':'" + generateText("f", 101) + "'," +
                " 'password':'" + generateText("f", 101) + "'," +
                " 'avatar':'" + generateText("f", 101) + "'," +
                " 'login':'" + generateText("f", 21) + "'," +
                " 'email':'" + generateText("f", 101) + "' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("{" +
                "\"firstName\":\"must not be greater than 100\"," +
                "\"lastName\":\"must not be greater than 100\"," +
                "\"password\":\"must not be greater than 20\"," +
                "\"login\":\"must not be greater than 20\"," +
                "\"email\":\"must not be greater than 100\"" +
            "}"
            , sce.getMessage());
        }
    }

    @Test
    public void upadteAnAccount() {
        dataManager.register("find",
            setEntityId(new Account().setFirstName("John").setLastName("Cook").setAccess(
                    new Login().setLogin("john")
            ), 1),
            null, Account.class, 1L);
        dataManager.register("flush", null, null);
        securityManager.doConnect("admin", 0);
        Json result = accountController.update(params("id", "1"), Json.createJsonFromString("{" +
            " 'firstName':'john'," +
            " 'lastName':'cook'," +
            " 'password':'p@ssW0rd'," +
            " 'login':'John'," +
            " 'email':'Jcook@gmail.com' " +
        "}"));
        Assert.assertEquals("{" +
            "\"firstName\":\"john\"," +
            "\"lastName\":\"cook\"," +
            "\"messageCount\":0," +
            "\"role\":\"std\"," +
            "\"rating\":0," +
            "\"id\":1," +
            "\"login\":\"John\"," +
            "\"version\":0," +
            "\"email\":\"Jcook@gmail.com\"" +
        "}",
        result.toString());
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnAccountWithoutGivingItsID() {
        securityManager.doConnect("admin", 0);
        try {
            accountController.update(params(), null);
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(400, sce.getStatus());
            Assert.assertEquals("The Account ID is missing or invalid (null)", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnUnknownAccount() {
        dataManager.register("find", null,
                new EntityNotFoundException("Entity Does Not Exists"), Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.update(params("id", "1"), Json.createJsonFromString( "{" +
                " 'firstName':'john'," +
                " 'lastName':'cook'," +
                " 'password':'p@ssW0rd'," +
                " 'login':'John'," +
                " 'email':'Jcook@gmail.com' " +
            "}"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(404, sce.getStatus());
            Assert.assertEquals("Unknown Account with id 1", sce.getMessage());
        }
        dataManager.hasFinished();
    }

    @Test
    public void tryToUpdateAnAccountAndFailsForAnUnknownReason() {
        dataManager.register("find", null,
                new PersistenceException("Some Reason"), Account.class, 1L);
        securityManager.doConnect("admin", 0);
        try {
            accountController.update(params("id", "1"), Json.createJsonFromString(
                "{ 'version':0, 'description':'A very interesting new !', 'illustration':'here/there/announcement.png' }"
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
    public void tryToUpdateAnAccountWithBadCredentials() {
        securityManager.doConnect("someone", 0);
        try {
            accountController.update(params("id", "1"), Json.createJsonFromString(
            "{ 'version':0, 'description':'A very interesting new !', 'illustration':'here/there/announcement.png' }"
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
    public void chargeAccountImage() {
        platformManager.register("getInputStream",
            new ByteArrayInputStream(("Content of /avatars/john.png").getBytes()),
            null,  "/avatars/john.png");
        FileSpecification image = accountController.getImage(params("imagename", "john-10123456.png"));
        Assert.assertEquals("john.png", image.getName());
        Assert.assertEquals("image/png", image.getType());
        Assert.assertEquals("john.png", image.getFileName());
        Assert.assertEquals("Content of /avatars/john.png", inputStreamToString(image.getStream()));
        Assert.assertEquals("png", image.getExtension());
        platformManager.hasFinished();
    }

    @Test
    public void failChargeAccountImage() {
        platformManager.register("getInputStream", null,
            new PersistenceException("For Any Reason..."),  "/avatars/john.png");
        try {
            accountController.getImage(params("imagename", "john-10123456.png"));
            Assert.fail("The request should fail");
        }
        catch (SummerControllerException sce) {
            Assert.assertEquals(409, sce.getStatus());
            Assert.assertEquals("Unexpected issue. Please report : For Any Reason...", sce.getMessage());
        }
        platformManager.hasFinished();
    }

}
