package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.Notice;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Controller
public class NoticeController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/notice/by-category/:category", method=Method.GET)
	public Json getByCategory(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String name = params.get("category");
				List<Notice> notices = getResultList(em,
						"select n from Notice n where n.category = :category",
						"category", name);
				result.set(readFromNotices(notices));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/notice/published", method=Method.GET)
	public Json getPublished(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			List<Notice> notices = getResultList(em,
				"select n from Notice n where n.published = true");
			result.set(readFromNotices(notices));
		});
		return result.get();
	}

	@REST(url="/api/notice/delete/:id", method=Method.GET)
	public Json delete(Map<String, String> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Notice notice = findNotice(em, new Long(id));
					if (notice.isPublished()) {
						throw new SummerControllerException(401, "Published notice cannot be deleted");
					}
					remove(em, notice);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/notice/save", method=Method.POST)
	public Json update(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				checkIncomingNotice(request);
				inTransaction(em->{
					Integer id = request.get("id");
					Notice notice = id!=null ? findNotice(em, id) : new Notice();
					boolean published = request.get("published");
					if (notice.isPublished() != published) {
						if (published) {
							unpublishNotice(em, (String)request.get("category"));
						}
						else {
							throw new SummerControllerException(401, "At least one notice of category %s must be published.", notice.getCategory());
						}
					}
					writeToNotice(request, notice);
					if (notice.getId()==0) {
						persist(em, notice);
					}
					flush(em);
					result.set(readFromNotice(notice));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}

	void unpublishNotice(EntityManager em, String category) {
		Notice publishedNotice = getSingleResult(em,
				"select n from Notice n where n.published = true and n.category = :category",
				"category", category);
		publishedNotice.setPublished(false);
	}

	Notice findNotice(EntityManager em, long id) {
		Notice notice = find(em, Notice.class, id);
		if (notice==null) {
			throw new SummerControllerException(404,
			    "Unknown Notice with id %d", id
			);
		}
		return notice;
	}

	void checkIncomingNotice(Json json) {
		verify(json)
			.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 250)
			.checkRequired("text").checkMinSize("text", 2).checkMaxSize("path", 3995)
			.checkRequired("category").checkMinSize("text", 2).checkMaxSize("path", 95)
			.checkRequired("noticeVersion").checkMinSize("noticeVersion", 1).checkMaxSize("noticeVersion", 45)
			.checkRequired("published").checkBoolean("published")
			.ensure();
	}

	Notice writeToNotice(Json json, Notice notice) {
		sync(json, notice)
			.write("version")
			.write("title")
			.write("text")
			.write("category")
			.write("noticeVersion")
			.write("published");
		return notice;
	}

	Json readFromNotice(Notice notice) {
		Json json = Json.createJsonObject();
		sync(json, notice)
			.read("id")
			.read("version")
			.read("title")
			.read("text")
			.read("category")
			.read("noticeVersion")
			.read("published");
		return json;
	}

	Json readFromNotices(Collection<Notice> notices) {
		Json list = Json.createJsonArray();
		notices.stream().forEach(notice->list.push(readFromNotice(notice)));
		return list;
	}

}
