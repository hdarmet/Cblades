package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.summer.FileSpecification;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.MIME;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.controller.Verifier;
import org.summer.data.DataSunbeam;
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityExistsException;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des comptes utilisateurs
 */
@Controller
public class AccountController implements
        InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam,
        StandardUsers, CommonEntities {

    /**
     * Endpoint (accessible via "/api/account/images/:imagename") permettant de télécharger depuis le navigateur
     * une image d'avatar associé au compte.
     * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image).
     * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
     */
    @MIME(url="/api/account/images/:imagename")
    public FileSpecification getImage(Map<String, Object> params) {
        return this.getFile(params, "imagename", "/avatars/");
    }

    /**
     * Stocke sur le système de fichiers/blob Cloud, l'image associée à un compte (il ne peut y avoir qu'un avatar par
     * compte) et l'associe au compte (en précisant l'URL de l'image dans le champ "avatar" du compte). Le contenu de l'image
     * a été, au préalable, extrait du message HTTP (par Summer) et passé dans le paramètre params sous l'étiquette
     * MULTIPART_FILES (un tableau qui ne doit contenir au plus qu'un élément)<br>
     * L'image sera stockée dans le sous répertoire/blob nommé "/avatars" sous un nom qui est la concaténation de
     * "avatar" et l'ID du compte.
     * @param params paramètres d'appel HTTP (l'image a stocker si elle existe, est accessible via l'étiquette
     *               MULTIPART_FILES)
     * @param account compte auquel il faut associer l'image.
     */
    void storeAvatar (Map<String, Object> params, Account account) {
        FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
        if (files!=null) {
            if (files.length!=1) throw new SummerControllerException(400, "One and only one avatar file may be loaded.");
            account.setAvatar(saveFile(files[0],
                "avatar"+account.getId(),
                "/avatars/", "/api/account/images/"
            ));
        }
    }

    @REST(url="/api/account/create", method=Method.POST)
    public Json create(Map<String, Object> params, Json request) {
        checkJson(request, true);
        Ref<Json> result = new Ref<>();
        ifAuthorized(user->{
            try {
                inTransaction(em -> {
                    Account newAccount = writeToAccount(request, new Account().setAccess(new Login()));
                    persist(em, newAccount);
                    storeAvatar(params, newAccount);
                    em.flush();
                    result.set(readFromAccount(newAccount));
                });
            }
            catch (EntityExistsException pe) {
                throw new SummerControllerException(409,
                        "Account with this login (%s) or email (%s) already exists",
                        request.get("login"), request.get("email"), null
                );
            }
            catch (PersistenceException pe) {
                throw new SummerControllerException(500, pe.getMessage());
            }
        }, ADMIN);
        return result.get();
    }

    @REST(url="/api/account/all", method=Method.GET)
    public Json getAll(Map<String, Object> params, Json request) {
        int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
        String search = (String)params.get("search");
        Ref<Json> result = new Ref<>();
        ifAuthorized(user->{
            inReadTransaction(em->{
                String countQuery = "select count(a) from Account a";
                String queryString = "select a from Account a left outer join fetch a.access";
                if (search!=null) {
                    String whereClause =" where fts('pg_catalog.english', " +
                        "a.access.login||' '||" +
                        "a.access.role||' '||" +
                        "a.firstName||' '||" +
                        "a.lastName||' '||" +
                        "a.email||' '||" +
                        "a.status, :search) = true";
                    queryString+=whereClause;
                    countQuery+=whereClause;
                }
                long accountCount = (search == null) ?
                    getSingleResult(em.createQuery(countQuery)) :
                    getSingleResult(em.createQuery(countQuery)
                                .setParameter("search", search));
                Collection<Account> accounts = (search == null) ?
                    findAccounts(em.createQuery(queryString), pageNo):
                    findAccounts(em.createQuery(queryString), pageNo,
                                "search", search);
                result.set(Json.createJsonObject()
                    .put("users", readFromAccounts(accounts))
                    .put("count", accountCount)
                    .put("page", pageNo)
                    .put("pageSize", AccountController.ACCOUNTS_BY_PAGE)
                );
            });
        }, ADMIN);
        return result.get();
    }

    @REST(url="/api/account/find/:id", method=Method.POST)
    public Json getById(Map<String, Object> params, Json request) {
        Ref<Json> result = new Ref<>();
        long id = getLongParam(params, "id", "The Account ID is missing or invalid (%s)");
        ifAuthorized(user->{
            inReadTransaction(em->{
                Account account = findAccount(em, id);
                result.set(readFromAccount(account));
            });
        }, ADMIN);
        return result.get();
    }

    @REST(url="/api/account/delete/:id", method=Method.GET)
    public Json delete(Map<String, Object> params, Json request) {
        long id = getLongParam(params, "id", "The Account ID is missing or invalid (%s)");
        ifAuthorized(user->{
            try {
                inTransactionUntilSuccessful(em->{
                    Account account = findAccount(em, id);
                    executeUpdate(em, "delete from Event e where e.target = :account",
                            "account", account);
                    executeUpdate(em, "update from Board b set b.author = null where b.author = :account",
                            "account", account);
                    remove(em, account);
                });
            } catch (PersistenceException pe) {
                throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
            }
        }, ADMIN);
        return Json.createJsonObject().put("deleted", "ok");
    }

    @REST(url="/api/account/update/:id", method=Method.POST)
    public Json update(Map<String, Object> params, Json request) {
        long id = getLongParam(params, "id", "The Account ID is missing or invalid (%s)");
        checkJson(request, false);
        Ref<Json> result = new Ref<>();
        ifAuthorized(user->{
            try {
                inTransaction(em->{
                    Account account = findAccount(em, id);
                    writeToAccount(request, account);
                    storeAvatar(params, account);
                    flush(em);
                    result.set(readFromAccount(account));
                });
            } catch (PersistenceException pe) {
                throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
            }
        }, ADMIN);
        return result.get();
    }

    Account findAccount(EntityManager em, long id) {
        Account account = find(em, Account.class, id);
        if (account==null) {
            throw new SummerControllerException(404,
                    "Unknown Account with id %d", id
            );
        }
        return account;
    }

    void checkJson(Json json, boolean full) {
        verify(json)
            .process(v-> {
                if (full) {v
                    .checkRequired("firstName")
                    .checkRequired("lastName")
                    .checkRequired("email")
                    .checkRequired("password")
                    .checkRequired("login");
                }
            })
            .checkMinSize("firstName", 2)
            .checkMaxSize("firstName", 100)
            .checkMinSize("lastName", 2)
            .checkMaxSize("lastName", 100)
            .checkMinSize("email", 2)
            .checkMaxSize("email", 100)
            .checkMinSize("password", 4)
            .checkMaxSize("password", 20)
            .check("status", AccountStatus.byLabels().keySet())
            .checkMinSize("login", 2)
            .checkMaxSize("login", 20)
            .check("role", LoginRole.byLabels().keySet())
            .ensure();
    }

    Account writeToAccount(Json json, Account account) {
        sync(json, account)
            .write("version")
            .write("firstName")
            .write("lastName")
            .write("email")
            .write("status", label->AccountStatus.byLabels().get(label))
            .writeSetter("login", account::setLogin)
            .writeSetter("role", account::setRole, label->LoginRole.byLabels().get(label))
            .process(s-> {
                if (json.get("password") != null) {s
                    .writeSetter("password", account::setPassword, password -> Login.encrypt((String) password));
                }
            });
        return account;
    }

    Json readFromAccount(Account account) {
        Json lJson = Json.createJsonObject();
        sync(lJson, account)
            .read("id")
            .read("version")
            .read("firstName")
            .read("lastName")
            .read("email")
            .read("rating")
            .read("messageCount")
            .read("avatar")
            .read("status", AccountStatus::getLabel)
            .readGetter("login", account::getLogin)
            .readGetter("role", account::getRole, LoginRole::getLabel);
        return lJson;
    }

    Collection<Account> findAccounts(Query query, int page, Object... params) {
        setParams(query, params);
        List<Account> accounts = getPagedResultList(query, page*AccountController.ACCOUNTS_BY_PAGE, AccountController.ACCOUNTS_BY_PAGE);
        return accounts.stream().distinct().collect(Collectors.toList());
    }

    Json readFromAccounts(Collection<Account> accounts) {
        Json list = Json.createJsonArray();
        accounts.stream().forEach(account->list.push(readFromAccount(account)));
        return list;
    }

    static int ACCOUNTS_BY_PAGE = 20;
}
