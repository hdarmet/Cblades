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
 * Controleur permettant de manipuler des évènements
 */
@Controller
public class EventController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam,
		ControllerSunbeam, StandardUsers, CommonEntities {

	/**
	 * Endpoint (accessible via "/api/event/images/:imagename") permettant de télécharger depuis le navigateur
	 * une image associée à un évènement.
	 * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/event/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/events/");
	}

	/**
	 * Stocke sur le système de fichiers/blob Cloud, l'image associée à un évènement (il ne peut y en avoir qu'une) et
	 * l'associe à l'évènement (en précisant l'URL de l'image dans le champ "illustration" de l'évènement). Le contenu
	 * de l'image a été, au préalable, extrait du message HTTP (par Summer) et passé dans le paramètre params sous
	 * l'étiquette MULTIPART_FILES (un tableau qui ne doit contenir au plus qu'un élément)<br>
	 * L'image sera stockée dans le sous répertoire/blob nommé "/events" sous un nom qui est la concaténation de
	 * "illustration" et l'ID de l'évènement.
	 * @param params paramètres d'appel HTTP (l'image a stocker si elle existe, est accessible via l'étiquette
	 *               MULTIPART_FILES)
	 * @param event évènement auquel il faut associer l'image.
	 */
	void storeIllustration (Map<String, Object> params, Event event) {
		FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
		if (files.length>0) {
			if (files.length>1) throw new SummerControllerException(400, "Only one illustration file may be loaded.");
			event.setIllustration(saveFile(files[0],
				"illustration"+event.getId(),
				"/events/", "/api/event/images/"
			));
		}
	}

	@REST(url="/api/event/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		checkJson(request, true);
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Event newEvent = writeToEvent(em, request, new Event(), true);
					persist(em, newEvent);
					storeIllustration(params, newEvent);
					em.flush();
					result.set(readFromEvent(newEvent));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Unable to create the event"
				);
			}
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/event/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(e) from Event e";
				String queryString = "select e from Event e left outer join fetch e.target t left outer join fetch t.access";
				if (search!=null) {
					search = StringReplacer.replace(search,
						"coming", "zoon",
							"soon", "zoon",
							"zoon", "coming_soon");
					String whereClause =" where fts('pg_catalog.english', " +
						"e.title||' '||" +
						"e.description||' '||" +
						"e.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long eventCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Event> events = (search == null) ?
					findEvents(em.createQuery(queryString), pageNo):
					findEvents(em.createQuery(queryString), pageNo,
					"search", search);
				result.set(Json.createJsonObject()
					.put("events", readFromEvents(events))
					.put("count", eventCount)
					.put("page", pageNo)
					.put("pageSize", EventController.EVENTS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/event/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			String queryString = "select e from Event e where e.status=:status and e.target is null order by e.date desc";
			Collection<Event> events =
				findEvents(em.createQuery(queryString), pageNo,
					"status", EventStatus.LIVE);
			result.set(Json.createJsonObject()
				.put("events", readFromEvents(events))
			);
		});
		return result.get();
	}

	@REST(url="/api/event/account-live", method=Method.GET)
	public Json getAccountLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user-> {
			inReadTransaction(em -> {
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				Account account = Login.findAccountByLogin(em, user);
				if (account==null) {
					throw new SummerControllerException(404, "No Account for login: "+user);
				}
				String queryString = "select e from Event e where e.status=:status and e.target=:account order by e.date desc";
				Collection<Event> events =
					findEvents(em.createQuery(queryString), pageNo,
						"account", account,
						"status", EventStatus.LIVE);
				result.set(Json.createJsonObject()
					.put("events", readFromEvents(events))
				);
			});
		});
		return result.get();
	}

	@REST(url="/api/event/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				Event event = findEvent(em, id);
				result.set(readFromEvent(event));
			});
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/event/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Event event= findEvent(em, id);
					remove(em, event);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}
	
	@REST(url="/api/event/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		checkJson(request, false);
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Event event = findEvent(em, id);
					writeToEvent(em, request, event, false);
					storeIllustration(params, event);
					flush(em);
					result.set(readFromEvent(event));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/event/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Event ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Event event = findEvent(em, id);
					writeToEventStatus(em, request, event);
					flush(em);
					result.set(readFromEvent(event));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}
	
	Event findEvent(EntityManager em, long id) {
		Event event = find(em, Event.class, id);
		if (event==null) {
			throw new SummerControllerException(404, 
				"Unknown Event with id %d", id
			);
		}
		return event;
	}

	void checkJson(Json json, boolean full) {
		verify(json)
			.process(v->{
				if (full) {v
					.checkRequired("date")
					.checkRequired("title")
					.checkRequired("description");
				}
			})
			.checkMinSize("title", 2)
			.checkMaxSize("title", 19995)
			.checkMinSize("description", 2)
			.checkMaxSize("description", 19995)
			.checkMinSize("illustration", 2)
			.checkMaxSize("illustration", 100)
			.check("status", EventStatus.byLabels().keySet())
			.ensure();
	}

	Event writeToEvent(EntityManager em, Json json, Event event, boolean full) {
		try {
			sync(json, event)
				.write("version")
				.writeDate("date")
				.write("title")
				.write("description")
				.write("illustration")
				.write("status", label -> EventStatus.byLabels().get(label))
				.writeRef("target.id", "target", (Integer id) -> Account.find(em, id));
			return event;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Event writeToEventStatus(EntityManager em, Json json, Event event) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", EventStatus.byLabels().keySet())
			.ensure();
		sync(json, event)
			.write("status", label->EventStatus.byLabels().get(label));
		return event;
	}

	Json readFromEvent(Event event) {
		Json lJson = Json.createJsonObject();
		sync(lJson, event)
			.read("id")
			.read("version")
			.readDate("date")
			.read("title")
			.read("description")
			.read("illustration")
			.read("status", EventStatus::getLabel)
			.readLink("target", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		return lJson;
	}

	Collection<Event> findEvents(Query query, int page, Object... params) {
		setParams(query, params);
		List<Event> events = getPagedResultList(query, page*EventController.EVENTS_BY_PAGE, EventController.EVENTS_BY_PAGE);
		return events.stream().distinct().collect(Collectors.toList());
	}
	
	Json readFromEvents(Collection<Event> events) {
		Json list = Json.createJsonArray();
		events.stream().forEach(event->list.push(readFromEvent(event)));
		return list;
	}

	static int EVENTS_BY_PAGE = 10;
}
