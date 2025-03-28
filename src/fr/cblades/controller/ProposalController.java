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
import org.summer.data.SummerPersistenceException;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.*;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des propositions de parties
 */
@Controller
public class ProposalController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@REST(url="/api/proposal/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						checkProposal(request);
						long scenarioId = request.getLong("scenario");
						String armyName = request.get("army");
						Scenario scenario = Scenario.find(em, scenarioId);
						PlayerIdentity army = PlayerIdentity.getByName(em, armyName);
						GameMatch gameMatch = new GameMatch()
							.setGame(scenario.getGame().duplicate(em, new HashMap<>()))
							.setScenario(scenario)
							.setAuthor(author)
							.addPlayerMatch(
								new PlayerMatch()
									.setPlayerIdentity(army)
									.setPlayerAccount(author)
							)
							.setStatus(GameMatchStatus.PROPOSED);
						persist(em, gameMatch);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return Json.createJsonObject();
	}

	void checkProposal(Json json) {
		verify(json)
			.checkRequired("scenario").checkInteger("scenario")
			.checkRequired("army")
				.checkPattern("army", "[\\d\\s\\w]+")
				.checkMinSize("army", 2)
				.checkMaxSize("army", 200)
			.ensure();
	}

	@REST(url="/api/proposal/join", method=Method.POST)
	public Json join(Map<String, Object> params, Json request) {
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						checkJoin(request);
						long proposalId = request.getLong("proposal");
						String armyName = request.get("army");
						GameMatch gameMatch = GameMatch.find(em, proposalId);
						PlayerIdentity army = PlayerIdentity.getByName(em, armyName);
						gameMatch.addPlayerMatch(
							new PlayerMatch()
								.setPlayerIdentity(army)
								.setPlayerAccount(author)
						);
						if (gameMatch.getPlayerMatches().size()==gameMatch.getGame().getPlayers().size()) {
							gameMatch.setStatus(GameMatchStatus.IN_PROGRESS);
						}
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return Json.createJsonObject();
	}

	void checkJoin(Json json) {
		verify(json)
			.checkRequired("proposal").checkInteger("scenario")
			.checkRequired("army")
			.checkPattern("army", "[\\d\\s\\w]+")
			.checkMinSize("army", 2)
			.checkMaxSize("army", 200)
			.ensure();
	}

	@REST(url="/api/proposal/mine", method=Method.GET)
	public Json getMine(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(user->{
				Account author = Account.find(em, user);
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(gm) from GameMatch gm" +
					" join gm.playerMatches pm" +
					" where pm.playerAccount = :author";
				String queryString = "select gm from GameMatch gm" +
					" left outer join fetch gm.scenario s" +
					" left outer join fetch s.game g" +
					" left outer join fetch g.map m" +
					" join gm.playerMatches pm" +
					" where pm.playerAccount = :author";
				String queryStringScenario = "select gm from GameMatch gm" +
					" left outer join fetch gm.scenario s" +
					" left outer join fetch s.game g" +
					" left outer join fetch g.map m" +
					" left outer join fetch g.players p" +
					" left outer join fetch p.identity i" +
					" where gm in :matches";
				String queryStringPlayers = "select gm from GameMatch gm" +
					" left outer join fetch gm.playerMatches pm" +
					" left outer join fetch pm.playerAccount w" +
					" left outer join fetch pm.playerIdentity ppi" +
					" left outer join fetch w.access" +
					" where gm in :matches";
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
				long gameMatchCount = (search == null) ?
					getSingleResult(em, countQuery, "author", author) :
					getSingleResult(em, countQuery, "author", author, "search", search);
				Collection<GameMatch> gameMatches = (search == null) ?
					findPagedGameMatches(em.createQuery(queryString), pageNo,
						"author", author):
					findPagedGameMatches(em.createQuery(queryString), pageNo,
						"author", author,
						"search", search);
				if (gameMatches.size()>0) {
					gameMatches = findGameMatches(em.createQuery(queryStringScenario),
							"matches", gameMatches);
					gameMatches = findGameMatches(em.createQuery(queryStringPlayers),
							"matches", gameMatches);
				}
				result.set(Json.createJsonObject()
					.put("matches", readFromPublishedGameMatches(gameMatches))
					.put("count", gameMatchCount)
					.put("page", pageNo)
					.put("pageSize", ProposalController.PROPOSALS_BY_PAGE)
				);
			});
		});
		return result.get();
	}

	@REST(url="/api/proposal/proposed", method=Method.GET)
	public Json getProposed(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			ifAuthorized(user->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(gm) from GameMatch gm" +
					" join gm.playerMatches pm" +
					" where gm.status = :status";
				String queryString = "select gm from GameMatch gm" +
					" left outer join fetch gm.scenario s" +
					" left outer join fetch s.game g" +
					" left outer join fetch g.map m" +
					" join gm.playerMatches pm" +
					" where gm.status = :status";
				String queryStringScenario = "select gm from GameMatch gm" +
					" left outer join fetch gm.scenario s" +
					" left outer join fetch s.game g" +
					" left outer join fetch g.map m" +
					" left outer join fetch g.players p" +
					" left outer join fetch p.identity i" +
					" where gm in :matches";
				String queryStringPlayers = "select gm from GameMatch gm" +
					" left outer join fetch gm.playerMatches pm" +
					" left outer join fetch pm.playerAccount w" +
					" left outer join fetch pm.playerIdentity ppi" +
					" left outer join fetch w.access" +
					" where gm in :matches";
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
				long gameMatchCount = (search == null) ?
					getSingleResult(em, countQuery, "status", GameMatchStatus.PROPOSED) :
					getSingleResult(em, countQuery, "status", GameMatchStatus.PROPOSED, "search", search);
				Collection<GameMatch> gameMatches = (search == null) ?
					findPagedGameMatches(em.createQuery(queryString), pageNo,
						"status", GameMatchStatus.PROPOSED):
					findPagedGameMatches(em.createQuery(queryString), pageNo,
						"status", GameMatchStatus.PROPOSED,
						"search", search);
				if (gameMatches.size()>0) {
					gameMatches = findGameMatches(em.createQuery(queryStringScenario),
						"matches", gameMatches);
					gameMatches = findGameMatches(em.createQuery(queryStringPlayers),
						"matches", gameMatches);
				}
				result.set(Json.createJsonObject()
					.put("matches", readFromPublishedGameMatches(gameMatches))
					.put("count", gameMatchCount)
					.put("page", pageNo)
					.put("pageSize", ProposalController.PROPOSALS_BY_PAGE)
				);
			});
		});
		return result.get();
	}

	Collection<GameMatch> findPagedGameMatches(Query query, int page, Object... params) {
		setParams(query, params);
		List<GameMatch> gameMatches = getPagedResultList(
			query,
			page* ProposalController.PROPOSALS_BY_PAGE,
			ProposalController.PROPOSALS_BY_PAGE);
		return gameMatches.stream().distinct().collect(Collectors.toList());
	}

	Collection<GameMatch> findGameMatches(Query query, Object... params) {
		setParams(query, params);
		List<GameMatch> gameMatches = getResultList(query);
		return gameMatches.stream().distinct().collect(Collectors.toList());
	}

	Json readFromPublishedGameMatches(Collection<GameMatch> gameMatches) {
		Json list = Json.createJsonArray();
		gameMatches.stream().forEach(gameMatch->list.push(readFromPublishedGameMatch(gameMatch)));
		return list;
	}

	Json readFromPublishedGameMatch(GameMatch gameMatch) {
		Json json = Json.createJsonObject();
		sync(json, gameMatch)
			.read("id")
			.read("status", GameMatchStatus::getLabel)
			.readLink("game", (pJson, game)->sync(pJson, game)
				.read("id")
				.readEach("players", (hJson, hex)->sync(hJson, hex)
					.readLink("identity", (piJson, pid)->sync(piJson, pid)
						.read("id")
						.read("name")
						.read("description")
					)
				)
			)
			.readEach("playerMatches", (hJson, pm)->sync(hJson, pm)
				.readLink("playerIdentity", (piJson, pid)->sync(piJson, pid)
					.read("id")
					.read("name")
				)
				.readLink("playerAccount", (uJson, pid)->sync(uJson, pid)
					.read("id")
					.read("login", "access.login")
					.read("firstName")
					.read("lastName")
					.read("avatar")
				)
			);
		sync(json, gameMatch.getScenario())
			.read("version")
			.read("title")
			.read("story")
			.read("setUp")
			.read("victoryConditions")
			.read("specialRules")
			.read("illustration");
		return json;
	}

	static int PROPOSALS_BY_PAGE = 10;
}
