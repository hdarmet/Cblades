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
import org.summer.data.DataSunbeam;
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
 * Controller for managing user accounts.
 * This class handles HTTP requests related to user accounts, including creating, updating,
 * retrieving, and deleting accounts. It also manages account avatars.
 */
@Controller
public class AccountController implements
        InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam,
        StandardUsers, CommonEntities {

    /**
     * The number of accounts to display per page.
     */
    static int ACCOUNTS_BY_PAGE = 20;

    /**
     * Endpoint for downloading an avatar image associated with an account.
     * Accessible via "/api/account/images/:imagename".
     *
     * @param params URL parameters, including "imagename" which specifies the image name.
     * @return A FileSpecification that Summer will use to send the image to the browser.
     */
    @MIME(url="/api/account/images/:imagename")
    public FileSpecification getImage(Map<String, Object> params) {
        // Retrieve and return the requested image file.
        return this.getFile(params, "imagename", "/avatars/");
    }

    /**
     * Stores an account's avatar image on the file system/cloud blob storage.
     * Associates the image with the account by setting the "avatar" field to the image's URL.
     * The image content is extracted from the HTTP message by Summer and passed in the params
     * under the MULTIPART_FILES key (an array with at most one element).
     *
     * The image is stored in the "/avatars" subdirectory/blob under a name that is the concatenation
     * of "avatar" and the account's ID.
     *
     * @param params HTTP request parameters (the image, if present, is under MULTIPART_FILES).
     * @param account The account to associate the image with.
     */
    void storeAvatar (Map<String, Object> params, Account account) {
        // Retrieve the uploaded files from the parameters.
        FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
        // Check if any files were uploaded.
        if (files!=null) {
            // Validate that only one file was uploaded.
            if (files.length!=1) throw new SummerControllerException(400, "One and only one avatar file may be loaded.");
            // Save the uploaded file and set the avatar URL in the account object.
            account.setAvatar(saveFile(files[0],
                    "avatar"+account.getId(), // Generate a unique filename.
                    "/avatars/", // Specify the directory/blob path.
                    "/api/account/images/" // Specify the base URL for accessing the image.
            ));
        }
    }

    /**
     * Creates a new user account.
     *
     * This method handles the HTTP POST request to create a new user account. It performs the following steps:
     * <ul>
     *   <li>Validates the incoming JSON request to ensure it contains the required fields and fields are valid (using checkJson).</li>
     *   <li>Checks if the user is authorized to create an account (must be an ADMIN).</li>
     *   <li>Executes the account creation within a database transaction to ensure data integrity.</li>
     *   <li>Creates a new Account entity and populates it with data from the JSON request (using writeToAccount).</li>
     *   <li>Persists the new account to the database (using persist).</li>
     *   <li>Stores the account's avatar image (if provided) in the file system/cloud storage (using storeAvatar).</li>
     *   <li>Flushes the changes to the database to ensure they are written.</li>
     *   <li>Reads the newly created account from the database and returns it as a JSON response (using readFromAccount).</li>
     *   <li>Handles potential EntityExistsException (e.g., duplicate login or email) by throwing a SummerControllerException.</li>
     *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
     * </ul>
     *
     * @param params  HTTP request parameters, including any uploaded files (e.g., avatar).
     * @param request The JSON request body containing the account data.
     *                It should include fields like "firstName", "lastName", "email", "password", and "login".
     * @return A JSON response representing the newly created account, including its ID and other details.
     * @throws SummerControllerException If there's an issue creating the account, such as invalid data, a duplicate account, or a database error.
     */
    @REST(url="/api/account/create", method=Method.POST)
    public Json create(Map<String, Object> params, Json request) {
        // Validate the JSON request, ensuring all required fields are present and all fields are valid.
        checkJson(request, true);
        // Use a Ref to hold the result, allowing modification within lambdas.
        Ref<Json> result = new Ref<>();
        // Check if the caller is authorized to create an account.
        ifAuthorized(user->{
            try {
                // Start a database transaction to ensure atomicity.
                inTransaction(em -> {
                    // Create a new Account and populate it from the JSON request.
                    Account newAccount = writeToAccount(request, new Account().setAccess(new Login()));
                    // Persist the new account to the database.
                    persist(em, newAccount);
                    // Store the account's avatar (if any) and associate it with the account.
                    storeAvatar(params, newAccount);
                    // Flush the EntityManager to ensure changes are written to the database.
                    em.flush();
                    // Return a JSON representation of the newly created account.
                    result.set(readFromAccount(newAccount));
                });
            }
            catch (EntityExistsException pe) {
                // Catch any EntityExistsException (e.g., duplicate login or email).
                // Throw a SummerControllerException with a 409 Conflict status.
                throw new SummerControllerException(409,
                        "Account with this login (%s) or email (%s) already exists", // Provide a user-friendly error message.
                        request.get("login"), request.get("email"), null
                );
            }
            catch (PersistenceException pe) {
                // Catch any database-related exceptions.
                // Throw a SummerControllerException with a 500 Internal Server Error status.
                throw new SummerControllerException(500, pe.getMessage());
            }
        }, ADMIN); // Only users with the ADMIN role are authorized to create accounts.
        // Return the JSON representation of the created account.
        return result.get();
    }

    /**
     * Retrieves all accounts, with optional filtering and pagination.
     *
     * This method handles the HTTP GET request to retrieve a list of accounts. It supports pagination
     * and optional filtering by a search term. It performs the following steps:
     * <ol>
     *   <li>Retrieves the requested page number from the URL parameters.</li>
     *   <li>Retrieves an optional search term from the URL parameters.</li>
     *   <li>Checks if the user is authorized to retrieve accounts (must be an ADMIN).</li>
     *   <li>Executes the account retrieval within a read-only database transaction.</li>
     *   <li>Constructs a database query to count the total number of accounts, optionally filtering by the search term.</li>
     *   <li>Executes the count query to get the total number of accounts.</li>
     *   <li>Constructs a database query to retrieve the accounts, optionally filtering by the search term and joining with related entities.</li>
     *   <li>Executes the query to retrieve the accounts for the requested page.</li>
     *   <li>Reads the accounts from the database and returns them as a JSON response, along with pagination information (using readFromAccounts).</li>
     * </ol>
     *
     * @param params  HTTP request parameters, including optional "page" and "search".
     * @param request The JSON request body (not used in this method).
     * @return A JSON response containing a list of accounts, the total account count, the current page number, and the page size.
     */
    @REST(url="/api/account/all", method=Method.GET)
    public Json getAll(Map<String, Object> params, Json request) {
        // Retrieve the requested page number from the URL parameters.
        int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
        // Retrieve the optional search term from the URL parameters.
        String search = (String)params.get("search");
        // Use a Ref to hold the result, allowing modification within lambdas.
        Ref<Json> result = new Ref<>();
        // Check if the caller is authorized to retrieve all accounts.
        ifAuthorized(user->{
            // Start a read-only database transaction.
            inReadTransaction(em->{
                // Construct a database query to count the total number of accounts.
                String countQuery = "select count(a) from Account a";
                // Construct a database query to retrieve the accounts, joining with related entities.
                String queryString = "select a from Account a left outer join fetch a.access";
                // If a search term is provided, modify the queries to filter by the search term.
                if (search!=null) {
                    // Add a where clause to the queries to filter by the search term.
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
                // Execute the count query to get the total number of accounts.
                long accountCount = (search == null) ?
                        getSingleResult(em.createQuery(countQuery)) :
                        getSingleResult(em.createQuery(countQuery)
                                .setParameter("search", search));
                // Execute the query to retrieve the accounts for the requested page.
                Collection<Account> accounts = (search == null) ?
                        findAccounts(em.createQuery(queryString), pageNo):
                        findAccounts(em.createQuery(queryString), pageNo,
                                "search", search);
                // Return a JSON representation of the accounts, along with pagination information.
                result.set(Json.createJsonObject()
                        .put("users", readFromAccounts(accounts))
                        .put("count", accountCount)
                        .put("page", pageNo)
                        .put("pageSize", AccountController.ACCOUNTS_BY_PAGE)
                );
            });
        }, ADMIN); // Only users with the ADMIN role are authorized to retrieve all accounts.
        // Return the JSON representation of the accounts.
        return result.get();
    }

    /**
     * Retrieves an account by its ID.
     *
     * This method handles the HTTP POST request to retrieve a specific account based on its ID.
     * It performs the following steps:
     * <ol>
     *   <li>Retrieves the account ID from the URL parameters.</li>
     *   <li>Checks if the user is authorized to retrieve an account (must be an ADMIN).</li>
     *   <li>Executes the account retrieval within a read-only database transaction.</li>
     *   <li>Finds the Account entity in the database using the provided ID (using findAccount).</li>
     *   <li>Reads the account from the database and returns it as a JSON response (using readFromAccount).</li>
     * </ol>
     *
     * @param params  HTTP request parameters, including the account ID.
     * @param request The JSON request body (not used in this method).
     * @return A JSON response representing the account.
     * @throws SummerControllerException If there's an issue retrieving the account, such as a missing account or a database error.
     */
    @REST(url="/api/account/find/:id", method=Method.POST)
    public Json getById(Map<String, Object> params, Json request) {
        // Use a Ref to hold the result, allowing modification within lambdas.
        Ref<Json> result = new Ref<>();
        // Retrieve the account ID from the URL parameters.
        long id = getLongParam(params, "id", "The Account ID is missing or invalid (%s)");
        // Check if the caller is authorized to retrieve an account.
        ifAuthorized(user->{
            // Start a read-only database transaction.
            inReadTransaction(em->{
                // Find the account in the database.
                Account account = findAccount(em, id);
                // Return a JSON representation of the account.
                result.set(readFromAccount(account));
            });
        }, ADMIN); // Only users with the ADMIN role are authorized to retrieve accounts.
        // Return the JSON representation of the account.
        return result.get();
    }

    /**
     * Deletes an account by its ID.
     *
     * This method handles the HTTP GET request to delete a specific account based on its ID.
     * It performs the following steps:
     * <ol>
     *   <li>Retrieves the account ID from the URL parameters.</li>
     *   <li>Checks if the user is authorized to delete an account (must be an ADMIN).</li>
     *   <li>Executes the account deletion within a database transaction.</li>
     *   <li>Finds the Account entity in the database using the provided ID (using findAccount).</li>
     *   <li>Deletes all events associated with the account.</li>
     *   <li>Updates all boards associated with the account to have a null author.</li>
     *   <li>Removes the account from the database.</li>
     * </ol>
     *
     * @param params  HTTP request parameters, including the account ID.
     * @param request The JSON request body (not used in this method).
     * @return A JSON response indicating that the account was deleted.
     * @throws SummerControllerException If there's an issue deleting the account, such as a missing account or a database error.
     */
    @REST(url="/api/account/delete/:id", method=Method.GET)
    public Json delete(Map<String, Object> params, Json request) {
        // Retrieve the account ID from the URL parameters.
        long id = getLongParam(params, "id", "The Account ID is missing or invalid (%s)");
        // Check if the caller is authorized to delete an account.
        ifAuthorized(user->{
            try {
                // Start a database transaction to ensure atomicity and retry if necessary.
                inTransactionUntilSuccessful(em->{
                    // Find the account in the database.
                    Account account = findAccount(em, id);
                    // Delete all events associated with the account.
                    executeUpdate(em, "delete from Event e where e.target = :account",
                            "account", account);
                    // Update all boards associated with the account to have a null author.
                    executeUpdate(em, "update from Board b set b.author = null where b.author = :account",
                            "account", account);
                    // Remove the account from the database.
                    remove(em, account);
                });
            } catch (PersistenceException pe) {
                // Catch any database-related exceptions.
                // Throw a SummerControllerException with a 409 Conflict status.
                throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
            }
        }, ADMIN); // Only users with the ADMIN role are authorized to delete accounts.
        // Return a JSON response indicating that the account was deleted.
        return Json.createJsonObject().put("deleted", "ok");
    }

    /**
     * Updates an existing user account based on the provided JSON request.
     *
     * This method handles the HTTP POST request to update an existing user account. It performs the following steps:
     * <ol>
     *   <li>Retrieves the account ID from the URL parameters.</li>
     *   <li>Validates the incoming JSON request to ensure it contains valid data (using checkJson).</li>
     *   <li>Checks if the user is authorized to update an account (must be an ADMIN).</li>
     *   <li>Executes the account update within a database transaction to ensure data integrity.</li>
     *   <li>Finds the existing Account entity in the database using the provided ID (using findAccount).</li>
     *   <li>Updates the Account entity with data from the JSON request (using writeToAccount).</li>
     *   <li>Stores the account's avatar image (if provided) in the file system/cloud storage (using storeAvatar).</li>
     *   <li>Flushes the changes to the database to ensure they are written.</li>
     *   <li>Reads the updated account from the database and returns it as a JSON response (using readFromAccount).</li>
     * </ol>
     *
     * @param params  HTTP request parameters, including the account ID.
     * @param request The JSON request body containing updated account data.
     *                It may include fields like "firstName", "lastName", "email", etc.
     * @return A JSON response representing the updated account, including its ID and other details.
     * @throws SummerControllerException If there's an issue updating the account, such as invalid data, a missing account, or a database error.
     */
    @REST(url="/api/account/update/:id", method=Method.POST)
    public Json update(Map<String, Object> params, Json request) {
        // Retrieve the account ID from the URL parameters.
        long id = getLongParam(params, "id", "The Account ID is missing or invalid (%s)");
        // Validate the JSON request, ensuring all fields are valid.
        checkJson(request, false);
        // Use a Ref to hold the result, allowing modification within lambdas.
        Ref<Json> result = new Ref<>();
        // Check if the caller is authorized to update an account.
        ifAuthorized(user->{
            try {
                // Start a database transaction to ensure atomicity.
                inTransaction(em->{
                    // Find the existing account in the database.
                    Account account = findAccount(em, id);
                    // Update the account with data from the JSON request.
                    writeToAccount(request, account);
                    // Store the account's avatar (if any) and associate it with the account.
                    storeAvatar(params, account);
                    // Flush the EntityManager to ensure changes are written to the database.
                    flush(em);
                    // Return a JSON representation of the updated account.
                    result.set(readFromAccount(account));
                });
            } catch (PersistenceException pe) {
                // Catch any database-related exceptions.
                // Throw a SummerControllerException with a 409 Conflict status.
                throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
            }
        }, ADMIN); // Only users with the ADMIN role are authorized to update accounts.
        // Return the JSON representation of the updated account.
        return result.get();
    }

    /**
     * Finds an account by its ID and throws an exception if not found.
     *
     * @param em The EntityManager to use.
     * @param id The ID of the account to find.
     * @return The found Account.
     * @throws SummerControllerException If the account is not found.
     */
    Account findAccount(EntityManager em, long id) {
        // Find the account in the database.
        Account account = find(em, Account.class, id);
        // Throw an exception if the account is not found.
        if (account==null) {
            throw new SummerControllerException(404,
                    "Unknown Account with id %d", id
            );
        }
        // Return the found account.
        return account;
    }

    /**
     * Validates the JSON request for creating or updating an account.
     *
     * @param json The JSON request to validate.
     * @param full True if all fields are required, false otherwise.
     */
    void checkJson(Json json, boolean full) {
        // Verify the JSON request.
        verify(json)
                // Process the JSON request.
                .process(v-> {
                    // If all fields are required.
                    if (full) {v
                            // Check if the required fields are present.
                            .checkRequired("firstName")
                            .checkRequired("lastName")
                            .checkRequired("email")
                            .checkRequired("password")
                            .checkRequired("login");
                    }
                })
                // Check if the first name is valid.
                .checkMinSize("firstName", 2)
                .checkMaxSize("firstName", 100)
                // Check if the last name is valid.
                .checkMinSize("lastName", 2)
                .checkMaxSize("lastName", 100)
                // Check if the email is valid.
                .checkMinSize("email", 2)
                .checkMaxSize("email", 100)
                // Check if the password is valid.
                .checkMinSize("password", 4)
                .checkMaxSize("password", 20)
                // Check if the status is valid.
                .check("status", AccountStatus.byLabels().keySet())
                // Check if the login is valid.
                .checkMinSize("login", 2)
                .checkMaxSize("login", 20)
                // Check if the role is valid.
                .check("role", LoginRole.byLabels().keySet())
                // Ensure that all checks are valid.
                .ensure();
    }

    /**
     * Writes data from a JSON request to an Account object.
     *
     * @param json The JSON request to read from.
     * @param account The Account object to write to.
     * @return The updated Account object.
     */
    Account writeToAccount(Json json, Account account) {
        // Synchronize the JSON request with the Account object.
        sync(json, account)
                // Write the version.
                .write("version")
                // Write the first name.
                .write("firstName")
                // Write the last name.
                .write("lastName")
                // Write the email.
                .write("email")
                // Write the status.
                .write("status", label->AccountStatus.byLabels().get(label))
                // Write the login.
                .writeSetter("login", account::setLogin)
                // Write the role.
                .writeSetter("role", account::setRole, label->LoginRole.byLabels().get(label))
                // Process the password if it exists.
                .process(s-> {
                    // If the password exists.
                    if (json.get("password") != null) {s
                            // Write the password.
                            .writeSetter("password", account::setPassword, password -> Login.encrypt((String) password));
                    }
                });
        // Return the updated Account object.
        return account;
    }

    /**
     * Reads data from an Account object and creates a JSON response.
     *
     * @param account The Account object to read from.
     * @return A JSON response representing the Account object.
     */
    Json readFromAccount(Account account) {
        // Create a new JSON object.
        Json lJson = Json.createJsonObject();
        // Synchronize the JSON object with the Account object.
        sync(lJson, account)
                // Read the id.
                .read("id")
                // Read the version.
                .read("version")
                // Read the first name.
                .read("firstName")
                // Read the last name.
                .read("lastName")
                // Read the email.
                .read("email")
                // Read the rating.
                .read("rating")
                // Read the message count.
                .read("messageCount")
                // Read the avatar.
                .read("avatar")
                // Read the status.
                .read("status", AccountStatus::getLabel)
                // Read the login.
                .readGetter("login", account::getLogin)
                // Read the role.
                .readGetter("role", account::getRole, LoginRole::getLabel);
        // Return the JSON object.
        return lJson;
    }

    /**
     * Finds accounts based on a query, with pagination and optional parameters.
     *
     * @param query The database query to execute.
     * @param page The page number to retrieve.
     * @param params Optional parameters to set on the query.
     * @return A collection of Account objects.
     */
    Collection<Account> findAccounts(Query query, int page, Object... params) {
        // Set the parameters on the query.
        setParams(query, params);
        // Get the paged result list.
        List<Account> accounts = getPagedResultList(query, page*AccountController.ACCOUNTS_BY_PAGE, AccountController.ACCOUNTS_BY_PAGE);
        // Return the distinct accounts.
        return accounts.stream().distinct().collect(Collectors.toList());
    }

    /**
     * Reads data from a collection of Account objects and creates a JSON response.
     *
     * @param accounts The collection of Account objects to read from.
     * @return A JSON response representing the collection of Account objects.
     */
    Json readFromAccounts(Collection<Account> accounts) {
        // Create a new JSON array.
        Json list = Json.createJsonArray();
        // Add each account to the JSON array.
        accounts.stream().forEach(account->list.push(readFromAccount(account)));
        // Return the JSON array.
        return list;
    }
}