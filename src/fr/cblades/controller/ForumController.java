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
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.data.SummerPersistenceException;
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
		inTransaction(em->{
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
		inTransaction(em->{
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
			Collection<ForumThread> threads = findPagedThreads(
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

	@REST(url="/api/forum/messages/:id", method=Method.GET)
	public Json readMessages(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			ForumThread forumThread = findForumThread(em, new Long(id));
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

	@REST(url="/api/forum/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Forum newForum = writeToForumWithComments(em, request, new Forum());
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
		inTransaction(em->{
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
						writeToForumWithComments(em, request, forum);
						flush(em);
						result.set(readFromForumWithComments(forum));
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

	@REST(url="/api/forum/thread/all", method=Method.GET)
	public Json getAllThreads(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				String queryString = "select t from ForumThread t";
				Collection<ForumThread> forumThreads = findForumThreads(em.createQuery(queryString));
				result.set(readFromForumThreads(forumThreads));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/forum/thread/create", method=Method.POST)
	public Json createThread(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ForumThread newThread = writeToForumThreadWithComments(em, request, new ForumThread());
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
		inTransaction(em->{
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
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
						writeToForumThreadWithComments(em, request, thread);
						flush(em);
						result.set(readFromForumThreadWithComments(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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

	Forum writeToForum(EntityManager em, Json json, Forum forum) {
		try {
			verify(json)
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("description")
					.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.check("status", ForumStatus.byLabels().keySet())
				.ensure();
			sync(json, forum)
				.write("version")
				.write("title")
				.write("description")
				.write("status", label->ForumStatus.byLabels().get(label));
			return forum;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Forum writeToForumWithComments(EntityManager em, Json json, Forum forum) {
		try {
			verify(json)
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("description")
					.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.check("status", ForumStatus.byLabels().keySet())
				.each("comments", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, forum)
				.write("version")
				.write("title")
				.write("description")
				.write("status", label->ForumStatus.byLabels().get(label))
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

	ForumThread writeToForumThreadWithComments(EntityManager em, Json json, ForumThread thread) {
		try {
			verify(json)
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("description")
				.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.checkInteger("forum")
				.check("status", ForumStatus.byLabels().keySet())
				.checkInteger("author", "Not a valid author id")
				.each("comments", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, thread)
				.write("version")
				.write("title")
				.write("description")
				.writeRef("forum", (Integer id) -> find(em, Forum. class, (long)id))
				.write("status", label->ForumThreadStatus.byLabels().get(label))
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
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

	ForumThread writeToProposedForumThread(EntityManager em, Json json, ForumThread thread) {
		try {
			verify(json)
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("description")
					.checkMinSize("description", 2).checkMaxSize("description", 2000)
				.checkInteger("forum")
				.check("status", ForumStatus.byLabels().keySet())
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

	Collection<Forum> findForums(Query query, Object... params) {
		setParams(query, params);
		List<Forum> forums = getResultList(query);
		return forums.stream().distinct().collect(Collectors.toList());
	}

	Collection<ForumThread> findForumThreads(Query query, Object... params) {
		setParams(query, params);
		List<ForumThread> threads = getResultList(query);
		return threads.stream().distinct().collect(Collectors.toList());
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

	Collection<ForumThread> findPagedThreads(Query query, int page, Object... params) {
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

	static int THREADS_BY_PAGE = 16;
	static int MESSAGES_BY_PAGE = 16;

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
			ForumThread newThread = writeToProposedForumThread(em, request, new ForumThread());
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
						writeToProposedForumThread(em, request, thread);
						flush(em);
						result.set(readFromForumThread(thread));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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

	@REST(url="/api/forum/message/report", method=Method.POST)
	public Json report(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Report newReport = writeToForumMessageReport(em, request, new Report());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						newReport.setAuthor(author).setSendDate(new Date());
						persist(em, newReport);
						result.set(readFromForumMessageReport(newReport));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, "Unexpected issue", pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, "User not found: "+user, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	Report writeToForumMessageReport(EntityManager em, Json json, Report report) {
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

	Json readFromForumMessageReport(Report report) {
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

}