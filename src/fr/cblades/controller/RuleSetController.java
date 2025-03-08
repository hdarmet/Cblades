package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.MagicArt;
import fr.cblades.domain.Notice;
import fr.cblades.domain.RuleSet;
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
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Controleur permettant de manipuler des documents contenant les règles du jeu
 */
@Controller
public class RuleSetController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam,
		ControllerSunbeam, StandardUsers, CommonEntities {

	/**
	 * Endpoint (accessible via "/api/ruleset/documents/:docname") permettant de télécharger depuis le navigateur
	 * une image associée à un ensemble de règles.
	 * @param params paramètres de l'URL (on utilisera le paraètre "docname" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/ruleset/documents/:docname")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/rules/");
	}

	void storeRuleSetImages(Map<String, Object> params, RuleSet ruleSet) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		FileSpecification ruleSetImage = storeSheetImages(
			files, ruleSet.getId(), ruleSet.getSheets(),
			"Rule Set", "/rules/", "/api/ruleset/documents/"
		);
		if (ruleSetImage != null) {
			throw new SummerControllerException(400, "This image: %s is not attached to a sheet.", ruleSetImage.getFileName());
		}
	}

	@REST(url="/api/ruleset/by-category/:category", method=Method.GET)
	public Json getByCategory(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				String name = params.get("category");
				List<RuleSet> ruleSets = getResultList(em,
					"select distinct r from RuleSet r " +
					"left outer join fetch r.sheets " +
					"where r.category = :category",
					"category", name);
				result.set(readFromRuleSets(ruleSets));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/ruleset/published/:category", method=Method.GET)
	public Json getPublished(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String name = params.get("category");
			RuleSet ruleSet = getSingleResult(em,
		"select r from RuleSet r " +
				"left outer join fetch r.sheets " +
				"where r.category = :category and r.published = true",
		"category", name);
			result.set(readFromRuleSet(ruleSet));
		});
		return result.get();
	}

	@REST(url="/api/ruleset/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Ruleset ID is missing or invalid (%s)");
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					RuleSet ruleSet = findRuleSet(em, id);
					if (ruleSet.isPublished()) {
						throw new SummerControllerException(401, "Published rule set cannot be deleted");
					}
					remove(em, ruleSet);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/ruleset/save", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				checkIncomingRuleSet(request);
				inTransaction(em->{
					Integer id = request.get("id");
					RuleSet ruleSet = id!=null ? findRuleSet(em, id) : new RuleSet();
					boolean published = request.get("published");
					if (ruleSet.isPublished() != published) {
						if (published) {
							unpublishRuleSet(em, (String)request.get("category"));
						}
						else {
							throw new SummerControllerException(401, "At least one notice of category %s must be published.", ruleSet.getCategory());
						}
					}
					writeToRuleSet(request, ruleSet);
					storeRuleSetImages(params, ruleSet);
					if (ruleSet.getId()==0) {
						persist(em, ruleSet);
					}
					flush(em);
					result.set(readFromRuleSet(ruleSet));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	void unpublishRuleSet(EntityManager em, String category) {
		RuleSet publishedRuleSet = getSingleResult(em,
			"select r from RuleSet r where r.published = true and r.category = :category",
			"category", category);
		publishedRuleSet.setPublished(false);
	}

	RuleSet findRuleSet(EntityManager em, long id) {
		RuleSet ruleSet = find(em, RuleSet.class, id);
		if (ruleSet==null) {
			throw new SummerControllerException(404,
			    "Unknown Notice with id %d", id
			);
		}
		return ruleSet;
	}

	void checkIncomingRuleSet(Json json) {
		verify(json)
			.checkRequired("category").checkMinSize("text", 2).checkMaxSize("path", 95)
			.checkRequired("ruleSetVersion").checkMinSize("ruleSetVersion", 1).checkMaxSize("ruleSetVersion", 45)
			.checkRequired("published").checkBoolean("published")
			.each("sheets", cJson->verify(cJson)
				.checkRequired("version")
				.checkRequired("ordinal")
				.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 200)
				.checkPattern("name", "[\\d\\s\\w]+")
				.checkRequired("description")
				.checkMinSize("description", 2)
				.checkMaxSize("description", 19995)
				.checkRequired("icon")
				.checkMinSize("icon", 2).checkMaxSize("icon", 200)
				.checkRequired("path")
				.checkMinSize("path", 2).checkMaxSize("path", 200)
			)
			.ensure();
	}

	RuleSet writeToRuleSet(Json json, RuleSet ruleSet) {
		sync(json, ruleSet)
			.write("version")
			.write("category")
			.write("ruleSetVersion")
			.write("published")
			.syncEach("sheets", (cJson, comment)->sync(cJson, comment)
				.write("version")
				.write("ordinal")
				.write("name")
				.write("description")
				.write("icon")
				.write("path")
			);
		return ruleSet;
	}

	Json readFromRuleSet(RuleSet ruleSet) {
		Json json = Json.createJsonObject();
		sync(json, ruleSet)
			.read("id")
			.read("version")
			.read("category")
			.read("ruleSetVersion")
			.read("published")
			.readEach("sheets", (pJson, sheet)->sync(pJson, sheet)
				.read("id")
				.read("version")
				.read("name")
				.read("description")
				.read("icon")
				.read("path")
		);
		return json;
	}

	Json readFromRuleSets(Collection<RuleSet> ruleSets) {
		Json list = Json.createJsonArray();
		ruleSets.stream().forEach(ruleSet->list.push(readFromRuleSet(ruleSet)));
		return list;
	}

}
