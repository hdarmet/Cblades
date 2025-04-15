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
import org.summer.data.SummerNotFoundException;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

/**
 * Controller for managing message models.
 * This class handles HTTP requests related to message models, including
 * creating, updating, retrieving, and deleting message models.
 * It also manages message model comments.
 *
 * <p>
 *   This controller provides RESTful endpoints for interacting with message models.
 *   It uses the Summer framework for dependency injection, data access, security, and controller management.
 * </p>
 */
@Controller
public class MessageModelController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam,
		FileSunbeam, StandardUsers, CommonEntities {

	/**
	 * Creates a new message model.
	 *
	 * This method handles the HTTP POST request to create a new message model. It performs the following steps:
	 * <ol>
	 *   <li>Checks if the user is authorized to create a message model (must be an ADMIN).</li>
	 *   <li>Executes the message model creation within a database transaction to ensure data integrity.</li>
	 *   <li>Validates the incoming JSON request to ensure it contains the required fields and fields are valid (using checkJson).</li>
	 *   <li>Creates a new MessageModel entity and populates it with data from the JSON request (using writeToMessageModel).</li>
	 *   <li>Persists the new message model to the database (using persist).</li>
	 *   <li>Returns the newly created message model as a JSON response (using readFromMessageModelWithComments).</li>
	 *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters.
	 * @param request The JSON request body containing the message model data.
	 * @return A JSON response representing the newly created message model.
	 * @throws SummerControllerException If there's an issue creating the message model, such as a duplicate title or a database error.
	 */
	@REST(url="/api/message-model/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a database transaction to ensure atomicity.
		inTransaction(em->{
			// Check if the caller is authorized to create a message model.
			ifAuthorized(
				user->{
					try {
						// Validate the JSON request, ensuring all required fields are present and all fields are valid.
						checkJson(request, true);
						// Create a new MessageModel and populate it from the JSON request.
						MessageModel newMessageModel = writeToMessageModel(em, request, new MessageModel(), true);
						// Persist the new message model to the database.
						persist(em, newMessageModel);
						// Return a JSON representation of the newly created message model, including comments.
						result.set(readFromMessageModelWithComments(newMessageModel));
					} catch (PersistenceException pe) {
						// Catch any database-related exceptions (e.g., duplicate title).
						// Throw a SummerControllerException with a 409 Conflict status.
						throw new SummerControllerException(409,
							"Message Model with title (%s) already exists",
							request.get("title"), null
						);
					}
				},
				ADMIN // Only users with the ADMIN role are authorized to create message models.
			);
		});
		// Return the JSON representation of the created message model.
		return result.get();
	}

	/**
	 * Updates an existing message model.
	 *
	 * This method handles the HTTP POST request to update an existing message model. It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the message model ID from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to update the message model (must be an ADMIN).</li>
	 *   <li>Executes the message model update within a database transaction to ensure data integrity.</li>
	 *   <li>Validates the incoming JSON request to ensure it contains valid data (using checkJson).</li>
	 *   <li>Finds the existing MessageModel entity in the database using the provided ID (using findMessageModel).</li>
	 *   <li>Updates the MessageModel entity with data from the JSON request (using writeToMessageModel).</li>
	 *   <li>Flushes the changes to the database to ensure they are written.</li>
	 *   <li>Returns the updated message model as a JSON response, including comments (using readFromMessageModelWithComments).</li>
	 *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the message model ID.
	 * @param request The JSON request body containing updated message model data.
	 * @return A JSON response representing the updated message model.
	 * @throws SummerControllerException If there's an issue updating the message model, such as a database error.
	 */
	@REST(url="/api/message-model/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		// Retrieve the message model ID from the URL parameters.
		long id = getLongParam(params, "id", "The Message Model ID is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a database transaction to ensure atomicity.
		inTransaction(em-> {
			// Check if the caller is authorized to update the message model.
			ifAuthorized(
				user -> {
					try {
						// Validate the JSON request, ensuring all fields are valid.
						checkJson(request, false);
						// Find the existing message model in the database.
						MessageModel messageModel = findMessageModel(em, id);
						// Update the message model with data from the JSON request.
						writeToMessageModel(em, request, messageModel, false);
						// Flush the EntityManager to ensure changes are written to the database.
						flush(em);
						// Return a JSON representation of the updated message model, including comments.
						result.set(readFromMessageModelWithComments(messageModel));
					} catch (PersistenceException pe) {
						// Catch any database-related exceptions.
						// Throw a SummerControllerException with a 409 Conflict status.
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN // Only users with the ADMIN role are authorized to update message models.
			);
		});
		// Return the JSON representation of the updated message model.
		return result.get();
	}

	/**
	 * Retrieves message models by category (disregarding the status), with optional filtering and pagination.
	 *
	 * This method handles the HTTP GET request to retrieve a list of message models by category. It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the requested page number from the URL parameters.</li>
	 *   <li>Retrieves the category from the URL parameters.</li>
	 *   <li>Retrieves an optional search term from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to retrieve message models (must be an ADMIN).</li>
	 *   <li>Executes the message model retrieval within a read-only database transaction.</li>
	 *   <li>Constructs a database query to count the total number of message models for the given category, optionally filtering by the search term.</li>
	 *   <li>Executes the count query to get the total number of message models.</li>
	 *   <li>Constructs a database query to retrieve the message models for the given category, optionally filtering by the search term.</li>
	 *   <li>Executes the query to retrieve the message models for the requested page.</li>
	 *   <li>Reads the message models from the database and returns them as a JSON response, along with pagination information (using readFromMessageModels).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including optional "page" and "search".
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response containing a list of message models, the total count, the current page number, and the page size.
	 */
	@REST(url="/api/message-model/category/:category", method=Method.GET)
	public Json getByCategory(Map<String, Object> params, Json request) {
		// Retrieve the requested page number from the URL parameters.
		int pageNo = getIntegerParam(params, "page",
				"The requested Page Number is invalid (%s)");
		// Retrieve the category from the URL parameters.
		String category = getStringParam(params, "category", null,
				"The category is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a read-only database transaction.
		inReadTransaction(em->{
			// Check if the caller is authorized to retrieve message models.
			ifAuthorized(
				user->{
					// Retrieve the optional search term from the URL parameters.
					String search = (String)params.get("search");
					// Construct a database query to count the total number of message models for the given category.
					String countQuery = "select count(m) from MessageModel m " +
						"where m.category=:category";
					// Construct a database query to retrieve the message models for the given category.
					String queryString = "select m from MessageModel m " +
						"where m.category=:category";
					// If a search term is provided, modify the queries to filter by the search term.
					if (search!=null) {
						// Add a where clause to the queries to filter by the search term.
						String whereClause =" and fts('pg_catalog.english', " +
							"m.title||' '||" +
							"m.category||' '||" +
							"m.text||' '||" +
							"m.status, :search) = true";
						queryString+=whereClause;
						countQuery+=whereClause;
					}
					// Execute the count query to get the total number of message models.
					long messageModelCount = (search == null) ?
						getSingleResult(em, countQuery,
							"category", MessageModelCategory.byLabel(category)) :
						getSingleResult(em, countQuery,
							"category", MessageModelCategory.byLabel(category),
							"search", search);
					// Execute the query to retrieve the message models for the requested page.
					Collection<MessageModel> messageModels = (search == null) ?
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category)):
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category),
							"search", search);
					// Return a JSON representation of the message models, along with pagination information.
					result.set(Json.createJsonObject()
						.put("messageModels", readFromMessageModels(messageModels))
						.put("count", messageModelCount)
						.put("page", pageNo)
						.put("pageSize", MessageModelController.MODELS_BY_PAGE)
					);
				},
				ADMIN // Only users with the ADMIN role are authorized to retrieve message models.
			);
		});
		// Return the JSON representation of the message models.
		return result.get();
	}

	/**
	 * Retrieves live message models by category, with optional filtering and pagination.
	 *
	 * This method handles the HTTP GET request to retrieve a list of live message models by category. It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the requested page number from the URL parameters.</li>
	 *   <li>Retrieves the category from the URL parameters.</li>
	 *   <li>Retrieves an optional search term from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to retrieve message models (must be an ADMIN).</li>
	 *   <li>Executes the message model retrieval within a read-only database transaction.</li>
	 *   <li>Constructs a database query to count the total number of live message models for the given category, optionally filtering by the search term.</li>
	 *   <li>Executes the count query to get the total number of live message models.</li>
	 *   <li>Constructs a database query to retrieve the live message models for the given category, optionally filtering by the search term.</li>
	 *   <li>Executes the query to retrieve the live message models for the requested page.</li>
	 *   <li>Reads the live message models from the database and returns them as a JSON response, along with pagination information (using readFromMessageModels).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including optional "page" and "search".
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response containing a list of live message models, the total count, the current page number, and the page size.
	 */
	@REST(url="/api/message-model/category/live/:category", method=Method.GET)
	public Json getByLiveCategory(Map<String, Object> params, Json request) {
		// Retrieve the requested page number from the URL parameters.
		int pageNo = getIntegerParam(params, "page",
				"The requested Page Number is invalid (%s)");
		// Retrieve the category from the URL parameters.
		String category = getStringParam(params, "category", null,
				"The category is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a read-only database transaction.
		inReadTransaction(em->{
			// Check if the caller is authorized to retrieve message models.
			ifAuthorized(
				user->{
					// Retrieve the optional search term from the URL parameters.
					String search = (String)params.get("search");
					// Construct a database query to count the total number of live message models for the given category.
					String countQuery = "select count(m) from MessageModel m" +
						" where m.category=:category" +
						" and m.status=:status";
					// Construct a database query to retrieve the live message models for the given category.
					String queryString = "select m from MessageModel m" +
						" where m.category=:category" +
						" and m.status=:status";
					// If a search term is provided, modify the queries to filter by the search term.
					if (search!=null) {
						// Add a where clause to the queries to filter by the search term.
						String whereClause =" and fts('pg_catalog.english', " +
							"m.title||' '||" +
							"m.category||' '||" +
							"m.text||' '||" +
							"m.status, :search) = true";
						queryString+=whereClause;
						countQuery+=whereClause;
					}
					// Execute the count query to get the total number of live message models.
					long messageModelCount = (search == null) ?
						getSingleResult(em, countQuery,
							"category", MessageModelCategory.byLabel(category),
							"status", MessageModelStatus.LIVE) :
						getSingleResult(em, countQuery,
							"category", MessageModelCategory.byLabel(category),
							"status", MessageModelStatus.LIVE,
							"search", search);
					// Execute the query to retrieve the live message models for the requested page.
					Collection<MessageModel> messageModels = (search == null) ?
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category),
							"status", MessageModelStatus.LIVE):
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category),
							"status", MessageModelStatus.LIVE,
							"search", search);
					// Return a JSON representation of the message models, along with pagination information.
					result.set(Json.createJsonObject()
						.put("messageModels", readFromMessageModels(messageModels))
						.put("count", messageModelCount)
						.put("page", pageNo)
						.put("pageSize", MessageModelController.MODELS_BY_PAGE)
					);
				},
				ADMIN // Only users with the ADMIN role are authorized to retrieve message models.
			);
		});
		// Return the JSON representation of the message models.
		return result.get();
	}

	/**
	 * Retrieves a message model by its ID, including its comments.
	 *
	 * This method handles the HTTP GET request to retrieve a specific message model based on its ID.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the message model ID from the URL parameters.</li>
	 *   <li>Finds the MessageModel entity in the database using the provided ID (using findMessageModel).</li>
	 *   <li>Checks if the user is authorized to retrieve the message model (must be an ADMIN).</li>
	 *   <li>Returns the Message Model as a JSON response, including comments (using readFromMessageModelWithComments).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the message model ID.
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response representing the message model, including its comments.
	 * @throws SummerControllerException If there's an issue retrieving the message model, such as a missing message model.
	 */
	@REST(url="/api/message-model/load/:id", method=Method.GET)
	public Json getMessageModelWithComments(Map<String, Object> params, Json request) {
		// Retrieve the message model ID from the URL parameters.
		long id = getLongParam(params, "id", "The Message Model ID is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a database transaction.
		inTransaction(em->{
			// Find the message model in the database.
			MessageModel messageModel = findMessageModel(em, id);
			// Check if the caller is authorized to retrieve the message model.
			ifAuthorized(user->{
				// Return a JSON representation of the message model, including comments.
				result.set(readFromMessageModelWithComments(messageModel));
			},
			ADMIN); // Only users with the ADMIN role are authorized to retrieve message models.
		});
		// Return the JSON representation of the message model.
		return result.get();
	}

	/**
	 * Deletes a message model by its ID.
	 *
	 * This method handles the HTTP GET request to delete a specific message model based on its ID.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the message model ID from the URL parameters.</li>
	 *   <li>Finds the MessageModel entity in the database using the provided ID (using findMessageModel).</li>
	 *   <li>Checks if the user is authorized to delete the message model (must be an ADMIN).</li>
	 *   <li>Removes the message model from the database.</li>
	 *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the message model ID.
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response indicating that the message model was deleted.
	 * @throws SummerControllerException If there's an issue deleting the message model, such as a database error.
	 */
	@REST(url="/api/message-model/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		// Retrieve the message model ID from the URL parameters.
		long id = getLongParam(params, "id", "The Message Model ID is missing or invalid (%s)");
		// Start a database transaction.
		inTransaction(em->{
			try {
				// Find the message model in the database.
				MessageModel messageModel = findMessageModel(em, id);
				// Check if the caller is authorized to delete the message model.
				ifAuthorized(
					user->{
						// Remove the message model from the database.
						remove(em, messageModel);
					},
					ADMIN // Only users with the ADMIN role are authorized to delete message models.
				);
			} catch (PersistenceException pe) {
				// Catch any database-related exceptions.
				// Throw a SummerControllerException with a 409 Conflict status.
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		});
		// Return a JSON response indicating that the message model was deleted.
		return Json.createJsonObject().put("deleted", "ok");
	}

	/**
	 * Updates the status of a message model.
	 *
	 * This method handles the HTTP POST request to update the status of an existing message model.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the message model ID from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to update the message model (must be an ADMIN).</li>
	 *   <li>Executes the message model status update within a database transaction.</li>
	 *   <li>Finds the MessageModel entity in the database using the provided ID (using findMessageModel).</li>
	 *   <li>Updates the MessageModel entity's status with data from the JSON request (using writeToMessageModelStatus).</li>
	 *   <li>Flushes the changes to the database to ensure they are written.</li>
	 *   <li>Returns the updated message model as a JSON response (using readFromMessageModel).</li>
	 *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the message model ID.
	 * @param request The JSON request body containing the updated status.
	 * @return A JSON response representing the updated message model.
	 * @throws SummerControllerException If there's an issue updating the message model status, such as a database error.
	 */
	@REST(url="/api/message-model/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		// Retrieve the message model ID from the URL parameters.
		long id = getLongParam(params, "id", "The Message Model ID is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a database transaction.
		inTransaction(em-> {
			// Check if the caller is authorized to update the message model.
			ifAuthorized(
				user -> {
					try {
						// Find the message model in the database.
						MessageModel messageModel = findMessageModel(em, id);
						// Update the message model's status with data from the JSON request.
						writeToMessageModelStatus(em, request, messageModel);
						// Flush the EntityManager to ensure changes are written to the database.
						flush(em);
						// Return a JSON representation of the updated message model.
						result.set(readFromMessageModel(messageModel));
					} catch (PersistenceException pe) {
						// Catch any database-related exceptions.
						// Throw a SummerControllerException with a 409 Conflict status.
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN // Only users with the ADMIN role are authorized to update message models.
			);
		});
		// Return the JSON representation of the updated message model.
		return result.get();
	}

	/**
	 * Validates the JSON request for creating or updating a message model.
	 *
	 * This method performs validation checks on the incoming JSON request to ensure that it conforms to the expected structure and data types for a MessageModel.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Verifies the JSON request using a Verifier instance.</li>
	 *   <li>Optionally checks for the presence of required fields ("title" and "text") if the 'full' flag is true.</li>
	 *   <li>Checks if the "category" field is valid, ensuring it matches one of the allowed MessageModelCategory labels.</li>
	 *   <li>Checks if the "title" field is a valid string, has a minimum size of 2, a maximum size of 200, and matches the specified pattern (alphanumeric, spaces, and digits).</li>
	 *   <li>Checks if the "text" field is a valid string, has a minimum size of 2, and a maximum size of 5000.</li>
	 *   <li>Checks if the "status" field is valid, ensuring it matches one of the allowed MessageModelStatus labels.</li>
	 *   <li>Iterates through each element in the "comments" array (if present) and applies validation checks to each comment object.</li>
	 *   <li>For each comment, checks if the "version", "date", and "text" fields are present.</li>
	 *   <li>For each comment, checks if the "text" field has a minimum size of 2 and a maximum size of 19995.</li>
	 *   <li>Ensures that all checks are valid, throwing a SummerControllerException if any validation fails.</li>
	 * </ol>
	 *
	 * @param json The JSON request to validate.
	 * @param full True if all fields are required, false otherwise.
	 */
	void checkJson(Json json, boolean full) {
		// Verify the JSON request.
		verify(json)
			// Process the JSON request.
			.process(
				v->{
					// If all fields are required.
					if (full) {
						// Check if the required fields are present.
						v
							.checkRequired("title")
							.checkRequired("text");
					}
				}
			)
			// Check if the category is valid.
			.check("category", MessageModelCategory.byLabels().keySet())
			// Check if the title is valid.
			.checkString("title")
			.checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			// Check if the text is valid.
			.checkString("text")
			.checkMinSize("text", 2).checkMaxSize("text", 5000)
			// Check if the status is valid.
			.check("status", MessageModelStatus.byLabels().keySet())
			// Check if the comments are valid.
			.each("comments", cJson->verify(cJson)
				.checkRequired("version")
				.checkRequired("date")
				.checkRequired("text")
				.checkMinSize("text", 2)
				.checkMaxSize("text", 19995)
			)
			// Ensure that all checks are valid.
			.ensure();
	}

	/**
	 * Writes data from a JSON request to a MessageModel object.
	 *
	 * This method synchronizes data from a JSON object to a MessageModel entity.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Writes the "version" field from the JSON to the MessageModel.</li>
	 *   <li>Writes the "category" field from the JSON to the MessageModel, converting the label to a MessageModelCategory enum.</li>
	 *   <li>Writes the "title" field from the JSON to the MessageModel.</li>
	 *   <li>Writes the "text" field from the JSON to the MessageModel.</li>
	 *   <li>Writes the "status" field from the JSON to the MessageModel, converting the label to a MessageModelStatus enum.</li>
	 *   <li>Writes the author by id from the JSON to the MessageModel.</li>
	 *   <li>Writes each comment from the JSON to the MessageModel.</li>
	 * </ol>
	 *
	 * @param em           The EntityManager to use.
	 * @param json         The JSON request to read from.
	 * @param messageModel The MessageModel object to write to.
	 * @param full         True if all checking must be performed, false otherwise.
	 * @return The updated MessageModel object.
	 */
	MessageModel writeToMessageModel(EntityManager em, Json json, MessageModel messageModel, boolean full) {
		sync(json, messageModel)
			// Write the version.
			.write("version")
			// Write the category.
			.write("category", label->MessageModelCategory.byLabels().get(label))
			// Write the title.
			.write("title")
			// Write the text.
			.write("text")
			// Write the status.
			.write("status", label->MessageModelStatus.byLabels().get(label))
			// Write the author.
			.write("status", label->MessageModelStatus.byLabels().get(label))
			// Write the author.
			.process(s->writeAuthor(s, em))
			// Write each comment.
			.process(this::writeComments);
		// Return the updated MessageModel object.
		return messageModel;
	}

	/**
	 * Writes the status from a JSON request to a MessageModel object.
	 *
	 * This method updates the status of a MessageModel entity based on data from a JSON object.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Verifies the JSON request to ensure it contains the required fields ("id" and "status") and that they are valid.</li>
	 *   <li>Checks if the "id" field is present and is a valid integer.</li>
	 *   <li>Checks if the "status" field is present and is one of the allowed MessageModelStatus labels.</li>
	 *   <li>Synchronizes the JSON request with the MessageModel object.</li>
	 *   <li>Writes the "status" field from the JSON to the MessageModel, converting the label to a MessageModelStatus enum.</li>
	 * </ol>
	 *
	 * @param em           The EntityManager to use.
	 * @param json         The JSON request to read from.
	 * @param messageModel The MessageModel object to write to.
	 * @return The updated MessageModel object.
	 */
	MessageModel writeToMessageModelStatus(EntityManager em, Json json, MessageModel messageModel) {
		// Verify the JSON request.
		verify(json)
			// Check if the id is valid.
			.checkRequired("id")
			.checkInteger("id", "Not a valid id")
			// Check if the status is valid.
			.checkRequired("status")
			.check("status", MessageModelStatus.byLabels().keySet())
			// Ensure that all checks are valid.
			.ensure();
		// Synchronize the JSON request with the MessageModel object.
		sync(json, messageModel)
			// Write the status.
			.write("status", label->MessageModelStatus.byLabels().get(label));
		// Return the updated MessageModel object.
		return messageModel;
	}

	/**
	 * Reads data from a MessageModel object and creates a JSON response.
	 *
	 * This method takes a MessageModel entity and converts it into a JSON object.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Creates a new empty JSON object.</li>
	 *   <li>Synchronizes the JSON object with the MessageModel entity.</li>
	 *   <li>Reads the "id" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "version" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "category" field from the MessageModel, converts it to its label using MessageModelCategory::getLabel, and writes it to the JSON object.</li>
	 *   <li>Reads the "title" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "text" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "status" field from the MessageModel, converts it to its label using MessageModelStatus::getLabel, and writes it to the JSON object.</li>
	 *   <li>Returns the populated JSON object.</li>
	 * </ol>
	 *
	 * @param messageModel The MessageModel object to read from.
	 * @return A JSON response representing the MessageModel object.
	 */
	Json readFromMessageModel(MessageModel messageModel) {
		// Create a new JSON object.
		Json json = Json.createJsonObject();
		// Synchronize the JSON object with the MessageModel object.
		sync(json, messageModel)
			// Read the id.
			.read("id")
			// Read the version.
			.read("version")
			// Read the category.
			.read("category", MessageModelCategory::getLabel)
			// Read the title.
			.read("title")
			// Read the text.
			.read("text")
			// Read the status.
			.read("status", MessageModelStatus::getLabel);
		// Return the JSON object.
		return json;
	}

	/**
	 * Reads data from a MessageModel object, including its comments and author, and creates a JSON response.
	 *
	 * This method takes a MessageModel entity and converts it into a JSON object,
	 * including the associated comments and author details.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Creates a new empty JSON object.</li>
	 *   <li>Synchronizes the JSON object with the MessageModel entity.</li>
	 *   <li>Reads the "id" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "version" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "category" field from the MessageModel, converts it to its label using MessageModelCategory::getLabel, and writes it to the JSON object.</li>
	 *   <li>Reads the "title" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "text" field from the MessageModel and writes it to the JSON object.</li>
	 *   <li>Reads the "status" field from the MessageModel, converts it to its label using MessageModelStatus::getLabel, and writes it to the JSON object.</li>
	 *   <li>Reads the author information using the readAuthor method and adds it to the JSON object.</li>
	 *   <li>Reads the comments information using the readComments method and adds it to the JSON object.</li>
	 *   <li>Returns the populated JSON object.</li>
	 * </ol>
	 *
	 * @param messageModel The MessageModel object to read from.
	 * @return A JSON response representing the MessageModel object, including its comments and author.
	 */
	Json readFromMessageModelWithComments(MessageModel messageModel) {
		// Create a new JSON object.
		Json json = Json.createJsonObject();
		// Synchronize the JSON object with the MessageModel object.
		sync(json, messageModel)
			// Read the id.
			.read("id")
			// Read the version.
			.read("version")
			// Read the category.
			.read("category", MessageModelCategory::getLabel)
			// Read the title.
			.read("title")
			// Read the text.
			.read("text")
			// Read the status.
			.read("status", MessageModelStatus::getLabel)
			// Read the author.
			.process(this::readAuthor)
			// Read the comments.
			.process(this::readComments);
		// Return the JSON object.
		return json;
	}

	/**
	 * Finds a message model by its ID.
	 *
	 * This method attempts to find a MessageModel entity in the database based on the provided ID.
	 * If a message model is found, it is returned. If no message model is found, a SummerControllerException is thrown.
	 *
	 * @param em The EntityManager to use for database operations.
	 * @param id The ID of the message model to find.
	 * @return The MessageModel entity if found.
	 * @throws SummerControllerException If no message model is found with the given ID, a 404 Not Found exception is thrown.
	 */
	MessageModel findMessageModel(EntityManager em, long id) {
		// Attempt to find the MessageModel in the database using the provided ID.
		MessageModel messageModel = find(em, MessageModel.class, id);
		// If no message model is found, throw a SummerControllerException.
		if (messageModel==null) {
			throw new SummerControllerException(404,
					"Unknown Message Model with id %d", id
			);
		}
		// Return the found message model.
		return messageModel;
	}

	/**
	 * Finds a paginated list of message models based on a given query.
	 *
	 * This method executes a database query to retrieve a subset of MessageModel entities,
	 * applying pagination and optional parameters. It ensures that only distinct message models are returned.
	 *
	 * @param query  The database query to execute.
	 * @param page   The page number to retrieve (0-based index).
	 * @param params Optional parameters to set on the query.
	 * @return A collection of distinct MessageModel entities for the specified page.
	 */
	Collection<MessageModel> findPagedMessageModels(Query query, int page, Object... params) {
		// Set the provided parameters on the query.
		setParams(query, params);
		// Execute the query and retrieve a paginated list of MessageModel entities.
		List<MessageModel> messageModels = getPagedResultList(query, page* MessageModelController.MODELS_BY_PAGE, MessageModelController.MODELS_BY_PAGE);
		// Return only distinct message models.
		return messageModels.stream().distinct().collect(Collectors.toList());
	}

	/**
	 * Converts a collection of MessageModel entities to a JSON array.
	 *
	 * This method iterates through a collection of MessageModel entities and converts each one
	 * into a JSON object using the readFromMessageModel method. The resulting JSON objects are
	 * then added to a JSON array, which is returned.
	 *
	 * @param messageModels The collection of MessageModel entities to convert.
	 * @return A JSON array containing the JSON representation of each MessageModel.
	 */
	Json readFromMessageModels(Collection<MessageModel> messageModels) {
		// Create a new JSON array.
		Json list = Json.createJsonArray();
		// Iterate through each message model and add its JSON representation to the array.
		messageModels.stream().forEach(messageModel->list.push(readFromMessageModel(messageModel)));
		// Return the JSON array.
		return list;
	}

	/**
	 * The number of message models to display per page.
	 */
	static int MODELS_BY_PAGE = 10;
}
