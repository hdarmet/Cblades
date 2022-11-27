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

@Controller
public class ForumController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {

	@REST(url="/api/forum/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Forum newForum = writeToForum(em, request, new Forum());
			ifAuthorized(
				user->{
					try {
						persist(em, newForum);
						result.set(readFromForum(newForum));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Forum with title (%s) already exists",
							request.get("title"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				String queryString = "select f from Forum f";
				Collection<Forum> forums = findForums(em.createQuery(queryString));
				result.set(readFromForums(forums));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/forum/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String queryString = "select f from Forum f where f.status=:status";
			Collection<Forum> forums = findForums(em.createQuery(queryString),
				"status", ForumStatus.LIVE);
			result.set(readFromForums(forums));
		});
		return result.get();
	}

	@REST(url="/api/forum/load/:id", method=Method.GET)
	public Json getForum(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Forum forum = findForum(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromForum(forum));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/read/:id", method=Method.GET)
	public Json readForum(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Forum forum = findForum(em, new Long(id));
			if (forum.getStatus() != ForumStatus.LIVE) {
				throw new SummerControllerException(409, "Forum is not live.");
			}
			result.set(readFromForum(forum));
		});
		return result.get();
	}

	@REST(url="/api/forum/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			Forum forum = findForum(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, forum);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/forum/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Forum forum = findForum(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToForum(em, request, forum);
						flush(em);
						result.set(readFromForum(forum));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Forum forum = findForum(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToForumStatus(em, request, forum);
						flush(em);
						result.set(readFromForum(forum));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	Forum writeToForum(EntityManager em, Json json, Forum forum) {
		try {
			verify(json)
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("description").checkMinSize("description", 2).checkMaxSize("description", 1000)
				.checkRequired("illustration").checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
				.check("status", ForumStatus.byLabels().keySet())
				.ensure();
			sync(json, forum)
				.write("version")
				.write("title")
				.write("description")
				.write("illustration")
				.write("status", label->ForumStatus.byLabels().get(label));
			return forum;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Forum writeToForumStatus(EntityManager em, Json json, Forum forum) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", ForumStatus.byLabels().keySet())
			.ensure();
		sync(json, forum)
			.write("status", label->ForumStatus.byLabels().get(label));
		return forum;
	}

	Json readFromForum(Forum forum) {
		Json json = Json.createJsonObject();
		sync(json, forum)
			.read("id")
			.read("version")
			.read("title")
			.read("description")
			.read("threadCount")
			.read("messageCount")
			.read("status", ForumStatus::getLabel);
		return json;
	}

	Forum findForum(EntityManager em, long id) {
		Forum forum = find(em, Forum.class, id);
		if (forum==null) {
			throw new SummerControllerException(404,
				"Unknown Forum with id %d", id
			);
		}
		return forum;
	}

	Collection<Forum> findForums(Query query, Object... params) {
		setParams(query, params);
		List<Forum> forums = getResultList(query);
		return forums.stream().distinct().collect(Collectors.toList());
	}

	Json readFromForums(Collection<Forum> forums) {
		Json list = Json.createJsonArray();
		forums.stream().forEach(forum->list.push(readFromForum(forum)));
		return list;
	}

	static int FORUMS_BY_PAGE = 16;
}
