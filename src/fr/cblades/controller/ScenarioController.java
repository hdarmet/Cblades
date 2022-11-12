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
public class ScenarioController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@MIME(url="/api/scenario/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("imagename");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String imageName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
				.setName(imageName)
				.setStream(PlatformManager.get().getInputStream("/scenarios/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeScenarioImages(Map<String, Object> params, Scenario scenario) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files.length > 0) {
			if (files.length!= 1) throw new SummerControllerException(400, "One Scenario file must be loaded.");
			String fileName = "scenario" + scenario.getId() + "." + files[0].getExtension();
			String webName = "scenario" + scenario.getId() + "-" + System.currentTimeMillis() + "." + files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/scenarios/" + fileName));
			scenario.setIllustration("/api/scenario/images/" + webName);
		}
	}

	@REST(url="/api/scenario/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Scenario newScenario = writeToProposedScenario(request, new Scenario());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						addComment(request, newScenario, author);
						newScenario.setStatus(ScenarioStatus.PROPOSED);
						newScenario.setAuthor(author);
						newScenario.setGame(new Game()
							.setMap(new fr.cblades.domain.Map()
									/*
								.addBoardPlacement(new BoardPlacement()
									.setCol(0).setRow(0).setBoard(board)
								)
									 */
							)
						);
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
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Scenario scenario = findScenario(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToProposedScenario(request, scenario);
						addComment(request, scenario, author);
						storeScenarioImages(params, scenario);
						flush(em);
						result.set(readFromScenario(scenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Scenario newScenario = writeToScenario(em, request, new Scenario());
			ifAuthorized(
				user->{
					try {
						newScenario.setGame(new Game()
							.setMap(new fr.cblades.domain.Map()
									/*
								.addBoardPlacement(new BoardPlacement()
									.setCol(0).setRow(0).setBoard(board)
								)
								*/
							)
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
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(s) from Scenario s";
				String queryString = "select s from Scenario s";
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
		ifAuthorized(user->{
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(s) from Scenario s where s.status = :status";
				String queryString = "select s from Scenario s where s.status = :status";
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
					.put("scenarios", readFromScenarioSummaries(scenarios))
					.put("count", scenarioCount)
					.put("page", pageNo)
					.put("pageSize", ScenarioController.SCENARIOS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/scenario/load/:id", method=Method.GET)
	public Json getScenarioWithComments(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Scenario scenario = findScenario(em, new Long(id));
			ifAuthorized(user->{
				Json jScenario = readFromScenario(scenario);
				jScenario.put("game", scenario.getGame().getId()); // force load
				result.set(jScenario);
			},
			verifyIfAdminOrOwner(scenario));
		});
		return result.get();
	}

	@REST(url="/api/scenario/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			Scenario scenario = findScenario(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, scenario);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				verifyIfAdminOrOwner(scenario)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/scenario/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Scenario scenario = findScenario(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToScenario(em, request, scenario);
						storeScenarioImages(params, scenario);
						flush(em);
						result.set(readFromScenario(scenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/scenario/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Scenario scenario = findScenario(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToScenarioStatus(em, request, scenario);
						flush(em);
						result.set(readFromScenario(scenario));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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

	Scenario writeToProposedScenario(Json json, Scenario scenario) {
		verify(json)
			.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.checkRequired("story").checkMinSize("story", 2).checkMaxSize("story", 2000)
			.checkRequired("setUp").checkMinSize("setUp", 2).checkMaxSize("setUp", 2000)
			.checkRequired("victoryConditions").checkMinSize("victoryConditions", 2).checkMaxSize("victoryConditions", 2000)
			.checkRequired("specialRules").checkMinSize("specialRules", 2).checkMaxSize("specialRules", 2000)
			.checkRequired("illustration").checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
			.checkMinSize("newComment", 2).checkMaxSize("newComment", 200)
			.ensure();
		sync(json, scenario)
			.write("version")
			.write("title")
			.write("story")
			.write("setUp")
			.write("victoryConditions")
			.write("specialRules")
			.write("illustration");
		return scenario;
	}

	void addComment(Json json, Scenario scenario, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			scenario.addComment(new Comment().setDate(new Date()).setText(comment).setAuthor(author));
		}
	}

	Scenario writeToScenario(EntityManager em, Json json, Scenario scenario) {
		try {
			verify(json)
				.checkRequired("title").checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.checkRequired("story").checkMinSize("story", 2).checkMaxSize("story", 2000)
				.checkRequired("setUp").checkMinSize("setUp", 2).checkMaxSize("setUp", 2000)
				.checkRequired("victoryConditions").checkMinSize("victoryConditions", 2).checkMaxSize("victoryConditions", 2000)
				.checkRequired("specialRules").checkMinSize("specialRules", 2).checkMaxSize("specialRules", 2000)
				.checkRequired("illustration").checkMinSize("illustration", 2).checkMaxSize("illustration", 200)
				.check("status", ScenarioStatus.byLabels().keySet())
				.each("comments", cJson->verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, scenario)
				.write("version")
				.write("title")
				.write("story")
				.write("setUp")
				.write("victoryConditions")
				.write("specialRules")
				.write("illustration")
				.write("status", label->ScenarioStatus.byLabels().get(label))
				.writeRef("author.id", "author", (Integer id)-> Account.find(em, id))
				.syncEach("comments", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			scenario.getGame().setName(scenario.getTitle());
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
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
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

	static int SCENARIOS_BY_PAGE = 10;
}
