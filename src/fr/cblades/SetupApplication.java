package fr.cblades;


import java.util.logging.Logger;

import fr.cblades.domain.Account;
import fr.cblades.domain.AccountStatus;
import fr.cblades.domain.Login;
import fr.cblades.domain.Notice;
import org.summer.ApplicationManager;
import org.summer.Ref;
import org.summer.annotation.Launch;
import org.summer.annotation.Setup;
import org.summer.data.DataSunbeam;
import org.summer.data.JPAOnHibernate;
import org.summer.platform.GAEPlatformManagerImpl;
import org.summer.platform.LocalPlatformManagerImpl;
import org.summer.security.SecurityManager;

public class SetupApplication {
    static final Logger log = Logger.getLogger("cblades");
    static String gae = System.getenv("GAE_INSTANCE");

    static boolean isGae() {
        return SetupApplication.gae!=null;
    }

    @Setup
    public static void setupDevDatabase() {
        String url;
        String user = null;
        String password = null;
        if (isGae()) {
            url = "//google/cblades?useSSL=false&socketFactoryArg=cblades:europe-west3:cblades&socketFactory=com.google.cloud.sql.postgres.SocketFactory&user=cblades&password=maudite";
        } else {
            url = "//localhost/cblades";
            user = "cblades";
            password = "cblades";
        }
        JPAOnHibernate.openPostgresDevPersistenceUnit(url, user, password);
        log.info("setup dev database !");
    }

    @Setup
    public static void setSecurityManager() {
        if (isGae()) {
            SecurityManager.setXsrfProtect(true);
            SecurityManager.setSecureHTTP(true);
        }
        else {
            SecurityManager.setXsrfProtect(true);
            SecurityManager.setSecureHTTP(false);
        }
        SecurityManager.setRolesFinder(user->{
            DataSunbeam data = new DataSunbeam() {};
            Ref<Login> login = new Ref<>();
            data.inTransaction(em->{
                login.set(data.getSingleResult(em, "select l from Login l where l.login=:login", "login", user));
            });
            return login.get().isAdministrator() ?
                new String[] {StandardUsers.ADMIN, StandardUsers.USER} :
                login.get().isTest() ? new String[] {StandardUsers.TEST} :
                        new String[] {StandardUsers.USER};
        });
    }

    @Setup
    public static void setPlatformManager() {
        if (isGae()) {
            GAEPlatformManagerImpl gaePlatformManager = new GAEPlatformManagerImpl("cblades.appspot.com");
            ApplicationManager.get().setPlatformManager(gaePlatformManager);
        }
        else {
            LocalPlatformManagerImpl  localPlatformManager = new LocalPlatformManagerImpl("C:\\Content\\Blades"
            ).setMailProperties(
                "mail.smtp.host", "smtp.mailtrap.io",
                "mail.smtp.port", "2525"
            ).setMailCredentials(
              "0babec488ec1bd", "6330a2ef322b83"
            );
            ApplicationManager.get().setPlatformManager(localPlatformManager);
        }
    }

    @Launch
    public static void declareStandardUsers() {
        DataSunbeam data = new DataSunbeam() {};
        data.inTransaction(em->{
            if (data.getResultList(em, "select l from Login l where l.login=:login", "login", "admin").isEmpty()) {
                Account administrator = new Account()
                    .setFirstName("Cursed").setLastName("Blades").setEmail("cursed.blades@gmail.com")
                    .setAccess(new Login().setLogin("admin").setPassword(Login.encrypt("@dmInIstrat0r.")).setAdministrator(true))
                    .setAvatar("../images/site/avatars/default-avatar.png").setStatus(AccountStatus.ACTIVE);
                data.persist(em, administrator);
            }
            if (data.getResultList(em, "select l from Login l where l.login=:login", "login", "test").isEmpty()) {
                Account tester = new Account()
                    .setFirstName("Cursed").setLastName("Knife").setEmail("cursed.knife@gmail.com")
                    .setAccess(new Login().setLogin("test").setPassword(Login.encrypt("Test")).setTest(true))
                    .setAvatar("../images/site/avatars/default-avatar.png").setStatus(AccountStatus.ACTIVE);
                data.persist(em, tester);
            }
        });
    }

    static void declareStandardNotice(DataSunbeam data, String category, String title, String text) {
        data.inTransaction(em->{
            if (data.getResultList(em, "select n from Notice n where n.category=:category", "category", category).isEmpty()) {
                Notice forgotNoticeMail = new Notice()
                        .setCategory(category).setTitle(title).setText(text)
                        .setNoticeVersion("0.1").setPublished(true);
                data.persist(em, forgotNoticeMail);
            }
        });
    }

    @Launch
    public static void declareStandardNotices() {
        DataSunbeam data = new DataSunbeam() {};
        data.inTransaction(em->{
            declareStandardNotice(data, "forgot-password-mail", "Forgot Password", "Reniew Password %s");
            declareStandardNotice(data, "legal-notice", "Legal Notice", "Text for Legal Notice");
            declareStandardNotice(data, "private-life-policy-notice", "Private Life Policy", "Text for Private Life Policy");
            declareStandardNotice(data, "cookie-management-notice", "Cookie Management", "Text for Cookie Management");
            declareStandardNotice(data, "usage-policy-notice", "Usage Policy", "Text for Usage Policy");
            declareStandardNotice(data, "your-contributions-notice", "Your Contributions", "Text for Your Contributions");
        });
    }
}

