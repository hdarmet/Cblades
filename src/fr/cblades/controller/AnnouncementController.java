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

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class AnnouncementController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@MIME(url="/api/announcement/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("imagename");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String imageName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
			    .setName(imageName)
				.setStream(PlatformManager.get().getInputStream("/announcements/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeIllustration (Map<String, Object> params, Announcement announcement) {
		FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
		if (files.length>0) {
			if (files.length>1) throw new SummerControllerException(400, "Only one illustration file may be loaded.");
			String fileName = "illustration"+announcement.getId()+"."+files[0].getExtension();
			String webName = "illustration"+announcement.getId()+"-"+System.currentTimeMillis()+"."+files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/announcements/"+fileName));
			announcement.setIllustration("/api/event/images/" + webName);
		}
	}

	@REST(url="/api/announcement/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Announcement newAnnouncement = writeToAnnouncement(request, new Announcement());
					persist(em, newAnnouncement);
					storeIllustration(params, newAnnouncement);
					em.flush();
					result.set(readFromAnnouncement(newAnnouncement));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Unable to create the announcement"
				);
			}
		}, ADMIN);
	}
	
	@REST(url="/api/announcement/all", method=Method.GET)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = params.get("search");
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
					findAnnouncements(em.createQuery(queryString), pageNo):
					findAnnouncements(em.createQuery(queryString), pageNo,
					"search", search);
				result.set(Json.createJsonObject()
					.put("announcements", readFromAnnouncements(announcements))
					.put("count", announcementCount)
					.put("page", pageNo)
					.put("pageSize", AnnouncementController.ANNOUNCEMENTS_BY_PAGE)
				);
			});
			return result.get();
		}, ADMIN);
	}
	
	@REST(url="/api/announcement/find/:id", method=Method.POST)
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				Announcement announcement = findAnnouncement(em, new Long(id));
				result.set(readFromAnnouncement(announcement));
			});
			return result.get();
		}, ADMIN);
	}
	
	@REST(url="/api/announcement/delete/:id", method=Method.GET)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Announcement announcement= findAnnouncement(em, new Long(id));
					remove(em, announcement);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}
	
	@REST(url="/api/announcement/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = (String)params.get("id");
					Announcement announcement = findAnnouncement(em, new Long(id));
					writeToAnnouncement(request, announcement);
					storeIllustration(params, announcement);
					flush(em);
					result.set(readFromAnnouncement(announcement));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
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
	
	Announcement writeToAnnouncement(Json json, Announcement announcement) {
		Verifier verifier = verify(json)
			.checkRequired("description")
			.checkMinSize("description", 2)
			.checkMaxSize("description", 19995)
			.checkRequired("illustration")
			.checkMinSize("illustration", 2)
			.checkMaxSize("illustration", 100)
			.check("status", AnnouncementStatus.byLabels().keySet());
		verifier.ensure();
		Synchronizer synchronizer = sync(json, announcement)
			.write("version")
			.write("description")
			.write("illustration")
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

	Collection<Announcement> findAnnouncements(Query query, int page, Object... params) {
		setParams(query, params);
		List<Announcement> announcements = getPagedResultList(query, page, AnnouncementController.ANNOUNCEMENTS_BY_PAGE);
		return announcements.stream().distinct().collect(Collectors.toList());
	}
	
	Json readFromAnnouncements(Collection<Announcement> announcements) {
		Json list = Json.createJsonArray();
		announcements.stream().forEach(announcement->list.push(readFromAnnouncement(announcement)));
		return list;
	}

	static int ANNOUNCEMENTS_BY_PAGE = 10;
}