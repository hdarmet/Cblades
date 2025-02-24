package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.Presentation;
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

/**
 * Controleur permettant de manipuler des présentations, c'est à dire des textes explicatifs.
 */
@Controller
public class PresentationController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/presentation/by-category/:category", method=Method.GET)
	public Json getByCategory(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String name = params.get("category");
				List<Presentation> presentations = getResultList(em,
						"select p from Presentation p where p.category = :category",
						"category", name);
				result.set(readFromPresentations(presentations));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/presentation/published", method=Method.GET)
	public Json getPublished(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			List<Presentation> presentations = getResultList(em,
					"select p from Presentation p where p.published = true");
			result.set(readFromPresentations(presentations));
		});
		return result.get();
	}

	@REST(url="/api/presentation/delete/:id", method=Method.GET)
	public Json delete(Map<String, String> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Presentation presentation = findPresentation(em, new Long(id));
					if (presentation.isPublished()) {
						throw new SummerControllerException(401, "Published presentation cannot be deleted");
					}
					remove(em, presentation);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/presentation/save", method=Method.POST)
	public Json update(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				checkIncomingPresentation(request);
				inTransaction(em->{
					Integer id = request.get("id");
					Presentation presentation = id!=null ? findPresentation(em, id) : new Presentation();
					boolean published = request.get("published");
					if (presentation.isPublished() != published) {
						if (published) {
							unpublishPresentation(em, (String)request.get("category"));
						}
						else {
							throw new SummerControllerException(401, "At least one presentation of category %s must be published.", presentation.getCategory());
						}
					}
					writeToPresentation(request, presentation);
					if (presentation.getId()==0) {
						persist(em, presentation);
					}
					flush(em);
					result.set(readFromPresentation(presentation));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	void unpublishPresentation(EntityManager em, String category) {
		Presentation publishedPresentation = getSingleResult(em,
				"select p from Presentation p where p.published = true and p.category = :category",
				"category", category);
		publishedPresentation.setPublished(false);
	}

	Presentation findPresentation(EntityManager em, long id) {
		Presentation presentation = find(em, Presentation.class, id);
		if (presentation==null) {
			throw new SummerControllerException(404,
			    "Unknown Presentation with id %d", id
			);
		}
		return presentation;
	}

	void checkIncomingPresentation(Json json) {
		verify(json)
			.checkRequired("text").checkMinSize("text", 2).checkMaxSize("path", 3995)
			.checkRequired("category").checkMinSize("text", 2).checkMaxSize("path", 95)
			.checkRequired("presentationVersion").checkMinSize("presentationVersion", 1).checkMaxSize("presentationVersion", 45)
			.checkRequired("published").checkBoolean("published")
			.ensure();
	}

	Presentation writeToPresentation(Json json, Presentation presentation) {
		sync(json, presentation)
			.write("version")
			.write("text")
			.write("category")
			.write("presentationVersion")
			.write("published");
		return presentation;
	}

	Json readFromPresentation(Presentation presentation) {
		Json json = Json.createJsonObject();
		sync(json, presentation)
			.read("id")
			.read("version")
			.read("text")
			.read("category")
			.read("presentationVersion")
			.read("published");
		return json;
	}

	Json readFromPresentations(Collection<Presentation> presentations) {
		Json list = Json.createJsonArray();
		presentations.stream().forEach(presentation->list.push(readFromPresentation(presentation)));
		return list;
	}

}
