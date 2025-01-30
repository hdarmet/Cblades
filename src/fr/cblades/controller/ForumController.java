package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import fr.cblades.services.LikeVoteService;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.controller.Verifier;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.data.SummerPersistenceException;
import org.summer.data.Synchronizer;
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

	@REST(url="/api/forum/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String queryString = "select f from Forum f " +
					"left join fetch f.lastMessage m " +
					"left join fetch m.thread " +
					"where f.status=:status";
			Collection<Forum> forums = findForums(em.createQuery(queryString),
				"status", ForumStatus.LIVE);
			result.set(readFromForums(forums));
		});
		return result.get();
	}

	@REST(url="/api/forum/threads/:id", method=Method.GET)
	public Json readThreads(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String id = (String)params.get("id");
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			Forum forum = findForum(em, new Long(id));
			if (forum.getStatus() != ForumStatus.LIVE) {
				throw new SummerControllerException(409, "Forum is not live.");
			}
			long threadCount = findCount(em.createQuery(
				"select count(t) from ForumThread t " +
				"where t.status=:status and t.forum=:forum"),
				"status", ForumThreadStatus.LIVE,
				"forum", forum);
			Collection<ForumThread> threads = findPagedForumThreads(
				em.createQuery("select t from ForumThread t " +
				"left join fetch t.author w " +
				"left join fetch w.access " +
				"left join fetch t.lastMessage " +
				"join fetch t.forum " +
				"where t.status=:status and t.forum=:forum"), pageNo,
				"status", ForumThreadStatus.LIVE,
				"forum", forum);
			result.set(Json.createJsonObject()
				.put("threads", readFromForumThreads(threads))
				.put("count", threadCount)
				.put("page", pageNo)
				.put("pageSize", ForumController.THREADS_BY_PAGE)
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/messages/:thread", method=Method.GET)
	public Json readMessages(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String threadId = (String)params.get("thread");
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			ForumThread forumThread = findForumThread(em, new Long(threadId));
			if (forumThread.getStatus() != ForumThreadStatus.LIVE) {
				throw new SummerControllerException(409, "Thread is not live.");
			}
			long messageCount = findCount(em.createQuery("select count(m) from ForumMessage m " +
				"where m.thread=:thread " +
				"and m.status=:status"),
		"thread", forumThread,
				"status", ForumMessageStatus.LIVE);
			Collection<ForumMessage> messages = findPagedForumMessages(
				em.createQuery("select m from ForumMessage m " +
					"left join fetch m.author w " +
					"left join fetch w.access " +
					"join fetch m.thread " +
					"join fetch m.poll " +
					"where m.thread=:thread " +
					"and m.status=:status " +
					"order by m.publishedDate desc"), pageNo,
				"thread", forumThread,
					"status", ForumMessageStatus.LIVE);
			result.set(Json.createJsonObject()
				.put("messages", readFromForumMessages(messages))
				.put("count", messageCount)
				.put("page", pageNo)
				.put("pageSize", ForumController.MESSAGES_BY_PAGE)
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/all/:thread", method=Method.GET)
	public Json readAllMessages(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em-> {
			ifAuthorized(
				user -> {
					String threadId = (String) params.get("thread");
					int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
					ForumThread forumThread = findForumThread(em, new Long(threadId));
					if (forumThread.getStatus() != ForumThreadStatus.LIVE) {
						throw new SummerControllerException(409, "Thread is not live.");
					}
					long messageCount = findCount(em.createQuery("select count(m) from ForumMessage m " +
									"where m.thread=:thread"),
							"thread", forumThread);
					Collection<ForumMessage> messages = findPagedForumMessages(
						em.createQuery("select m from ForumMessage m " +
							"left join fetch m.author w " +
							"left join fetch w.access " +
							"join fetch m.thread " +
							"join fetch m.poll " +
							"where m.thread=:thread " +
							"order by m.publishedDate desc"), pageNo,
						"thread", forumThread);
					result.set(Json.createJsonObject()
						.put("messages", readFromForumMessages(messages))
						.put("count", messageCount)
						.put("page", pageNo)
						.put("pageSize", ForumController.MESSAGES_BY_PAGE)
					);
				}, ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String queryString = "select f from Forum f";
				Collection<Forum> forums = findForums(em.createQuery(queryString));
				result.set(readFromForums(forums));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/forum/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Forum newForum = writeToForumWithComments(em, request, new Forum(), true);
			ifAuthorized(
				user->{
					try {
						persist(em, newForum);
						result.set(readFromForumWithComments(newForum));
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

	@REST(url="/api/forum/load/:id", method=Method.GET)
	public Json loadForum(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String id = (String)params.get("id");
			Forum forum = findForum(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromForumWithComments(forum));
			},
			ADMIN);
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
						long threadCount = getSingleResult(em,
							"select count(t) from ForumThread t where t.forum=:forum",
							"forum", forum);
						if (threadCount>0) {
							throw new SummerControllerException(409, "Only empty forums may be deleted.");
						}
						remove(em, forum);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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
						writeToForumWithComments(em, request, forum, false);
						flush(em);
						result.set(readFromForumWithComments(forum));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
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
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/all/:forum", method=Method.GET)
	public Json getAllThreads(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				long forumId = getIntegerParam(params, "forum", "The forum ID is invalid (%s)");
				Forum forum = findForum(em, forumId);
				String countQuery = "select count(t) from ForumThread t" +
					" where t.forum=:forum";
				String queryString = "select t from ForumThread t" +
					" left outer join fetch t.forum" +
					" left outer join fetch t.author a" +
					" left outer join fetch a.access" +
					" where t.forum=:forum";
				long threadCount = getSingleResult(em, countQuery,
					"forum", forum);
				Collection<ForumThread> threads =
					findPagedForumThreads(em.createQuery(queryString), pageNo,
							"forum", forum);
				result.set(Json.createJsonObject()
					.put("threads", 	readFromForumThreads(threads))
					.put("count", threadCount)
					.put("page", pageNo)
					.put("pageSize", ForumController.THREADS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/forum/thread/create", method=Method.POST)
	public Json createThread(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ForumThread newThread = writeToForumThreadWithComments(em, request, new ForumThread(), true);
			ifAuthorized(
				user->{
					try {
						persist(em, newThread);
						result.set(readFromForumThreadWithComments(newThread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Thread with title (%s) already exists inside the Forum",
							request.get("title"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/load/:id", method=Method.GET)
	public Json loadThread(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String id = (String)params.get("id");
			ForumThread thread = findForumThread(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromForumThreadWithComments(thread));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/delete/:id", method=Method.GET)
	public Json deleteThread(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			ForumThread thread = findForumThread(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						long threadCount = getSingleResult(em,
							"select count(m) from ForumMessage m where m.thread=:thread",
							"thread", thread);
						if (threadCount>0) {
							throw new SummerControllerException(409, "Only empty threads may be deleted.");
						}
						remove(em, thread);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/forum/message/delete/:id", method=Method.GET)
	public Json deleteMessage(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			ForumMessage message = findForumMessage(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						ForumThread forumThread = message.getForumThread();
						if (forumThread.getLastMessage()==message) {
							forumThread.setLastMessage(null);
						}
						Forum forum = forumThread.getForum();
						if (forum.getLastMessage()==message) {
							forum.setLastMessage(null);
						}
						remove(em, message);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/forum/thread/update/:id", method=Method.POST)
	public Json updateThread(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			ForumThread thread = findForumThread(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToForumThreadWithComments(em, request, thread, false);
						flush(em);
						result.set(readFromForumThreadWithComments(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/update-status/:id", method=Method.POST)
	public Json updateThreadStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			ForumThread thread = findForumThread(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToForumThreadStatus(em, request, thread);
						flush(em);
						result.set(readFromForumThread(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/post", method=Method.POST)
	public Json postMessage(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			Ref<ForumMessage> newMessage = new Ref<>();
			inTransaction(em->{
				newMessage.set(writeToForumMessage(em, request, new ForumMessage()));
				try {
					Account author = Account.find(em, user);
					newMessage.get()
						.setAuthor(author)
						.setPublishedDate(new Date())
						.setPoll(new LikePoll().setLikes(0).setDislikes(0));
					persist(em, newMessage.get());
					result.set(readFromForumMessage(newMessage.get()));
				} catch (PersistenceException pe) {
					throw new SummerControllerException(409,
						"Forum with title (%s) already exists",
						request.get("title"), null
					);
				}
			});
			inTransactionUntilSuccessful(iem-> {
				try {
					ForumMessage message = merge(iem, newMessage.get());
					ForumThread forumThread = message.getForumThread();
					forumThread.setMessageCount(forumThread.getMessageCount()+1);
					forumThread.setLastMessage(message);
					Forum forum = forumThread.getForum();
					forum.setLastMessage(message);
					forum.setMessageCount(forum.getMessageCount()+1);
				} catch (PersistenceException pe) {
					throw new SummerControllerException(409, pe.getMessage());
				}
			});
		});
		return result.get();
	}

	@REST(url="/api/forum/message/update-status/:id", method=Method.POST)
	public Json updateMessageStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			ForumMessage message = findForumMessage(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToForumMessageStatus(em, request, message);
						flush(em);
						result.set(readFromForumMessage(message));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	ForumMessage writeToForumMessage(EntityManager em, Json json, ForumMessage forumMessage) {
		try {
			verify(json)
				.checkRequired("text").checkMinSize("text", 2).checkMaxSize("text", 10000)
				.checkInteger("thread")
				.ensure();
			sync(json, forumMessage)
				.write("text")
				.writeRef("thread", (Integer id) -> find(em, ForumThread. class, (long)id));
			return forumMessage;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Forum writeToForumWithComments(EntityManager em, Json json, Forum forum, boolean full) {
		Verifier verifier = verify(json);
		try {
			if (full) {
				verifier
					.checkRequired("title")
					.checkRequired("description")
					.each("comments", cJson -> verify(cJson)
						.checkRequired("version")
						.checkRequired("date")
						.checkRequired("text")
					);
			}
			verifier
				.checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.check("status", ForumStatus.byLabels().keySet())
				.checkInteger("author", "Not a valid author id")
				.each("comments", cJson->verify(cJson)
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				);
			verifier
				.ensure();
			sync(json, forum)
				.write("version")
				.write("title")
				.write("description")
				.write("status", label->ForumStatus.byLabels().get(label))
				.writeRef("author", (Integer id)-> Account.find(em, id))
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			return forum;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	ForumThread writeToForumThreadWithComments(EntityManager em, Json json, ForumThread thread, boolean full) {
		Verifier verifier = verify(json);
		try {
			if (full) {
				verifier
					.checkRequired("title")
					.checkRequired("description")
					.checkRequired("forum")
					.each("comments", cJson -> verify(cJson)
						.checkRequired("version")
						.checkRequired("date")
						.checkRequired("text")
					);
			}
			verifier
				.checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.checkInteger("forum")
				.check("status", ForumStatus.byLabels().keySet())
				.checkInteger("author", "Not a valid author id")
				.each("comments", cJson->verify(cJson)
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				);
			verifier
				.ensure();
			sync(json, thread)
				.write("version")
				.write("title")
				.write("description")
				.writeRef("forum", (Integer id) -> find(em, Forum. class, (long)id))
				.write("status", label->ForumThreadStatus.byLabels().get(label))
				.writeRef("author", (Integer id)-> Account.find(em, id))
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			return thread;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	ForumThread writeToProposedForumThread(EntityManager em, Json json, ForumThread thread, boolean full) {
		Verifier verifier = verify(json);
		try {
			if (full) {
				verifier
					.checkRequired("title")
					.checkRequired("description");
			}
			verifier
				.checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.checkInteger("forum")
				.check("status", ForumStatus.byLabels().keySet());
			verifier
				.ensure();
			sync(json, thread)
				.write("version")
				.write("title")
				.write("description")
				.writeRef("forum", (Integer id) -> find(em, Forum. class, (long)id))
				.write("status", label->ForumThreadStatus.byLabels().get(label));
			return thread;
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

	ForumThread writeToForumThreadStatus(EntityManager em, Json json, ForumThread thread) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", ForumThreadStatus.byLabels().keySet())
			.ensure();
		sync(json, thread)
			.write("status", label->ForumThreadStatus.byLabels().get(label));
		return thread;
	}

	ForumMessage writeToForumMessageStatus(EntityManager em, Json json, ForumMessage message) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", ForumMessageStatus.byLabels().keySet())
			.ensure();
		sync(json, message)
			.write("status", label->ForumMessageStatus.byLabels().get(label));
		return message;
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
			.read("status", ForumStatus::getLabel)
			.readLink("lastMessage", (lJson, message)->sync(lJson, message)
				.readDate("publishedDate")
				.readLink("thread", (pJson, account)->sync(pJson, account)
					.read("title")
				)
				.readLink("author", (pJson, account)->sync(pJson, account)
					.read("firstName")
					.read("lastName")
					.read("avatar")
					.read("messageCount")
					.process((aJson, author)->aJson.put("rating", Account.getRatingLevel((Account)author)))
				)
		);
		return json;
	}

	Json readFromForumWithComments(Forum forum) {
		Json json = Json.createJsonObject();
		sync(json, forum)
			.read("id")
			.read("version")
			.read("title")
			.read("description")
			.read("status", ForumStatus::getLabel)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			)
			.readEach("comments", (hJson, hex)->sync(hJson, hex)
				.read("id")
				.read("version")
				.readDate("date")
				.read("text")
			);
		return json;
	}

	Json readFromForumThread(ForumThread thread) {
		Json json = Json.createJsonObject();
		sync(json, thread)
			.read("id")
			.read("version")
			.read("title")
			.read("description")
			.read("likeCount")
			.read("messageCount")
			.read("status", ForumThreadStatus::getLabel)
			.readLink("lastMessage", (lJson, message)->sync(lJson, message)
				.readDate("publishedDate")
				.readLink("author", (pJson, account)->sync(pJson, account)
					.read("firstName")
					.read("lastName")
					.read("avatar")
					.read("messageCount")
					.process((aJson, author)->aJson.put("rating", Account.getRatingLevel((Account)author)))
				)
			);
		return json;
	}

	Json readFromForumThreadWithComments(ForumThread thread) {
		Json json = Json.createJsonObject();
		sync(json, thread)
			.read("id")
			.read("version")
			.read("title")
			.read("description")
			.read("likeCount")
			.read("messageCount")
			.read("status", ForumThreadStatus::getLabel)
			.readEach("comments", (hJson, hex)->sync(hJson, hex)
				.read("id")
				.read("version")
				.readDate("date")
				.read("text")
			)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
				.read("messageCount")
				.process((aJson, author)->aJson.put("rating", Account.getRatingLevel((Account)author)))
			);
		return json;
	}

	Json readFromForumMessage(ForumMessage message) {
		Json json = Json.createJsonObject();
		sync(json, message)
			.read("id")
			.read("version")
			.readDate("publishedDate")
			.read("text")
			.read("status", ForumMessageStatus::getLabel)
			.readLink("poll", (pJson, poll)->sync(pJson, poll)
				.read("id")
				.read("likes")
			)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
				.read("messageCount")
				.process((aJson, author)->aJson.put("rating", Account.getRatingLevel((Account)author)))
			);
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

	ForumThread findForumThread(EntityManager em, long id) {
		ForumThread thread = find(em, ForumThread.class, id);
		if (thread==null) {
			throw new SummerControllerException(404,
					"Unknown Thread with id %d", id
			);
		}
		return thread;
	}

	ForumMessage findForumMessage(EntityManager em, long id) {
		ForumMessage message = find(em, ForumMessage.class, id);
		if (message==null) {
			throw new SummerControllerException(404,
					"Unknown Message with id %d", id
			);
		}
		return message;
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

	Json readFromForumThreads(Collection<ForumThread> threads) {
		Json list = Json.createJsonArray();
		threads.stream().forEach(thread->list.push(readFromForumThread(thread)));
		return list;
	}

	Json readFromForumMessages(Collection<ForumMessage> messages) {
		Json list = Json.createJsonArray();
		messages.stream().forEach(message->list.push(readFromForumMessage(message)));
		return list;
	}

	Collection<ForumThread> findPagedForumThreads(Query query, int page, Object... params) {
		setParams(query, params);
		List<ForumThread> threads = getPagedResultList(query,
				page* ForumController.THREADS_BY_PAGE, ForumController.THREADS_BY_PAGE);
		return threads.stream().distinct().collect(Collectors.toList());
	}

	Collection<ForumMessage> findPagedForumMessages(Query query, int page, Object... params) {
		setParams(query, params);
		List<ForumMessage> messages = getPagedResultList(query,
				page* ForumController.MESSAGES_BY_PAGE, ForumController.MESSAGES_BY_PAGE);
		return messages.stream().distinct().collect(Collectors.toList());
	}

	long findCount(Query query, Object... params) {
		setParams(query, params);
		return getSingleResult(query);
	}

	@REST(url = "/api/forum/vote/:message", method = Method.POST)
	public Json vote(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		long messageId = getIntegerParam(params, "message", "A valid Message Id must be provided.");
		String option = request.get("option");
		if (!"like".equals(option) && !"none".equals(option)) {
			throw new SummerControllerException(400, "Vote option must be one of these: 'like' or 'none'");
		}
		LikeVoteOption voteOption = option.equals("like") ? LikeVoteOption.LIKE : LikeVoteOption.DISLIKE;
		use(LikeVoteService.class, likeVoteService -> {
			ifAuthorized(
				user -> {
				inTransaction(em->{
					try {
						ForumMessage message = find(em, ForumMessage.class, messageId);
						LikeVoteService.Votation votation = likeVoteService.vote(
							em, message.getPoll(),
							voteOption, user
						);
						Json response = readFromPoll(votation);
						result.set(response);
					} catch (SummerPersistenceException pe) {
						throw new SummerControllerException(409, pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				});
				inTransactionUntilSuccessful(iem->{
					try {
						ForumMessage message = find(iem, ForumMessage.class, messageId);
						ForumThread thread = message.getForumThread();
						if (voteOption == LikeVoteOption.LIKE) {
							thread.setLikeCount(thread.getlikeCount()+1);
						}
						else {
							thread.setLikeCount(thread.getlikeCount()-1);
						}
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, pe.getMessage());
					}
				});
			});
		});
		return result.get();
	}

	Json readFromPoll(LikeVoteService.Votation votation) {
		Json json = Json.createJsonObject();
		sync(json, votation.getPoll())
				.read("likes")
				.read("dislikes");
		if (votation.getVote()==null) {
			json.put("option", "none");
		}
		else {
			json.put("option", votation.getVote().getOption()==LikeVoteOption.LIKE ? "like" : "dislike");
		}
		return json;
	}

	@REST(url="/api/forum/thread/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ForumThread newThread = writeToProposedForumThread(em, request, new ForumThread(), true);
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						newThread.setStatus(ForumThreadStatus.PROPOSED);
						newThread.setAuthor(author);
						persist(em, newThread);
						result.set(readFromForumThread(newThread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
								"Thread with title (%s) already exists",
								request.get("title"), null
						);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			ForumThread thread = find(em, ForumThread.class, new Long(id));
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToProposedForumThread(em, request, thread, false);
						flush(em);
						result.set(readFromForumThread(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, "Object Not Found.", snfe.getMessage());
					}
				},
				verifyIfAdminOrOwner(thread)
			);
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(ForumThread forumThread) {
		return (user, roles) -> {
			if (forumThread.getAuthor() != null && forumThread.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	@REST(url="/api/forum/message/report/all", method=Method.GET)
	public Json getAllReports(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(r) from Report r where r.category=:category";
				String queryString = "select r from Report r" +
						" left outer join fetch r.author a" +
						" left outer join fetch a.access" +
						" where r.category=:category";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" and fts('pg_catalog.english', " +
						"r.reason||' '||" +
						"r.text||' '||" +
						"r.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				queryString+=" order by r.sendDate desc";
				long reportCount = (search == null) ?
					getSingleResult(em, countQuery,
						"category", ForumMessage.REPORT):
					getSingleResult(em, countQuery,
						"category", ForumMessage.REPORT,
						"search", search);
				Collection<Report> reports = (search == null) ?
					findPagedReports(em.createQuery(queryString), pageNo,
						"category", ForumMessage.REPORT):
					findPagedReports(em.createQuery(queryString), pageNo,
						"category", ForumMessage.REPORT,
						"search", search);
				result.set(Json.createJsonObject()
					.put("reports", readFromReports(reports))
					.put("count", reportCount)
					.put("page", pageNo)
					.put("pageSize", ForumController.REPORTS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/forum/message/report/load/:id", method=Method.GET)
	public Json loadReport(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(user->{
				String id = (String)params.get("id");
				Report report = findReport(em, new Long(id));
				ForumMessage message = findForumMessage(em, report.getTarget());
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/report", method=Method.POST)
	public Json report(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Report newReport = writeToReport(em, request, new Report());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						newReport.setAuthor(author).setSendDate(new Date());
						newReport.setCategory(ForumMessage.REPORT);
						persist(em, newReport);
						result.set(readFromReport(newReport));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report: %s", pe);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, "User not found: "+user, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	Report writeToReport(EntityManager em, Json json, Report report) {
		try {
			verify(json)
				.checkRequired("reason").checkMinSize("reason", 2).checkMaxSize("reason", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("text").checkMinSize("text", 2).checkMaxSize("text", 5000)
				.checkInteger("target")
				.ensure();
			sync(json, report)
				.write("version")
				.write("reason")
				.write("text")
				.write("target");
			return report;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Json readFromReport(Report report) {
		Json json = Json.createJsonObject();
		sync(json, report)
			.read("id")
			.read("version")
			.readDate("sendDate")
			.read("reason")
			.read("text")
			.read("target")
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		return json;
	}

	Json readFromReportAndMessage(Report report, ForumMessage message) {
		Json json = Json.createJsonObject();
		sync(json, report)
			.read("id")
			.read("version")
			.readDate("sendDate")
			.read("reason")
			.read("text")
			.read("target")
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		json.put("message", Json.createJsonObject());
		sync((Json)json.get("message"), message)
			.read("id")
			.read("version")
			.readDate("publishedDate")
			.read("text")
			.readLink("thread", (mtJson, thread)->sync(mtJson, thread)
				.read("id")
				.read("title")
				.readLink("forum", (mfJson, forum)->sync(mfJson, forum)
					.read("id")
					.read("title")
				)
			)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
		return json;
	}

	Collection<Report> findPagedReports(Query query, int page, Object... params) {
		setParams(query, params);
		List<Report> reports = getPagedResultList(query,
				page* ForumController.REPORTS_BY_PAGE, ForumController.REPORTS_BY_PAGE);
		return reports.stream().distinct().collect(Collectors.toList());
	}

	Json readFromReports(Collection<Report> reports) {
		Json list = Json.createJsonArray();
		reports.stream().forEach(report->list.push(readFromReport(report)));
		return list;
	}

	Report findReport(EntityManager em, long id) {
		Report report = find(em, Report.class, id);
		if (report==null) {
			throw new SummerControllerException(404,
				"Unknown Report with id %d", id
			);
		}
		return report;
	}

	static int THREADS_BY_PAGE = 16;
	static int MESSAGES_BY_PAGE = 16;
	static int REPORTS_BY_PAGE = 16;

	@REST(url="/api/forum/message/report/close/:id", method=Method.POST)
	public Json closeReport(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				String id = (String)params.get("id");
				Report report = findReport(em, new Long(id));
				ForumMessage message = findForumMessage(em, report.getTarget());
				createEvents(em, report, message, request);
				report.setStatus(ReportStatus.CANCELED);
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/report/block-message/:id", method=Method.POST)
	public Json removeMessage(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				String id = (String)params.get("id");
				Report report = findReport(em, new Long(id));
				ForumMessage message = findForumMessage(em, report.getTarget());
				createEvents(em, report, message, request);
				report.setStatus(ReportStatus.PROCESSED);
				message.setStatus(ForumMessageStatus.BLOCKED);
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/report/block-and-ban/:id", method=Method.POST)
	public Json removeMessageAndBanAuthor(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				String id = (String)params.get("id");
				Report report = findReport(em, new Long(id));
				ForumMessage message = findForumMessage(em, report.getTarget());
				createEvents(em, report, message, request);
				report.setStatus(ReportStatus.PROCESSED);
				message.setStatus(ForumMessageStatus.BLOCKED);
				message.getAuthor().setStatus(AccountStatus.BLOCKED);
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/report/move-message/:id", method=Method.POST)
	public Json moveMessage(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				String id = (String)params.get("id");
				Report report = findReport(em, new Long(id));
				ForumMessage message = findForumMessage(em, report.getTarget());
				createEvents(em, report, message, request);
				report.setStatus(ReportStatus.PROCESSED);
				Integer threadId = request.get("thread");
				if (threadId==null) {
					throw new SummerControllerException(400,
						"selecting a target thread is required"
					);
				}
				ForumThread thread = findForumThread(em, threadId);
				if (thread==null) {
					throw new SummerControllerException(404,
						"Message thread not found: %d", threadId
					);
				}
				message.setForumThread(thread);
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	void createEvents(EntityManager em, Report report, ForumMessage message, Json request) {
		Json reporterEvent = request.get("reporter");
		if (reporterEvent!=null) {
			Event event = new Event()
				.setDate(new Date())
				.setStatus(EventStatus.LIVE)
				.setTarget(report.getAuthor());
			writeToEvent(em, reporterEvent, event);
			persist(em, event);
		}
		Json authorEvent = request.get("author");
		if (authorEvent!=null) {
			Event event = new Event()
				.setDate(new Date())
				.setStatus(EventStatus.LIVE)
				.setTarget(message.getAuthor());
			writeToEvent(em, authorEvent, event);
			persist(em, event);
		}
	}

	Event writeToEvent(EntityManager em, Json json, Event event) {
		try {
			Verifier verifier = verify(json)
				.checkRequired("title")
				.checkMinSize("title", 2)
				.checkMaxSize("title", 19995)
				.checkRequired("description")
				.checkMinSize("description", 2)
				.checkMaxSize("description", 19995);
			verifier.ensure();
			sync(json, event)
				.write("title")
				.write("description");
			return event;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

}

