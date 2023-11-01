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
public class MessageModelController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@REST(url="/api/message-model/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			MessageModel newMessageModel = writeToMessageModel(em, request, new MessageModel());
			ifAuthorized(
				user->{
					try {
						persist(em, newMessageModel);
						result.set(readFromMessageModelWithComments(newMessageModel));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Message Model with title (%s) already exists",
							request.get("title"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/message-model/category/:category", method=Method.GET)
	public Json getByCategory(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(
				user->{
					int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
					String category = (String)params.get("category");
					String search = (String)params.get("search");
					String countQuery = "select count(m) from MessageModel m " +
							"where m.category=:category";
					String queryString = "select m from MessageModel m " +
							"where m.category=:category";
					if (search!=null) {
						/*
						search = StringReplacer.replace(search,
								"tester", "test");
						 */
						String whereClause =" and fts('pg_catalog.english', " +
							"m.title||' '||" +
							"m.category||' '||" +
							"m.text||' '||" +
							"m.status, :search) = true";
						queryString+=whereClause;
						countQuery+=whereClause;
					}
					long messageModelCount = (search == null) ?
						getSingleResult(em, countQuery,
							"category", MessageModelCategory.byLabel(category)) :
						getSingleResult(em, countQuery,
							"category", MessageModelCategory.byLabel(category),
							"search", search);
					Collection<MessageModel> messageModels = (search == null) ?
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category)):
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category),
							"search", search);
					result.set(Json.createJsonObject()
						.put("messageModels", readFromMessageModels(messageModels))
						.put("count", messageModelCount)
						.put("page", pageNo)
						.put("pageSize", MessageModelController.MODELS_BY_PAGE)
					);
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/message-model/category/live/:category", method=Method.GET)
	public Json getByLiveCategory(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(
				user->{
					int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
					String category = (String)params.get("category");
					String search = (String)params.get("search");
					String countQuery = "select count(m) from MessageModel m" +
						" where m.category=:category" +
						" and m.status=:status";
					String queryString = "select m from MessageModel m" +
						" where m.category=:category" +
						" and m.status=:status";
					if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
						String whereClause =" and fts('pg_catalog.english', " +
							"m.title||' '||" +
							"m.category||' '||" +
							"m.text||' '||" +
							"m.status, :search) = true";
						queryString+=whereClause;
						countQuery+=whereClause;
					}
					long messageModelCount = (search == null) ?
					getSingleResult(em, countQuery,
						"category", MessageModelCategory.byLabel(category)) :
					getSingleResult(em, countQuery,
						"category", MessageModelCategory.byLabel(category),
						"search", search);
					Collection<MessageModel> messageModels = (search == null) ?
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category),
							"status", MessageModelStatus.LIVE):
						findPagedMessageModels(em.createQuery(queryString), pageNo,
							"category", MessageModelCategory.byLabel(category),
							"status", MessageModelStatus.LIVE,
							"search", search);
					result.set(Json.createJsonObject()
						.put("messageModels", readFromMessageModels(messageModels))
						.put("count", messageModelCount)
						.put("page", pageNo)
						.put("pageSize", MessageModelController.MODELS_BY_PAGE)
					);
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/message-model/load/:id", method=Method.GET)
	public Json getMessageModelWithComments(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			MessageModel messageModel = findMessageModel(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromMessageModelWithComments(messageModel));
			},
			verifyIfAdminOrOwner(messageModel));
		});
		return result.get();
	}

	@REST(url="/api/message-model/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			MessageModel messageModel = findMessageModel(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, messageModel);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				verifyIfAdminOrOwner(messageModel)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/message-model/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			MessageModel messageModel = findMessageModel(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToMessageModel(em, request, messageModel);
						flush(em);
						result.set(readFromMessageModelWithComments(messageModel));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/message-model/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			MessageModel messageModel = findMessageModel(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToMessageModelStatus(em, request, messageModel);
						flush(em);
						result.set(readFromMessageModel(messageModel));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(MessageModel messageModel) {
		return (user, roles) -> {
			if (messageModel.getAuthor() != null && messageModel.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	MessageModel writeToMessageModel(EntityManager em, Json json, MessageModel messageModel) {
		try {
			verify(json)
				.check("category", MessageModelCategory.byLabels().keySet())
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("text").checkMinSize("text", 2).checkMaxSize("text", 5000)
				.check("status", MessageModelStatus.byLabels().keySet())
				.each("comments", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, messageModel)
				.write("version")
				.write("category", label->MessageModelCategory.byLabels().get(label))
				.write("title")
				.write("text")
				.write("status", label->MessageModelStatus.byLabels().get(label))
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			return messageModel;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	MessageModel writeToMessageModelStatus(EntityManager em, Json json, MessageModel messageModel) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", MessageModelStatus.byLabels().keySet())
			.ensure();
		sync(json, messageModel)
			.write("status", label->MessageModelStatus.byLabels().get(label));
		return messageModel;
	}

	Json readFromMessageModel(MessageModel messageModel) {
		Json json = Json.createJsonObject();
		sync(json, messageModel)
			.read("id")
			.read("version")
			.read("category", MessageModelCategory::getLabel)
			.read("title")
			.read("text")
			.read("status", MessageModelStatus::getLabel);
		return json;
	}

	Json readFromMessageModelWithComments(MessageModel messageModel) {
		Json json = Json.createJsonObject();
		sync(json, messageModel)
			.read("id")
			.read("version")
			.read("category", MessageModelCategory::getLabel)
			.read("title")
			.read("text")
			.read("status", MessageModelStatus::getLabel)
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

	MessageModel findMessageModel(EntityManager em, long id) {
		MessageModel messageModel = find(em, MessageModel.class, id);
		if (messageModel==null) {
			throw new SummerControllerException(404,
				"Unknown Message Model with id %d", id
			);
		}
		return messageModel;
	}

	Collection<MessageModel> findPagedMessageModels(Query query, int page, Object... params) {
		setParams(query, params);
		List<MessageModel> messageModels = getPagedResultList(query, page* MessageModelController.MODELS_BY_PAGE, MessageModelController.MODELS_BY_PAGE);
		return messageModels.stream().distinct().collect(Collectors.toList());
	}

	Json readFromMessageModels(Collection<MessageModel> messageModels) {
		Json list = Json.createJsonArray();
		messageModels.stream().forEach(messageModel->list.push(readFromMessageModel(messageModel)));
		return list;
	}

	static int MODELS_BY_PAGE = 10;
}
