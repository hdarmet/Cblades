package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.summer.InjectorSunbeam;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.BaseEntity;
import org.summer.data.DataSunbeam;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.*;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des contributions (sur l'élaboration de thèmes, de planches, d'articles
 * et de scénarios)
 */
@Controller
public class ContributionController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@REST(url="/api/contributions/personal", method=Method.GET)
	public Json getContributions(Map<String, Object> params, Json request) {
		long age = getLongParam(params, "age", "The requested Age is invalid (%s)");
		long timestamp = (age==0) ? PlatformManager.get().now() : age;
		String search = (String)params.get("search");
		List<BaseEntity> contributions = new ArrayList<>();
		Json result = Json.createJsonArray();
		inReadTransaction(em->{
			ifAuthorized(
				user->{
					Account author = Account.find(em, user);
					contributions.addAll(getContributedThemes(em, author, timestamp, search));
					contributions.addAll(getContributedBoards(em, author, timestamp, search));
					contributions.addAll(getContributedArticles(em, author, timestamp, search));
					contributions.addAll(getContributedScenarios(em, author, timestamp, search));
				}
			);
			contributions.sort((e1, e2)->(int)(e2.getUpdateTimestamp()-e1.getUpdateTimestamp()));
			for (int index=0;
				 index<contributions.size() && index<ContributionController.ITEMS_BY_PAGE;
				 index++)
			{
				BaseEntity contribution = contributions.get(index);
				if (contribution instanceof Theme) {
					result.push(readFromTheme((Theme)contribution));
				}
				else if (contribution instanceof Board) {
					result.push(readFromBoard((Board)contribution));
				}
				else if (contribution instanceof Article) {
					result.push(readFromArticle((Article)contribution));
				}
				else if (contribution instanceof Scenario) {
					result.push(readFromScenario((Scenario)contribution));
				}
			}
		});
		return result;
	}

	List<Theme> getContributedThemes(EntityManager em, Account author, long age, String search) {
		try {
			String searchClause = search==null ? "" :
				" and fts('pg_catalog.english', " +
					"t.title||' '||" +
					"t.category||' '||" +
					"t.description, :search) = true";
			String queryString =
				"select t from Theme t where t.author=:author and t.updateTimestamp<:age"+
					searchClause+
					" order by t.updateTimestamp desc";
			Query query = em.createQuery(queryString);
			if (search!=null) query.setParameter("search", search);
			setParams(query, "author", author, "age", age);
			List<Theme> themes = getPagedResultList(query, 0, ContributionController.ITEMS_BY_LOAD);
			return themes.stream().distinct().collect(Collectors.toList());
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
		}
	}

	List<Board> getContributedBoards(EntityManager em, Account author, long age, String search) {
		try {
			String searchClause = search==null ? "" :
				" and fts('pg_catalog.english', " +
				"b.name||' '||" +
				"b.description||' '||" +
				"b.status, :search) = true";
			String queryString =
				"select b from Board b where b.author=:author and b.updateTimestamp<:age"+
				searchClause+
				" order by b.updateTimestamp desc";
			Query query = em.createQuery(queryString);
			if (search!=null) query.setParameter("search", search);
			setParams(query, "author", author, "age", age);
			List<Board> boards = getPagedResultList(query, 0, ContributionController.ITEMS_BY_LOAD);
			return boards.stream().distinct().collect(Collectors.toList());
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
		}
	}

	List<Article> getContributedArticles(EntityManager em, Account author, long age, String search) {
		try {
			String searchClause = search==null ? "" :
				" and fts('pg_catalog.english', " +
				"a.title||' '||" +
				"a.document.text ||' '||" +
				"a.status, :search) = true";
			String queryString =
				"select a from Article a " +
					"left outer join fetch a.firstParagraph p " +
					"left outer join fetch a.themes t " +
					"where a.author=:author and a.updateTimestamp<:age"+
					searchClause+
					" order by a.updateTimestamp desc";
			Query query = em.createQuery(queryString);
			if (search!=null) query.setParameter("search", search);
			setParams(query, "author", author, "age", age);
			List<Article> articles = getPagedResultList(query, 0, ContributionController.ITEMS_BY_LOAD);
			return articles.stream().distinct().collect(Collectors.toList());
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
		}
	}

	List<Scenario> getContributedScenarios(EntityManager em, Account author, long age, String search) {
		try {
			String searchClause = search==null ? "" :
				" and fts('pg_catalog.english', " +
					"s.title||' '||" +
					"s.story||' '||" +
					"s.setUp||' '||" +
					"s.victoryConditions||' '||" +
					"s.specialRules||' '||" +
					"s.status, :search) = true";
			String queryString =
				"select s from Scenario s where s.author=:author and s.updateTimestamp<:age"+
					searchClause+
					" order by s.updateTimestamp desc";
			Query query = em.createQuery(queryString);
			if (search!=null) query.setParameter("search", search);
			setParams(query, "author", author, "age", age);
			List<Scenario> scenarios = getPagedResultList(query, 0, ContributionController.ITEMS_BY_LOAD);
			return scenarios.stream().distinct().collect(Collectors.toList());
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
		}
	}

	Json readFromTheme(Theme theme) {
		Json json = Json.createJsonObject();
		json.put("type", "theme");
		sync(json, theme)
			.read("id")
			.read("version")
			.read("category", ThemeCategory::getLabel)
			.read("title")
			.read("description")
			.read("illustration")
			.read("updateTimestamp")
			.read("status", ThemeStatus::getLabel);
		return json;
	}

	Json readFromBoard(Board board) {
		Json json = Json.createJsonObject();
		json.put("type", "board");
		sync(json, board)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("path")
			.read("icon")
			.read("updateTimestamp")
			.read("status", BoardStatus::getLabel);
		return json;
	}

	Json readFromArticle(Article article) {
		Json json = Json.createJsonObject();
		json.put("type", "article");
		sync(json, article)
			.read("id")
			.read("version")
			.read("title")
			.read("updateTimestamp")
			.read("status", ArticleStatus::getLabel)
			.readLink("firstParagraph", (pJson, paragraph)->sync(pJson, paragraph)
				.read("title")
				.read("illustration")
				.read("illustrationPosition", IllustrationPosition::getLabel)
				.read("text")
			);
		return json;
	}

	Json readFromScenario(Scenario scenario) {
		Json json = Json.createJsonObject();
		json.put("type", "scenario");
		sync(json, scenario)
			.read("id")
			.read("version")
			.read("title")
			.read("story")
			.read("setUp")
			.read("victoryConditions")
			.read("specialRules")
			.read("illustration")
			.read("updateTimestamp")
			.read("status", ScenarioStatus::getLabel);
		return json;
	}

	static int ITEMS_BY_LOAD = 15;
	static int ITEMS_BY_PAGE = 10;
}