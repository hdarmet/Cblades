package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.hibernate.Hibernate;
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

/**
 * Controleur permettant de manipuler des scénarios
 */
@Controller
public class ScenarioController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam,
		ControllerSunbeam, StandardUsers, CommonEntities {

	/**
	 * Endpoint (accessible via "/api/scenario/images/:imagename") permettant de télécharger depuis le navigateur
	 * une image associée à un scénario.
	 * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/scenario/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/scenarios/");
	}

	/**
	 * Stocke sur le système de fichiers/blob Cloud, l'image associée à un scénario (il ne peut y en avoir qu'une) et
	 * l'associe au scénario (en précisant l'URL de l'image dans le champ "illustration" du scénario). Le contenu de
	 * l'image a été, au préalable, extrait du message HTTP (par Summer) et passé dans le paramètre params sous
	 * l'étiquette MULTIPART_FILES (un tableau qui ne doit contenir au plus qu'un élément)<br>
	 * L'image sera stockée dans le sous répertoire/blob nommé "/scenarios" sous un nom qui est la concaténation
	 * de "scenario" et l'ID du thème.
	 * @param params paramètres d'appel HTTP (l'image a stocker si elle existe, est accessible via l'étiquette
	 *               MULTIPART_FILES)
	 * @param scenario scénario auquel il faut associer l'image.
	 */
	void storeScenarioImages(Map<String, Object> params, Scenario scenario) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files.length > 0) {
			if (files.length!= 1) throw new SummerControllerException(400, "One Scenario file must be loaded.");
			scenario.setIllustration(saveFile(files[0],
				"scenario" + scenario.getId(),
				"/scenarios/", "/api/scenario/images/"
			));
		}
	}

	@REST(url="/api/scenario/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		checkJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Scenario newScenario = writeToScenario(
							em, request,
							new Scenario().setGame(
								new Game().setMap(new fr.cblades.domain.Map())
							),
							Usage.PROPOSE
						);
						Account author = Account.find(em, user);
						addComment(request, newScenario, author);
						newScenario.setStatus(ScenarioStatus.PROPOSED);
						newScenario.setAuthor(author);
						persist(em, newScenario);
						storeScenarioImages(params, newScenario);
						result.set(readFromScenario(newScenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Scenario with title (%s) already exists",
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

	@REST(url="/api/scenario/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Scenario ID is missing or invalid (%s)");
		checkJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Scenario scenario = findScenario(em, id);
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToScenario(em, request, scenario, Usage.AMEND);
						addComment(request, scenario, author);
						storeScenarioImages(params, scenario);
						flush(em);
						result.set(readFromScenario(scenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				},
				verifyIfAdminOrOwner(scenario)
			);
		});
		return result.get();
	}

	@REST(url="/api/scenario/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		checkJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Scenario newScenario = writeToScenario(em, request,
							new Scenario().setGame(
								new Game().setMap(new fr.cblades.domain.Map())
							),
							Usage.CREATE
						);
						persist(em, newScenario);
						storeScenarioImages(params, newScenario);
						result.set(readFromScenario(newScenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Scenario with title (%s) already exists",
							request.get("title"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/scenario/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(s) from Scenario s";
				String queryString = "select s from Scenario s" +
						" left outer join fetch s.game g" +
						" left outer join fetch g.map m";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" where fts('pg_catalog.english', " +
						"s.title||' '||" +
						"s.story||' '||" +
						"s.setUp||' '||" +
						"s.victoryConditions||' '||" +
						"s.specialRules||' '||" +
						"s.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long scenarioCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Scenario> scenarios = (search == null) ?
					findPagedScenarios(em.createQuery(queryString), pageNo):
					findPagedScenarios(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("scenarios", readFromScenarioSummaries(scenarios))
					.put("count", scenarioCount)
					.put("page", pageNo)
					.put("pageSize", ScenarioController.SCENARIOS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/scenario/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			String search = (String)params.get("search");
			String countQuery = "select count(s) from Scenario s where s.status = :status";
			String queryString = "select s from Scenario s" +
					" left outer join fetch s.game g" +
					" left outer join fetch g.map m" +
					" left outer join fetch g.players p" +
					" left outer join fetch p.identity i" +
					" where s.status = :status";
			if (search!=null) {
				/*
				search = StringReplacer.replace(search,
						"tester", "test");
				 */
				String whereClause =" and fts('pg_catalog.english', " +
					"s.title||' '||" +
					"s.story||' '||" +
					"s.setUp||' '||" +
					"s.victoryConditions||' '||" +
					"s.specialRules||' '||" +
					"s.status, :search) = true";
				queryString+=whereClause;
				countQuery+=whereClause;
			}
			long scenarioCount = (search == null) ?
				getSingleResult(em, countQuery, "status", ScenarioStatus.LIVE) :
				getSingleResult(em, countQuery, "status", ScenarioStatus.LIVE, "search", search);
			Collection<Scenario> scenarios = (search == null) ?
				findPagedScenarios(em.createQuery(queryString), pageNo,
					"status", ScenarioStatus.LIVE):
				findPagedScenarios(em.createQuery(queryString), pageNo,
					"status", ScenarioStatus.LIVE,
					"search", search);
			result.set(Json.createJsonObject()
				.put("scenarios", readFromPublishedScenarios(scenarios))
				.put("count", scenarioCount)
				.put("page", pageNo)
				.put("pageSize", ScenarioController.SCENARIOS_BY_PAGE)
			);
		});
		return result.get();
	}

	@REST(url="/api/scenario/load/:id", method=Method.GET)
	public Json getScenarioWithComments(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Scenario ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Scenario scenario = findScenario(em, id);
			ifAuthorized(user->{
				result.set(readFromScenario(scenario));
			},
			verifyIfAdminOrOwner(scenario));
		});
		return result.get();
	}

	@REST(url="/api/scenario/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Scenario ID is missing or invalid (%s)");
		inTransaction(em->{
			Scenario scenario = findScenario(em, id);
			ifAuthorized(
				user->{
					try {
						remove(em, scenario);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				verifyIfAdminOrOwner(scenario)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/scenario/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Scenario ID is missing or invalid (%s)");
		checkJson(request, Usage.UPDATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(
				user -> {
					try {
						Scenario scenario = findScenario(em, id);
						writeToScenario(em, request, scenario, Usage.UPDATE);
						storeScenarioImages(params, scenario);
						flush(em);
						result.set(readFromScenario(scenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/scenario/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Scenario ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			Scenario scenario = findScenario(em, id);
			ifAuthorized(
				user -> {
					try {
						writeToScenarioStatus(em, request, scenario);
						flush(em);
						result.set(readFromScenario(scenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(Scenario scenario) {
		return (user, roles) -> {
			if (scenario.getAuthor() != null && scenario.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	void addComment(Json json, Scenario scenario, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			scenario.addComment(new Comment()
                .setDate(PlatformManager.get().today())
                .setText(comment)
                .setAuthor(author));
		}
	}

	void checkJson(Json json, Usage usage) {
		verify(json)
			.process(v->{
				if (usage.creation) {v
					.checkRequired("title")
					.checkRequired("story")
					.checkRequired("setUp")
					.checkRequired("victoryConditions")
					.checkRequired("specialRules");
				}
			})
			.checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkMinSize("story", 2).checkMaxSize("story", 2000)
			.checkMinSize("setUp", 2).checkMaxSize("setUp", 2000)
			.checkMinSize("victoryConditions", 2).checkMaxSize("victoryConditions", 2000)
			.checkMinSize("specialRules", 2).checkMaxSize("specialRules", 2000)
			.check("status", ScenarioStatus.byLabels().keySet())
			.process(v->checkComments(v))
			.ensure();
	}

	Scenario writeToScenario(EntityManager em, Json json, Scenario scenario, Usage usage) {
		try {
			sync(json, scenario)
				.write("version")
				.write("title")
				.write("story")
				.write("setUp")
				.write("victoryConditions")
				.write("specialRules")
				.process(s->{
					if (!usage.propose) {s
						.write("status", label -> ArticleStatus.byLabels().get(label));
						writeComments(s);
					}
				});
			return scenario;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Scenario writeToScenarioStatus(EntityManager em, Json json, Scenario scenario) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", ScenarioStatus.byLabels().keySet())
			.ensure();
		sync(json, scenario)
			.write("status", label->ScenarioStatus.byLabels().get(label));
		return scenario;
	}

	Json readFromScenarioSummary(Scenario scenario) {
		Json json = Json.createJsonObject();
		sync(json, scenario)
			.read("id")
			.read("version")
			.read("title")
			.read("story")
			.read("setUp")
			.read("victoryConditions")
			.read("specialRules")
			.read("illustration")
			.read("status", ScenarioStatus::getLabel)
			.process(s->readAuthor(s));
		return json;
	}

	Json readFromScenario(Scenario scenario) {
		Json json = Json.createJsonObject();
		sync(json, scenario)
			.read("id")
			.read("version")
			.read("title")
			.read("story")
			.read("setUp")
			.read("victoryConditions")
			.read("specialRules")
			.read("illustration")
			.read("status", ScenarioStatus::getLabel)
			.process(s->readAuthor(s))
			.process(s->readComments(s));
		json.put("game", scenario.getGame().getId()); // force load
		return json;
	}

	Json readFromPublishedScenario(Scenario scenario) {
		Json json = Json.createJsonObject();
		sync(json, scenario)
			.read("id")
			.read("version")
			.read("title")
			.read("story")
			.read("setUp")
			.read("victoryConditions")
			.read("specialRules")
			.read("illustration")
			.readLink("game", (pJson, game)->sync(pJson, game)
				.readEach("players", (hJson, hex)->sync(hJson, hex)
					.readLink("identity", (piJson, pid)->sync(piJson, pid)
					.read("id")
					.read("name")
					.read("description")
				)
			)
		);
		return json;
	}

	Scenario findScenario(EntityManager em, long id) {
		Scenario scenario = find(em, Scenario.class, id);
		if (scenario==null) {
			throw new SummerControllerException(404,
				"Unknown Scenario with id %d", id
			);
		}
		return scenario;
	}

	Collection<Scenario> findPagedScenarios(Query query, int page, Object... params) {
		setParams(query, params);
		List<Scenario> scenarios = getPagedResultList(query, page* ScenarioController.SCENARIOS_BY_PAGE, ScenarioController.SCENARIOS_BY_PAGE);
		return scenarios.stream().distinct().collect(Collectors.toList());
	}

	Json readFromScenarioSummaries(Collection<Scenario> scenarios) {
		Json list = Json.createJsonArray();
		scenarios.stream().forEach(scenario->list.push(readFromScenarioSummary(scenario)));
		return list;
	}

	Json readFromPublishedScenarios(Collection<Scenario> scenarios) {
		Json list = Json.createJsonArray();
		scenarios.stream().forEach(scenario->list.push(readFromPublishedScenario(scenario)));
		return list;
	}

	static int SCENARIOS_BY_PAGE = 10;
}
