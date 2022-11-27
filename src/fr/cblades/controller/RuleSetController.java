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

@Controller
public class RuleSetController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@MIME(url="/api/ruleset/documents/:docname")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("docname");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String docName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
				.setName(docName)
				.setStream(PlatformManager.get().getInputStream("/rules/"+docName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeRuleSetImages(Map<String, Object> params, RuleSet ruleSet) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		for (FileSpecification file : files) {
			int ordinalIdx = file.getName().indexOf("-");
			boolean isIcon = file.getName().indexOf("icon-")==0;
			int ordinal = Integer.parseInt(file.getName().substring(ordinalIdx+1));
			if (isIcon) {
				String sheetFileIconName = "sheeticon" + ruleSet.getId() + "_" + ordinal + "." + file.getExtension();
				String sheetWebIconName = "sheeticon" + ruleSet.getId() + "_" + ordinal + "-" + System.currentTimeMillis() + "." + file.getExtension();
				copyStream(file.getStream(), PlatformManager.get().getOutputStream("/rules/" + sheetFileIconName));
				ruleSet.getSheet(ordinal).setIcon("/api/ruleset/documents/" + sheetWebIconName);
			}
			else {
				String sheetFileName = "sheet" + ruleSet.getId() + "_" + ordinal + "." + file.getExtension();
				String sheetWebName = "sheet" + ruleSet.getId() + "_" + ordinal + "-" + System.currentTimeMillis() + "." + file.getExtension();
				copyStream(file.getStream(), PlatformManager.get().getOutputStream("/rules/" + sheetFileName));
				ruleSet.getSheet(ordinal).setPath("/api/ruleset/documents/" + sheetWebName);
			}
		}
	}

	@REST(url="/api/ruleset/by-category/:category", method=Method.GET)
	public Json getByCategory(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
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
		inTransaction(em->{
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
	public Json delete(Map<String, String> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					RuleSet ruleSet = findRuleSet(em, new Long(id));
					if (ruleSet.isPublished()) {
						throw new SummerControllerException(401, "Published rule set cannot be deleted");
					}
					remove(em, ruleSet);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
