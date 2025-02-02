package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;

import javax.persistence.NoResultException;

public class AccountTest implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillLogin() {
        Login login = new Login()
            .setLogin("adebrie")
            .setPassword("p@ssw0rd")
            .setAltPassword("p@@ssw0rd")
            .setAltPasswordLease(1200000L)
            .setRole(LoginRole.STANDARD);
        Assert.assertEquals("adebrie", login.getLogin());
        Assert.assertEquals("p@ssw0rd", login.getPassword());
        Assert.assertEquals("p@@ssw0rd", login.getAltPassword());
        Assert.assertEquals(1200000L, login.getAltPasswordLease());
        Assert.assertEquals(LoginRole.STANDARD, login.getRole());
        Assert.assertFalse(login.isAdministrator());
        Assert.assertFalse(login.isContributor());
        Assert.assertFalse(login.isTest());
        login.setAdministrator(true);
        Assert.assertTrue(login.isAdministrator());
        login.setAdministrator(false);
        Assert.assertFalse(login.isAdministrator());
        login.setContributor(true);
        Assert.assertTrue(login.isContributor());
        login.setContributor(false);
        Assert.assertFalse(login.isContributor());
        login.setTest(true);
        Assert.assertTrue(login.isTest());
        login.setTest(false);
        Assert.assertFalse(login.isTest());
    }


    @Test
    public void encrypt() {
        Assert.assertEquals("7aad60e47098a368251a5b60ecfae3c2", Login.encrypt("p@@ssw0rd"));
        try {
            Assert.assertEquals("7aad60e47098a368251a5b60ecfae3c2", Login.encrypt("p@@ssw0rd", "DUMMY"));
            Assert.fail("This algrithm does not exist");
        }
        catch (SummerException sce) {
        }
    }

    @Test
    public void findLogin() {
        Login login = new Login()
                .setLogin("adebrie");
        Account account = new Account().setAccess(login);
        dataManager.register("createQuery", null, null, "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null,"login", "adebrie");
        dataManager.register("getSingleResult", account, null);
        inTransaction(em->{
            Assert.assertEquals(account, Login.findAccountByLogin(em, "adebrie"));
        });
    }

    @Test
    public void findUnknownLogin() {
        dataManager.register("createQuery", null, null, "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null,"login", "adebrie");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            Assert.assertNull(Login.findAccountByLogin(em, "adebrie"));
        });
    }

    @Test
    public void fillAccount() {
        Login login = new Login();
        Account account = new Account()
            .setFirstName("Arthur")
            .setLastName("DEBRIE")
            .setAvatar("myAvatar.png")
            .setEmail("adebrie@mycomp.com")
            .setStatus(AccountStatus.ACTIVE)
            .setRating(120)
            .setMessageCount(2)
            .setAccess(login);
        Assert.assertEquals("Arthur", account.getFirstName());
        Assert.assertEquals("DEBRIE", account.getLastName());
        Assert.assertEquals("myAvatar.png", account.getAvatar());
        Assert.assertEquals("adebrie@mycomp.com", account.getEmail());
        Assert.assertEquals(AccountStatus.ACTIVE, account.getStatus());
        Assert.assertEquals(120, account.getRating());
        Assert.assertEquals(2, account.getMessageCount());
        Assert.assertEquals(login, account.getAccess());
        account.setLogin("adebrie");
        account.setPassword("p@ssw0rd");
        account.setRole(LoginRole.CONTRIBUTOR);
        Assert.assertEquals("adebrie", account.getLogin());
        Assert.assertEquals("p@ssw0rd", account.getPassword());
        Assert.assertEquals(LoginRole.CONTRIBUTOR, account.getRole());
        Assert.assertEquals("adebrie", login.getLogin());
        Assert.assertEquals("p@ssw0rd", login.getPassword());
        Assert.assertEquals(LoginRole.CONTRIBUTOR, login.getRole());
    }

    @Test
    public void findAccountById() {
        Login login = new Login()
                .setLogin("adebrie");
        Account account = new Account().setAccess(login);
        dataManager.register("find", account, null, Account.class, 1L);
        inTransaction(em->{
            Assert.assertEquals(account, Account.find(em, 1L));
        });
    }

    @Test
    public void tryToFindUnknownAccountById() {
        dataManager.register("find", null, null, Account.class, 1L);
        inTransaction(em->{
            try {
                Account.find(em, 1L);
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Account with id 1", snfe.getMessage());
            }
        });
    }

    @Test
    public void findAccountByLogin() {
        Login login = new Login()
                .setLogin("adebrie");
        Account account = new Account().setAccess(login);
        dataManager.register("createQuery", null, null, "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null,"login", "adebrie");
        dataManager.register("getSingleResult", account, null);
        inTransaction(em->{
            Assert.assertEquals(account, Account.find(em, "adebrie"));
        });
    }

    @Test
    public void findUnknownAccountByLogin() {
        dataManager.register("createQuery", null, null, "select a from Account a, Login l where a.access = l and l.login=:login");
        dataManager.register("setParameter", null, null,"login", "adebrie");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            try {
                Account.find(em, "adebrie");
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Account with Login name adebrie", snfe.getMessage());
            }
        });
    }

    @Test
    public void getRatingLevel() {
        Account account = new Account().setRating(10);
        Assert.assertEquals(AccountRatingLevel.SQUIRE.getLabel(), Account.getRatingLevel(account));
        account.setRating(1005);
        Assert.assertEquals(AccountRatingLevel.EARL.getLabel(), Account.getRatingLevel(account));
        account.setRating(4005);
        Assert.assertEquals(AccountRatingLevel.EMPEROR.getLabel(), Account.getRatingLevel(account));
        account.setRating(-1);
        try {
            Account.getRatingLevel(account);
        }
        catch (SummerException se) {
            Assert.assertEquals("Unexcepted issue : a rating should be reached.", se.getMessage());
        }
    }

}
