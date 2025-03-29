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
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;
import org.summer.util.StringReplacer;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for managing events.
 * This class handles HTTP requests related to events, including creating, updating,
 * retrieving, and deleting events. It also manages event illustrations.
 */
@Controller
public class EventController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam,
		ControllerSunbeam, StandardUsers, CommonEntities {

	/**
	 * The number of events to display per page.
	 */
	static int EVENTS_BY_PAGE = 10;

	/**
	 * Endpoint for downloading an image associated with an event.
	 * Accessible via "/api/event/images/:imagename".
	 *
	 * @param params URL parameters, including "imagename" which specifies the image name.
	 * @return A FileSpecification that Summer will use to send the image to the browser.
	 */
	@MIME(url="/api/event/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		// Retrieve and return the requested image file.
		return this.getFile(params, "imagename", "/events/");
	}

	/**
	 * Stores an event's illustration image on the file system/cloud blob storage.
	 * Associates the image with the event by setting the "illustration" field to the image's URL.
	 * The image content is extracted from the HTTP message by Summer and passed in the params
	 * under the MULTIPART_FILES key (an array with at most one element).
	 *
	 * The image is stored in the "/events" subdirectory/blob under a name that is the concatenation
	 * of "illustration" and the event's ID.
	 *
	 * @param params HTTP request parameters (the image, if present, is under MULTIPART_FILES).
	 * @param event  The event to associate the image with.
	 */
	void storeIllustration (Map<String, Object> params, Event event) {
		// Retrieve the uploaded files from the parameters.
		FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
		// Check if any files were uploaded.
		if (files!=null) {
			// Validate that only one file was uploaded.
			if (files.length!= 1) throw new SummerControllerException(400, "Only one illustration file may be loaded.");
			// Save the uploaded file and set the illustration URL in the event object.
			event.setIllustration(saveFile(files[0],
					"illustration"+event.getId(), // Generate a unique filename.
					"/events/", // Specify the directory/blob path.
					"/api/event/images/" // Specify the base URL for accessing the image.
			));
		}
	}

	/**
	 * Creates a new event based on the provided JSON request.
	 *
	 * This method handles the HTTP POST request to create a new event. It performs the following steps:
	 * <ul>
	 *   <li>Validates the incoming JSON request to ensure it contains the required fields and fields are valid (using checkJson).</li>
	 *   <li>Checks if the user is authorized to create an event (must be an ADMIN).</li>
	 *   <li>Executes the event creation within a database transaction to ensure data integrity.</li>
	 *   <li>Creates a new Event entity and populates it with data from the JSON request (using writeToEvent).</li>
	 *   <li>Persists the new event to the database (using persist).</li>
	 *   <li>Stores the event's illustration image (if provided) in the file system/cloud storage (using storeIllustration).</li>
	 *   <li>Flushes the changes to the database to ensure they are written.</li>
	 *   <li>Reads the newly created event from the database and returns it as a JSON response (using readFromEvent).</li>
	 *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
	 * </ul>.
	 *
	 * @param params  HTTP request parameters, including any uploaded files (e.g., illustration).
	 * @param request The JSON request body containing the event data.
	 *                It should include fields like "date", "title", and "description".
	 * @return A JSON response representing the newly created event, including its ID and other details.
	 * @throws SummerControllerException If there's an issue creating the event, such as invalid data or a database error.
	 */
	@REST(url = "/api/event/create", method = Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		// Validate the JSON request, ensuring all required fields are present and all fields are valid.
		checkJson(request, true);
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Check if the caller is authorized to create an event.
		ifAuthorized(user -> {
			try {
				// Start a database transaction to ensure atomicity.
				inTransaction(em -> {
					// Create a new Event and populate it from the JSON request.
					Event newEvent = writeToEvent(em, request, new Event(), true);
					// Persist the new event to the database.
					persist(em, newEvent);
					// Store the event's illustration (if any) and associate it with the event.
					storeIllustration(params, newEvent);
					// Flush the EntityManager to ensure changes are written to the database.
					em.flush();
					// Return a JSON representation of the newly created event.
					result.set(readFromEvent(newEvent));
				});
			} catch (PersistenceException pe) {
				// Catch any database-related exceptions.
				// Throw a SummerControllerException with a 409 Conflict status.
				throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe); // Provide a user-friendly error message.
			}
		}, ADMIN); // Only users with the ADMIN role are authorized to create events.
		// Return the JSON representation of the created event.
		return result.get();
	}

	/**
	 * Updates an existing event based on the provided JSON request.
	 *
	 * This method handles the HTTP POST request to update an existing event. It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the event ID from the URL parameters.</li>
	 *   <li>Validates the incoming JSON request to ensure it contains valid data (using checkJson).</li>
	 *   <li>Checks if the user is authorized to update an event (must be an ADMIN).</li>
	 *   <li>Executes the event update within a database transaction to ensure data integrity.</li>
	 *   <li>Finds the existing Event entity in the database using the provided ID (using findEvent).</li>
	 *   <li>Updates the Event entity with data from the JSON request (using writeToEvent).</li>
	 *   <li>Stores the event's illustration image (if provided) in the file system/cloud storage (using storeIllustration).</li>
	 *   <li>Flushes the changes to the database to ensure they are written.</li>
	 *   <li>Reads the updated event from the database and returns it as a JSON response (using readFromEvent).</li>
	 *   <li>Handles potential PersistenceExceptions (e.g., database errors) by throwing a SummerControllerException.</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the event ID.
	 * @param request The JSON request body containing updated event data.
	 *                It may include fields like "date", "title", "description", etc.
	 * @return A JSON response representing the updated event, including its ID and other details.
	 * @throws SummerControllerException If there's an issue updating the event, such as invalid data, a missing event, or a database error.
	 */
	@REST(url="/api/event/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		// Retrieve the event ID from the URL parameters.
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		// Validate the JSON request, ensuring all fields are valid.
		checkJson(request, false);
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Check if the caller is authorized to update an event.
		ifAuthorized(user->{
			try {
				// Start a database transaction to ensure atomicity.
				inTransaction(em->{
					// Find the existing event in the database.
					Event event = findEvent(em, id);
					// Update the event with data from the JSON request.
					writeToEvent(em, request, event, false);
					// Store the event's illustration (if any) and associate it with the event.
					storeIllustration(params, event);
					// Flush the EntityManager to ensure changes are written to the database.
					flush(em);
					// Return a JSON representation of the updated event.
					result.set(readFromEvent(event));
				});
			} catch (PersistenceException pe) {
				// Catch any database-related exceptions.
				// Throw a SummerControllerException with a 409 Conflict status.
				throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN); // Only users with the ADMIN role are authorized to update events.
		// Return the JSON representation of the updated event.
		return result.get();
	}

	/**
	 * Retrieves all events, with optional filtering and pagination.
	 *
	 * This method handles the HTTP GET request to retrieve a list of events. It supports pagination
	 * and optional filtering by a search term. It performs the following steps:
	 * <ol>
	 *   <li>Checks if the user is authorized to retrieve events (must be an ADMIN).</li>
	 *   <li>Executes the event retrieval within a read-only database transaction.</li>
	 *   <li>Retrieves the requested page number from the URL parameters.</li>
	 *   <li>Retrieves an optional search term from the URL parameters.</li>
	 *   <li>Constructs a database query to count the total number of events, optionally filtering by the search term.</li>
	 *   <li>Executes the count query to get the total number of events.</li>
	 *   <li>Constructs a database query to retrieve the events, optionally filtering by the search term and joining with related entities.</li>
	 *   <li>Executes the query to retrieve the events for the requested page.</li>
	 *   <li>Reads the events from the database and returns them as a JSON response, along with pagination information (using readFromEvents).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including optional "page" and "search".
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response containing a list of events, the total event count, the current page number, and the page size.
	 */
	@REST(url="/api/event/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Check if the caller is authorized to retrieve all events.
		ifAuthorized(user->{
			// Start a read-only database transaction.
			inReadTransaction(em->{
				// Retrieve the requested page number from the URL parameters.
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				// Retrieve the optional search term from the URL parameters.
				String search = (String)params.get("search");
				// Construct a database query to count the total number of events.
				String countQuery = "select count(e) from Event e";
				// Construct a database query to retrieve the events, joining with related entities.
				String queryString = "select e from Event e left outer join fetch e.target t left outer join fetch t.access";
				// If a search term is provided, modify the queries to filter by the search term.
				if (search!=null) {
					// Replace some words to improve the search.
					search = StringReplacer.replace(search,
							"coming", "zoon",
							"soon", "zoon",
							"zoon", "coming_soon");
					// Add a where clause to the queries to filter by the search term.
					String whereClause =" where fts('pg_catalog.english', " +
							"e.title||' '||" +
							"e.description||' '||" +
							"e.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				// Execute the count query to get the total number of events.
				long eventCount = (search == null) ?
						getSingleResult(em.createQuery(countQuery)) :
						getSingleResult(em.createQuery(countQuery)
								.setParameter("search", search));
				// Execute the query to retrieve the events for the requested page.
				Collection<Event> events = (search == null) ?
						findEvents(em.createQuery(queryString), pageNo):
						findEvents(em.createQuery(queryString), pageNo,
								"search", search);
				// Return a JSON representation of the events, along with pagination information.
				result.set(Json.createJsonObject()
						.put("events", readFromEvents(events))
						.put("count", eventCount)
						.put("page", pageNo)
						.put("pageSize", EventController.EVENTS_BY_PAGE)
				);
			});
		}, ADMIN); // Only users with the ADMIN role are authorized to retrieve all events.
		// Return the JSON representation of the events.
		return result.get();
	}

	/**
	 * Retrieves live events that are not associated with a specific account.
	 *
	 * This method handles the HTTP GET request to retrieve live events (status=LIVE) that are not associated with any
	 * specific account (target is null). It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the requested page number from the URL parameters.</li>
	 *   <li>Executes the event retrieval within a read-only database transaction.</li>
	 *   <li>Constructs a database query to find events with status=LIVE and target=null.</li>
	 *   <li>Executes the query to retrieve the events.</li>
	 *   <li>Reads the events from the database and returns them as a JSON response (using readFromEvents).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including optional "page".
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response containing a list of live events.
	 */
	@REST(url="/api/event/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Start a read-only database transaction.
		inReadTransaction(em->{
			// Retrieve the requested page number from the URL parameters.
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			// Construct a database query to find events with status=LIVE and target=null.
			String queryString = "select e from Event e where e.status=:status and e.target is null order by e.date desc";
			// Execute the query to retrieve the events.
			Collection<Event> events =
					findEvents(em.createQuery(queryString), pageNo,
							"status", EventStatus.LIVE);
			// Return a JSON representation of the events.
			result.set(Json.createJsonObject()
					.put("events", readFromEvents(events))
			);
		});
		// Return the JSON representation of the events.
		return result.get();
	}

	/**
	 * Retrieves live events associated with a specific account.
	 *
	 * This method handles the HTTP GET request to retrieve live events (status=LIVE) that are associated with a specific
	 * user's account. It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the requested page number from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to access this information (any logged-in user can access their own account's events).</li>
	 *   <li>Executes the event retrieval within a read-only database transaction.</li>
	 *   <li>Finds the Account entity in the database associated with the logged-in user (using Login.findAccountByLogin).</li>
	 *   <li>Throws a SummerControllerException if no account is found for the logged-in user.</li>
	 *   <li>Constructs a database query to find events with status=LIVE and target=the found account.</li>
	 *   <li>Executes the query to retrieve the events.</li>
	 *   <li>Reads the events from the database and returns them as a JSON response (using readFromEvents).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including optional "page".
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response containing a list of live events for the account.
	 * @throws SummerControllerException If there's an issue retrieving the events, such as a missing account or a database error.
	 */
	@REST(url="/api/event/account-live", method=Method.GET)
	public Json getAccountLive(Map<String, Object> params, Json request) {
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Check if the caller is authorized to retrieve events for an account.
		ifAuthorized(user-> {
			// Start a read-only database transaction.
			inReadTransaction(em -> {
				// Retrieve the requested page number from the URL parameters.
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				// Find the Account entity associated with the logged-in user.
				Account account = Login.findAccountByLogin(em, user);
				// Throw an exception if no account is found for the logged-in user.
				if (account==null) {
					throw new SummerControllerException(404, "No Account for login: "+user);
				}
				// Construct a database query to find events with status=LIVE and target=the found account.
				String queryString = "select e from Event e where e.status=:status and e.target=:account order by e.date desc";
				// Execute the query to retrieve the events.
				Collection<Event> events =
						findEvents(em.createQuery(queryString), pageNo,
								"account", account,
								"status", EventStatus.LIVE);
				// Return a JSON representation of the events.
				result.set(Json.createJsonObject()
						.put("events", readFromEvents(events))
				);
			});
		});
		// Return the JSON representation of the events.
		return result.get();
	}

	/**
	 * Retrieves an event by its ID.
	 *
	 * This method handles the HTTP POST request to retrieve a specific event based on its ID.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the event ID from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to retrieve an event (must be an ADMIN).</li>
	 *   <li>Executes the event retrieval within a read-only database transaction.</li>
	 *   <li>Finds the Event entity in the database using the provided ID (using findEvent).</li>
	 *   <li>Reads the event from the database and returns it as a JSON response (using readFromEvent).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the event ID.
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response representing the event.
	 * @throws SummerControllerException If there's an issue retrieving the event, such as a missing event or a database error.
	 */
	@REST(url="/api/event/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		// Retrieve the event ID from the URL parameters.
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Check if the caller is authorized to retrieve an event.
		ifAuthorized(user->{
			// Start a read-only database transaction.
			inReadTransaction(em->{
				// Find the event in the database.
				Event event = findEvent(em, id);
				// Return a JSON representation of the event.
				result.set(readFromEvent(event));
			});
		}, ADMIN); // Only users with the ADMIN role are authorized to retrieve events.
		// Return the JSON representation of the event.
		return result.get();
	}

	/**
	 * Deletes an event by its ID.
	 *
	 * This method handles the HTTP GET request to delete a specific event based on its ID.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the event ID from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to delete an event (must be an ADMIN).</li>
	 *   <li>Executes the event deletion within a database transaction.</li>
	 *   <li>Finds the Event entity in the database using the provided ID (using findEvent).</li>
	 *   <li>Removes the event from the database.</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the event ID.
	 * @param request The JSON request body (not used in this method).
	 * @return A JSON response indicating that the event was deleted.
	 * @throws SummerControllerException If there's an issue deleting the event, such as a missing event or a database error.
	 */
	@REST(url="/api/event/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		// Retrieve the event ID from the URL parameters.
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		// Check if the caller is authorized to delete an event.
		ifAuthorized(user->{
			try {
				// Start a database transaction to ensure atomicity.
				inTransaction(em->{
					// Find the event in the database.
					Event event= findEvent(em, id);
					// Remove the event from the database.
					remove(em, event);
				});
			} catch (PersistenceException pe) {
				// Catch any database-related exceptions.
				// Throw a SummerControllerException with a 409 Conflict status.
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN); // Only users with the ADMIN role are authorized to delete events.
		// Return a JSON response indicating that the event was deleted.
		return Json.createJsonObject().put("deleted", "ok");
	}

	/**
	 * Updates the status of an existing event based on the provided JSON request.
	 *
	 * This method handles the HTTP POST request to update the status of an existing event.
	 * It performs the following steps:
	 * <ol>
	 *   <li>Retrieves the event ID from the URL parameters.</li>
	 *   <li>Checks if the user is authorized to update an event (must be an ADMIN).</li>
	 *   <li>Executes the event status update within a database transaction.</li>
	 *   <li>Finds the Event entity in the database using the provided ID (using findEvent).</li>
	 *   <li>Updates the Event entity's status with data from the JSON request (using writeToEventStatus).</li>
	 *   <li>Flushes the changes to the database to ensure they are written.</li>
	 *   <li>Reads the updated event from the database and returns it as a JSON response (using readFromEvent).</li>
	 * </ol>
	 *
	 * @param params  HTTP request parameters, including the event ID.
	 * @param request The JSON request body containing the updated event status.
	 *                It should include the "status" field.
	 * @return A JSON response representing the updated event, including its ID and other details.
	 * @throws SummerControllerException If there's an issue updating the event status, such as invalid data, a missing event, or a database error.
	 */
	@REST(url="/api/event/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		// Retrieve the event ID from the URL parameters.
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		// Use a Ref to hold the result, allowing modification within lambdas.
		Ref<Json> result = new Ref<>();
		// Check if the caller is authorized to update an event.
		ifAuthorized(user->{
			try {
				// Start a database transaction to ensure atomicity.
				inTransaction(em->{
					// Find the event in the database.
					Event event = findEvent(em, id);
					// Update the event's status with data from the JSON request.
					writeToEventStatus(em, request, event);
					// Flush the EntityManager to ensure changes are written to the database.
					flush(em);
					// Return a JSON representation of the updated event.
					result.set(readFromEvent(event));
				});
			} catch (PersistenceException pe) {
				// Catch any database-related exceptions.
				// Throw a SummerControllerException with a 409 Conflict status.
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN); // Only users with the ADMIN role are authorized to update events.
		// Return the JSON representation of the updated event.
		return result.get();
	}

	/**
	 * Finds an event by its ID and throws an exception if not found.
	 *
	 * @param em The EntityManager to use.
	 * @param id The ID of the event to find.
	 * @return The found Event.
	 * @throws SummerControllerException If the event is not found.
	 */
	Event findEvent(EntityManager em, long id) {
		// Find the event in the database.
		Event event = find(em, Event.class, id);
		// Throw an exception if the event is not found.
		if (event==null) {
			throw new SummerControllerException(404,
					"Unknown Event with id %d", id
			);
		}
		// Return the found event.
		return event;
	}

	/**
	 * Validates the JSON request for creating or updating an event.
	 *
	 * @param json The JSON request to validate.
	 * @param full True if all fields are required, false otherwise.
	 */
	void checkJson(Json json, boolean full) {
		// Verify the JSON request.
		verify(json)
				// Process the JSON request.
				.process(v->{
					// If all fields are required.
					if (full) {v
							// Check if the required fields are present.
							.checkRequired("date")
							.checkRequired("title")
							.checkRequired("description");
					}
				})
				// Check if the date is valid.
				.checkDate("date")
				// Check if the title is valid.
				.checkMinSize("title", 2)
				.checkMaxSize("title", 1000)
				.checkPattern("title", "[\\d\\s\\w]+")
				// Check if the description is valid.
				.checkMinSize("description", 2)
				.checkMaxSize("description", 19995)
				// Check if the status is valid.
				.check("status", EventStatus.byLabels().keySet())
				// Ensure that all checks are valid.
				.ensure();
	}

	/**
	 * Writes data from a JSON request to an Event object.
	 *
	 * @param em The EntityManager to use.
	 * @param json The JSON request to read from.
	 * @param event The Event object to write to.
	 * @param full True if all checking must be performed, false otherwise.
	 * @return The updated Event object.
	 * @throws SummerControllerException If a related entity is not found.
	 */
	Event writeToEvent(EntityManager em, Json json, Event event, boolean full) {
		try {
			// Synchronize the JSON request with the Event object.
			sync(json, event)
				// Write the version.
				.write("version")
				// Write the date.
				.writeDate("date")
				// Write the title.
				.write("title")
				// Write the description.
				.write("description")
				// Write the status.
				.write("status", label -> EventStatus.byLabels().get(label))
				// Write the target.
				.writeRef("target.id", "target", (Integer id) -> Account.find(em, id));
			// Return the updated Event object.
			return event;
		} catch (SummerNotFoundException snfe) {
			// Throw an exception if a related entity is not found.
			throw new SummerControllerException(409, snfe.getMessage());
		}
	}

	/**
	 * Writes the status from a JSON request to an Event object.
	 *
	 * @param em The EntityManager to use.
	 * @param json The JSON request to read from.
	 * @param event The Event object to write to.
	 * @return The updated Event object.
	 */
	Event writeToEventStatus(EntityManager em, Json json, Event event) {
		// Verify the JSON request.
		verify(json)
				// Check if the id is valid.
				.checkRequired("id").checkInteger("id", "Not a valid id")
				// Check if the status is valid.
				.checkRequired("status").check("status", EventStatus.byLabels().keySet())
				// Ensure that all checks are valid.
				.ensure();
		// Synchronize the JSON request with the Event object.
		sync(json, event)
				// Write the status.
				.write("status", label->EventStatus.byLabels().get(label));
		// Return the updated Event object.
		return event;
	}

	/**
	 * Reads data from an Event object and creates a JSON response.
	 *
	 * @param event The Event object to read from.
	 * @return A JSON response representing the Event object.
	 */
	Json readFromEvent(Event event) {
		// Create a new JSON object.
		Json lJson = Json.createJsonObject();
		// Synchronize the JSON object with the Event object.
		sync(lJson, event)
				// Read the id.
				.read("id")
				// Read the version.
				.read("version")
				// Read the date.
				.readDate("date")
				// Read the title.
				.read("title")
				// Read the description.
				.read("description")
				// Read the illustration.
				.read("illustration")
				// Read the status.
				.read("status", EventStatus::getLabel)
				// Read the target.
				.readLink("target", (pJson, account)->sync(pJson, account)
						// Read the id.
						.read("id")
						// Read the login.
						.read("login", "access.login")
						// Read the first name.
						.read("firstName")
						// Read the last name.
						.read("lastName")
						// Read the avatar.
						.read("avatar")
				);
		// Return the JSON object.
		return lJson;
	}

	/**
	 * Finds events based on a query, with pagination and optional parameters.
	 *
	 * @param query The database query to execute.
	 * @param page The page number to retrieve.
	 * @param params Optional parameters to set on the query.
	 * @return A collection of Event objects.
	 */
	Collection<Event> findEvents(Query query, int page, Object... params) {
		// Set the parameters on the query.
		setParams(query, params);
		// Get the paged result list.
		List<Event> events = getPagedResultList(query, page*EventController.EVENTS_BY_PAGE, EventController.EVENTS_BY_PAGE);
		// Return the distinct events.
		return events.stream().distinct().collect(Collectors.toList());
	}

	/**
	 * Reads data from a collection of Event objects and creates a JSON response.
	 *
	 * @param events The collection of Event objects to read from.
	 * @return A JSON response representing the collection of Event objects.
	 */
	Json readFromEvents(Collection<Event> events) {
		// Create a new JSON array.
		Json list = Json.createJsonArray();
		// Add each event to the JSON array.
		events.stream().forEach(event->list.push(readFromEvent(event)));
		// Return the JSON array.
		return list;
	}
}