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
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityExistsException;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Controleur permettant de gérer le forum
 */
@Controller
public class ForumController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam,
	StandardUsers, CommonEntities {

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
	public Json getForumThreads(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		long id = getLongParam(params, "id", "The Forum ID is missing or invalid (%s)");
		int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
		inReadTransaction(em->{
			Forum forum = findForum(em, id, 404);
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
	public Json getThreadMessages(Map<String, Object> params, Json request) {
		long threadId = getLongParam(params, "id", "The Thread ID is missing or invalid (%s)");
		int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ForumThread forumThread = findForumThread(em, threadId, 404);
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
	public Json getAllThreadMessages(Map<String, Object> params, Json request) {
		long threadId = getLongParam(params, "id", "The Thread ID is missing or invalid (%s)");
		int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em-> {
			ifAuthorized(
				user -> {
					ForumThread forumThread = findForumThread(em, threadId, 404);
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
	public Json getAllForums(Map<String, Object> params, Json request) {
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
		checkForumJson(request, true);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Forum newForum = writeToForumWithComments(em, request, new Forum(), true);
						persist(em, newForum);
						result.set(readFromForumWithComments(newForum));
					}
					catch (EntityExistsException pe) {
						throw new SummerControllerException(409,
							"Forum with title (%s) already exists",
							request.get("title"), null
						);
					}
					catch (PersistenceException pe) {
						throw new SummerControllerException(500, pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/load/:id", method=Method.GET)
	public Json loadForum(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(user->{
				Forum forum = findForum(em, id, 404);
				result.set(readFromForumWithComments(forum));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum ID is missing or invalid (%s)");
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Forum forum = findForum(em, id, 404);
						long threadCount = getSingleResult(em,
							"select count(t) from ForumThread t where t.forum=:forum",
							"forum", forum);
						if (threadCount>0) {
							throw new SummerControllerException(409, "Only empty forums may be deleted.");
						}
						remove(em, forum);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/forum/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum ID is missing or invalid (%s)");
		checkForumJson(request, false);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(
				user -> {
					try {
						Forum forum = findForum(em, id, 404);
						writeToForumWithComments(em, request, forum, false);
						flush(em);
						result.set(readFromForumWithComments(forum));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Forum forum = findForum(em, id, 404);
			ifAuthorized(
				user -> {
					try {
						writeToForumStatus(em, request, forum);
						flush(em);
						result.set(readFromForum(forum));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
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
				long forumId = getIntegerParam(params, "forum", "The Forum ID is missing or invalid (%s)");
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				Forum forum = findForum(em, forumId, 404);
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
		checkForumThreadJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						ForumThread newThread = writeToForumThread(em, request, new ForumThread(), Usage.CREATE);
						persist(em, newThread);
						result.set(readFromForumThreadWithComments(newThread));
					} catch (EntityExistsException ee) {
						throw new SummerControllerException(409,
							"Thread with title (%s) already exists inside the forum",
							request.get("title"), null
						);
					}
					catch (PersistenceException pe) {
						throw new SummerControllerException(500, pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/propose", method=Method.POST)
	public Json proposeThread(Map<String, Object> params, Json request) {
		checkForumThreadJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						ForumThread newThread = writeToForumThread(em, request, new ForumThread(), Usage.AMEND);
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
	public Json amendThread(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Thread ID is missing or invalid (%s)");
		checkForumThreadJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			try {
				ForumThread thread = findForumThread(em, id, 404);
				ifAuthorized(
				user -> {
						writeToForumThread(em, request, thread, Usage.AMEND);
						flush(em);
						result.set(readFromForumThread(thread));
					},
					verifyIfAdminOrOwner(thread)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
			}
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

	@REST(url="/api/forum/thread/load/:id", method=Method.GET)
	public Json loadThread(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Thread ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(user->{
				ForumThread thread = findForumThread(em, id, 404);
				result.set(readFromForumThreadWithComments(thread));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/delete/:id", method=Method.GET)
	public Json deleteThread(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Thread ID is missing or invalid (%s)");
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						ForumThread thread = findForumThread(em, id, 404);
						long threadCount = getSingleResult(em,
							"select count(m) from ForumMessage m where m.thread=:thread",
							"thread", thread);
						if (threadCount>0) {
							throw new SummerControllerException(409, "Only empty threads may be deleted.");
						}
						remove(em, thread);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/forum/message/delete/:id", method=Method.GET)
	public Json deleteMessage(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Message ID is missing or invalid (%s)");
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						ForumMessage message = findForumMessage(em, id, 404);
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
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/forum/thread/update/:id", method=Method.POST)
	public Json updateThread(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Thread ID is missing or invalid (%s)");
		checkForumThreadJson(request, Usage.UPDATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(
				user -> {
					try {
						ForumThread thread = findForumThread(em, id, 404);
						writeToForumThread(em, request, thread, Usage.UPDATE);
						flush(em);
						result.set(readFromForumThreadWithComments(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/forum/thread/update-status/:id", method=Method.POST)
	public Json updateThreadStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Thread ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ForumThread thread = findForumThread(em, id, 404);
			ifAuthorized(
				user -> {
					try {
						writeToForumThreadStatus(em, request, thread);
						flush(em);
						result.set(readFromForumThread(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
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
			try {
				inTransaction(em->{
					newMessage.set(writeToForumMessage(em, request, new ForumMessage()));
					Account author = Account.find(em, user);
					newMessage.get()
						.setAuthor(author)
						.setPublishedDate(PlatformManager.get().today())
						.setPoll(new LikePoll().setLikes(0).setDislikes(0));
					persist(em, newMessage.get());
					result.set(readFromForumMessage(newMessage.get()));
				});
				inTransactionUntilSuccessful(iem-> {
					ForumMessage message = merge(iem, newMessage.get());
					ForumThread forumThread = message.getForumThread();
					forumThread.setMessageCount(forumThread.getMessageCount()+1);
					forumThread.setLastMessage(message);
					Forum forum = forumThread.getForum();
					forum.setLastMessage(message);
					forum.setMessageCount(forum.getMessageCount()+1);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		});
		return result.get();
	}

	@REST(url="/api/forum/message/update-status/:id", method=Method.POST)
	public Json updateMessageStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Message ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ForumMessage message = findForumMessage(em, id, 404);
			ifAuthorized(
				user -> {
					try {
						writeToForumMessageStatus(em, request, message);
						flush(em);
						result.set(readFromForumMessage(message));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	ForumMessage writeToForumMessage(EntityManager em, Json json, ForumMessage forumMessage) {
		verify(json)
			.checkRequired("text").checkMinSize("text", 2).checkMaxSize("text", 10000)
			.checkRequired("thread").checkInteger("thread")
			.ensure();
		sync(json, forumMessage)
			.write("text")
			.writeRef("thread", (Integer id) -> findForumThread(em, id, 409));
		return forumMessage;
	}

	void checkForumJson(Json json, boolean full) {
		verify(json)
			.process(v->{
				if (full) {v
					.checkRequired("title")
					.checkRequired("description")
					.checkRequired("forum");
				}
			})
			.checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkMinSize("description", 2).checkMaxSize("description", 2000)
			.checkInteger("forum")
			.check("status", ForumStatus.byLabels().keySet())
			.process(this::checkComments)
			.ensure();
	}

	Forum writeToForumWithComments(EntityManager em, Json json, Forum forum, boolean full) {
		sync(json, forum)
			.write("version")
			.write("title")
			.write("description")
			.write("status", label->ForumStatus.byLabels().get(label))
			.process(this::writeComments);
		return forum;
	}

	void checkForumThreadJson(Json json, Usage usage) {
		verify(json)
			.process(v->{
				if (usage.creation) {v
						.checkRequired("title")
						.checkRequired("description")
						.checkRequired("forum");
					}
				}
			)
			.checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkMinSize("description", 2).checkMaxSize("description", 2000)
			.checkInteger("forum")
			.process(v->{
				if (!usage.propose) {
					v.check("status", ThemeStatus.byLabels().keySet());
					checkComments(v);
				}
			})
			.checkInteger("author", "Not a valid author id")
			.check("status", ForumStatus.byLabels().keySet())
			.process(this::checkComments)
			.ensure();
	}

	ForumThread writeToForumThread(EntityManager em, Json json, ForumThread thread, Usage usage) {
		sync(json, thread)
			.write("version")
			.write("title")
			.write("description")
			.writeRef("forum", (Integer id) -> findForum(em, id, 409))
			.write("status", label->ForumThreadStatus.byLabels().get(label))
			.process(s->{
				if (!usage.propose) {s
					.writeRef("author", (Integer id)-> findAuthor(em, id, 409))
					.process(this::writeComments);
				}
			});
		return thread;
	}

	Forum writeToForumStatus(EntityManager em, Json json, Forum forum) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", ForumStatus.byLabels().keySet())
			.ensure();
		sync(json, forum)
			.write("status", label->ForumStatus.byLabels().get(label));
		return forum;
	}

	ForumThread writeToForumThreadStatus(EntityManager em, Json json, ForumThread thread) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", ForumThreadStatus.byLabels().keySet())
			.ensure();
		sync(json, thread)
			.write("status", label->ForumThreadStatus.byLabels().get(label));
		return thread;
	}

	ForumMessage writeToForumMessageStatus(EntityManager em, Json json, ForumMessage message) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", ForumMessageStatus.byLabels().keySet())
			.ensure();
		sync(json, message)
			.write("status", label->ForumMessageStatus.byLabels().get(label));
		return message;
	}

	void readExtendedAuthor(Synchronizer synchronizer) {
		synchronizer.readLink("author", (pJson, account)->sync(pJson, account)
			.read("firstName")
			.read("lastName")
			.read("avatar")
			.read("messageCount")
			.process((aJson, author)->
				aJson.put("rating", Account.getRatingLevel((Account)author))
			)
		);
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
			.process(this::readAuthor)
			.process(this::readComments);
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
				.process(this::readExtendedAuthor)
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
			.process(this::readComments)
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

	Forum findForum(EntityManager em, long id, int errCode) {
		Forum forum = find(em, Forum.class, id);
		if (forum==null) {
			throw new SummerControllerException(errCode,
				"Unknown Forum with id %d", id
			);
		}
		return forum;
	}

	ForumThread findForumThread(EntityManager em, long id, int errCode) {
		ForumThread thread = find(em, ForumThread.class, id);
		if (thread==null) {
			throw new SummerControllerException(errCode,
					"Unknown Forum Thread with id %d", id
			);
		}
		return thread;
	}

	ForumMessage findForumMessage(EntityManager em, long id, int errCode) {
		ForumMessage message = find(em, ForumMessage.class, id);
		if (message==null) {
			throw new SummerControllerException(errCode,
					"Unknown Forum Message with id %d", id
			);
		}
		return message;
	}

	Account findAuthor(EntityManager em, long id, int errCode) {
		Account account = find(em, Account.class, id);
		if (account==null) {
			throw new SummerControllerException(errCode,
					"Unknown Account with id %d", id
			);
		}
		return account;
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
		if (!"like".equals(option) && !"dislike".equals(option) && !"none".equals(option)) {
			throw new SummerControllerException(400, "Vote option must be one of these: 'like', 'dislike' or 'none'.");
		}
		LikeVoteOption voteOption = LikeVoteOption.valueOf(option.toUpperCase());
		use(LikeVoteService.class, likeVoteService -> {
			ifAuthorized(
				user -> {
				try {
					inTransaction(em->{
						ForumMessage message = findForumMessage(em, messageId, 404);
						LikeVoteService.Votation votation = likeVoteService.vote(
							em, message.getPoll(),
							voteOption, user
						);
						Json response = readFromPoll(votation);
						result.set(response);
					});
					inTransactionUntilSuccessful(iem->{
						ForumMessage message = findForumMessage(iem, messageId, 404);
						ForumThread thread = message.getForumThread();
						if (voteOption == LikeVoteOption.NONE) {
							thread.setLikeCount(thread.getlikeCount()-1);
						}
						else {
							thread.setLikeCount(thread.getlikeCount()+1);
						}
					});
				} catch (PersistenceException pe) {
					throw new SummerControllerException(500, "Unexpected issue. Please report : %s",  pe.getMessage());
				} catch (SummerPersistenceException pe) {
					throw new SummerControllerException(500, "Unexpected issue. Please report : %s",  pe.getMessage());
				}
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

	@REST(url="/api/forum/message/report/all", method=Method.GET)
	public Json getAllReports(Map<String, Object> params, Json request) {
		int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String search = (String)params.get("search");
				String countQuery = "select count(r) from Report r where r.category=:category";
				String queryString = "select r from Report r" +
						" left outer join fetch r.author a" +
						" left outer join fetch a.access" +
						" where r.category=:category";
				if (search!=null) {
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
		long id = getLongParam(params, "id", "The Forum Report ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(user->{
				Report report = findReport(em, id);
				ForumMessage message = findForumMessage(em, report.getTarget(), 404);
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/report", method=Method.POST)
	public Json report(Map<String, Object> params, Json request) {
		checkJsonReport(request);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Report newReport = writeToReport(em, request, new Report());
						Account author = Account.find(em, user);
						newReport.setAuthor(author).setSendDate(PlatformManager.get().today());
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

	void checkJsonReport(Json json) {
		Function<Json, Verifier> verifyEvent = tJson -> verify(tJson)
			.checkRequired("title")
			.checkMinSize("title", 2)
			.checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkRequired("description")
			.checkMinSize("description", 2)
			.checkMaxSize("description", 19995);
		verify(json)
			.checkRequired("reason").checkMinSize("reason", 2).checkMaxSize("reason", 200)
			.checkPattern("reason", "[\\d\\s\\w]+")
			.checkRequired("text").checkMinSize("text", 2).checkMaxSize("text", 5000)
			.checkRequired("target").checkInteger("target")
			.inspect("reporter", verifyEvent)
			.inspect("author", verifyEvent)
			.ensure();
	}

	Report writeToReport(EntityManager em, Json json, Report report) {
		sync(json, report)
			.write("version")
			.write("reason")
			.write("text")
			.write("target");
		return report;
	}

	Json readFromReport(Report report) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer =sync(json, report)
			.read("id")
			.read("version")
			.readDate("sendDate")
			.read("reason")
			.read("text")
			.read("target");
		readAuthor(synchronizer);
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
			.process(this::readAuthor);
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
			.process(this::readAuthor);
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
		long id = getLongParam(params, "id", "The Forum Report ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				Report report = findReport(em, id);
				ForumMessage message = findForumMessage(em, report.getTarget(), 404);
				createEvents(em, report, message, request);
				report.setStatus(ReportStatus.CANCELLED);
				result.set(readFromReportAndMessage(report, message));
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/forum/message/report/block-message/:id", method=Method.POST)
	public Json removeMessage(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Forum Report ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				Report report = findReport(em, id);
				ForumMessage message = findForumMessage(em, report.getTarget(), 404);
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
		long id = getLongParam(params, "id", "The Forum Report ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				Report report = findReport(em, id);
				ForumMessage message = findForumMessage(em, report.getTarget(), 404);
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
		long id = getLongParam(params, "id", "The Forum Report ID is missing or invalid (%s)");
		long threadId = getLongParam(params, "thread", "The Forum Thread ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(user->{
				Report report = findReport(em, id);
				ForumMessage message = findForumMessage(em, report.getTarget(), 404);
				ForumThread thread = findForumThread(em, threadId, 404);
				createEvents(em, report, message, request);
				report.setStatus(ReportStatus.PROCESSED);
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
				.setDate(PlatformManager.get().today())
				.setStatus(EventStatus.LIVE)
				.setTarget(report.getAuthor());
			writeToEvent(em, reporterEvent, event);
			persist(em, event);
		}
		Json authorEvent = request.get("author");
		if (authorEvent!=null) {
			Event event = new Event()
				.setDate(PlatformManager.get().today())
				.setStatus(EventStatus.LIVE)
				.setTarget(message.getAuthor());
			writeToEvent(em, authorEvent, event);
			persist(em, event);
		}
	}

	Event writeToEvent(EntityManager em, Json json, Event event) {
		sync(json, event)
			.write("title")
			.write("description");
		return event;
	}

}

