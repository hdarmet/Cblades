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
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;
import org.summer.util.StringReplacer;

import javax.persistence.EntityExistsException;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class AnnouncementController implements
		InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam,
		FileSunbeam, StandardUsers, CommonEntities
{

	@MIME(url="/api/announcement/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getImage(params, "imagename", "/announcements/");
	}

	void storeIllustration (Map<String, Object> params, Announcement announcement) {
		FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
		if (files!= null && files.length>0) {
			if (files.length>1) throw new SummerControllerException(400, "Only one illustration file may be loaded.");
			String fileName = "illustration"+announcement.getId()+"."+files[0].getExtension();
			String webName = "illustration"+announcement.getId()+"-"+PlatformManager.get().now()+"."+files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/announcements/"+fileName));
			announcement.setIllustration("/api/event/images/" + webName);
		}
	}

	@REST(url="/api/announcement/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em -> {
					checkJson(request, true);
					Announcement newAnnouncement = writeToAnnouncement(request, new Announcement());
					persist(em, newAnnouncement);
					storeIllustration(params, newAnnouncement);
					em.flush();
					result.set(readFromAnnouncement(newAnnouncement));
				});
			}
			catch (PersistenceException pe) {
				throw new SummerControllerException(500, pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/announcement/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(a) from Announcement a";
				String queryString = "select a from Announcement a";
				if (search!=null) {
					search = StringReplacer.replace(search,
						"coming", "zoon",
							"soon", "zoon",
							"zoon", "coming_soon");
					String whereClause =" where fts('pg_catalog.english', " +
						"a.description||' '||" +
						"a.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long announcementCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Announcement> announcements = (search == null) ?
					findPagedAnnouncements(em.createQuery(queryString), pageNo):
					findPagedAnnouncements(em.createQuery(queryString), pageNo,
					"search", search);
				result.set(Json.createJsonObject()
					.put("announcements", readFromAnnouncements(announcements))
					.put("count", announcementCount)
					.put("page", pageNo)
					.put("pageSize", AnnouncementController.ANNOUNCEMENTS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/announcement/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String queryString = "select a from Announcement a where a.status=:status";
			Collection<Announcement> announcements =
				findAnnouncements(em.createQuery(queryString),
					"status", AnnouncementStatus.LIVE);
			result.set(Json.createJsonObject()
				.put("announcements", readFromAnnouncements(announcements))
			);
		});
		return result.get();
	}

	@REST(url="/api/announcement/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String id = (String)params.get("id");
				Announcement announcement = findAnnouncement(em, new Long(id));
				result.set(readFromAnnouncement(announcement));
			});
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/announcement/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Announcement announcement= findAnnouncement(em, new Long(id));
					remove(em, announcement);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}
	
	@REST(url="/api/announcement/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					checkJson(request, false);
					Announcement announcement = findAnnouncement(em, new Long(id));
					writeToAnnouncement(request, announcement);
					storeIllustration(params, announcement);
					flush(em);
					result.set(readFromAnnouncement(announcement));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/announcement/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Announcement announcement = findAnnouncement(em, new Long(id));
					writeToAnnouncementStatus(request, announcement);
					flush(em);
					result.set(readFromAnnouncement(announcement));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}
	
	Announcement findAnnouncement(EntityManager em, long id) {
		Announcement announcement = find(em, Announcement.class, id);
		if (announcement==null) {
			throw new SummerControllerException(404, 
				"Unknown Announcement with id %d", id
			);
		}
		return announcement;
	}
	
	void checkJson(Json json, boolean full) {
		Verifier verifier = verify(json);
		if (full) {
			verifier
				.checkRequired("description")
				.checkRequired("illustration");
		}
		verifier
			.checkMinSize("description", 2)
			.checkMaxSize("description", 19995)
			.checkMinSize("illustration", 2)
			.checkMaxSize("illustration", 100)
			.check("status", AnnouncementStatus.byLabels().keySet());
		verifier.ensure();
	}

	Announcement writeToAnnouncement(Json json, Announcement announcement) {
		Synchronizer synchronizer = sync(json, announcement)
			.write("version")
			.write("description")
			.write("illustration")
			.write("status", label->AnnouncementStatus.byLabels().get(label));
		return announcement;
	}

	Announcement writeToAnnouncementStatus(Json json, Announcement announcement) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", AnnouncementStatus.byLabels().keySet())
			.ensure();
		sync(json, announcement)
			.write("status", label->AnnouncementStatus.byLabels().get(label));
		return announcement;
	}

	Json readFromAnnouncement(Announcement announcement) {
		Json lJson = Json.createJsonObject();
		sync(lJson, announcement)
			.read("id")
			.read("version")
			.read("description")
			.read("illustration")
			.read("status", AnnouncementStatus::getLabel);
		return lJson;
	}

	Collection<Announcement> findPagedAnnouncements(Query query, int page, Object... params) {
		setParams(query, params);
		List<Announcement> announcements = getPagedResultList(query, page*AnnouncementController.ANNOUNCEMENTS_BY_PAGE, AnnouncementController.ANNOUNCEMENTS_BY_PAGE);
		return announcements.stream().distinct().collect(Collectors.toList());
	}

	Collection<Announcement> findAnnouncements(Query query, Object... params) {
		setParams(query, params);
		List<Announcement> announcements = getResultList(query);
		return announcements.stream().distinct().collect(Collectors.toList());
	}

	Json readFromAnnouncements(Collection<Announcement> announcements) {
		Json list = Json.createJsonArray();
		announcements.stream().forEach(announcement->list.push(readFromAnnouncement(announcement)));
		return list;
	}

	static int ANNOUNCEMENTS_BY_PAGE = 10;
}
