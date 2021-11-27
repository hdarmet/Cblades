package fr.cblades;


import java.util.logging.Logger;

import fr.cblades.domain.Login;
import org.summer.Ref;
import org.summer.annotation.Launch;
import org.summer.annotation.Setup;
import org.summer.data.DataSunbeam;
import org.summer.data.JPAOnHibernate;
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
            return login.get().isAdmin() ?
                    new String[] {StandardUsers.ADMIN, StandardUsers.USER} :
                    login.get().isTest() ? new String[] {StandardUsers.TEST} :
                            new String[] {StandardUsers.USER};
        });
    }

    @Launch
    public static void declareStandardUsers() {
        DataSunbeam data = new DataSunbeam() {};
        data.inTransaction(em->{
            if (data.getResultList(em, "select l from Login l where l.login=:login", "login", "admin").isEmpty()) {
                data.persist(em, new Login().setLogin("admin").setPassword(Login.encrypt("admin")).setAdmin(true));
            }
            if (data.getResultList(em, "select l from Login l where l.login=:login", "login", "test").isEmpty()) {
                data.persist(em, new Login().setLogin("test").setPassword(Login.encrypt("test")).setTest(true));
            }
        });
    }

}

