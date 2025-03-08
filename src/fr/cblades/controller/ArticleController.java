package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import fr.cblades.services.LikeVoteService;
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
import org.summer.data.SummerPersistenceException;
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.*;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des articles (et tous les objets dont ils sont composés: paragraphes et
 * votes)
 */
@Controller
public class ArticleController
	implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam,
		StandardUsers, CommonEntities {

	/**
	 * Endpoint (accessible via "/api/article/images/:imagename") permettant de télécharger depuis le navigateur
	 * une image associée à un article (à un des paragraphes de l'article pour être précis).
	 * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image).
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/article/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/articles/");
	}

	/**
	 * Stocke sur le système de fichiers/blob Cloud, les images associées aux paragraphes d'un article (chaque paragraphe
	 * doit avoir une et une seule image) et les associe à leur paragraphes respectifs (en précisant l'URL de
	 * l'image dans le champ "illustration" du paragraphe). Le contenu des ces images a été, au préalable, extrait du
	 * message HTTP (par Summer) et passé dans le paramètre params sous l'étiquette MULTIPART_FILES (un tableau).
	 * L'ordre dans ce tableau doit respecter l'ordre des paragraphes.<br>
	 * Les images seront stockées dans le sous répertoire/blob nommé "/articles" sous des noms qui sont la concaténation
	 * de "paragraph", du numéro de paragraphe et l'ID de l'article.
	 * @param params paramètres d'appel HTTP (les images à stocker sont accessibles via l'étiquette MULTIPART_FILES)
	 * @param article article détenteur des paragraphes auxquels il faut associer les images.
	 */
	void storeArticleImages(Map<String, Object> params, Article article) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files != null) {
			Map<Integer, FileSpecification> fileMap = new HashMap<>();
			for (FileSpecification file : files) {
				int ordinal = Integer.parseInt(file.getName().substring(file.getName().indexOf("-") + 1));
				if (fileMap.get(ordinal) != null) {
					throw new SummerControllerException(400, "Only one illustration file may be loaded for a paragraph.");
				}
				fileMap.put(ordinal, file);
			}
			for (Map.Entry<Integer, FileSpecification> fileEntry : fileMap.entrySet()) {
				int ordinal = fileEntry.getKey();
				FileSpecification file = fileEntry.getValue();
				Paragraph paragraph = article.getParagraph(ordinal);
				if (paragraph == null) throw new SummerControllerException(404, "No paragraph for image : " + ordinal);
				article.getParagraph(ordinal).setIllustration(saveFile(file,
					"paragraph" + article.getId() + "_" + ordinal,
					"/articles/", "/api/article/images/"
				));
			}
		}
	}

	@REST(url="/api/article/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		checkJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Article newArticle = writeToArticle(em, request, new Article(), Usage.PROPOSE);
						Account author = Account.find(em, user);
						addComment(request, newArticle, author);
						newArticle.setStatus(ArticleStatus.PROPOSED);
						newArticle.setAuthor(author);
						newArticle.setPoll(new LikePoll().setLikes(0).setDislikes(0));
						persist(em, newArticle);
						storeArticleImages(params, newArticle);
						flush(em);
						result.set(readFromArticle(newArticle));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Article with title (%s) already exists",
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

	@REST(url="/api/article/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Article ID is missing or invalid (%s)");
		checkJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			try {
				Article article = findArticle(em, id);
				ifAuthorized(
					user -> {
						Account author = Account.find(em, user);
						writeToArticle(em, request, article, Usage.AMEND);
						addComment(request, article, author);
						storeArticleImages(params, article);
						flush(em);
						result.set(readFromArticle(article));
					},
					verifyIfAdminOrOwner(article)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			} catch (SummerNotFoundException snfe) {
				throw new SummerControllerException(404, snfe.getMessage());
			}
		});
		return result.get();
	}

	@REST(url="/api/article/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		checkJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Article newArticle = writeToArticle(em, request, new Article(), Usage.CREATE);
						newArticle.setPoll(new LikePoll().setLikes(0).setDislikes(0));
						persist(em, newArticle);
						storeArticleImages(params, newArticle);
						flush(em);
						result.set(readFromArticle(newArticle));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Article with title (%s) already exists",
							request.get("title"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/article/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Article ID is missing or invalid (%s)");
		checkJson(request, Usage.UPDATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(
				user -> {
					try {
						Article article = findArticle(em, id);
						writeToArticle(em, request, article, Usage.UPDATE);
						storeArticleImages(params, article);
						flush(em);
						result.set(readFromArticle(article));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/article/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(a) from Article a";
				String queryString = "select a from Article a " +
					"left outer join fetch a.themes t " +
					"left join fetch a.poll " +
					"left outer join fetch a.firstParagraph p";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" where fts('pg_catalog.english', " +
						"a.title||' '||" +
						"a.document.text ||' '||" +
						"a.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long articleCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Article> articles = (search == null) ?
					findPagedArticles(em.createQuery(queryString), pageNo):
					findPagedArticles(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("articles", readFromArticleSummaries(articles))
					.put("count", articleCount)
					.put("page", pageNo)
					.put("pageSize", ArticleController.ARTICLES_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/article/recent", method=Method.GET)
	public Json getLiveNew(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			String search = (String)params.get("search");
			String queryString = "select a from Article a " +
				"join fetch a.paragraphs " +
				"join fetch a.author " +
				"join fetch a.poll " +
				"where a.status=:status and a.recent=:recent";
			if (search!=null) {
				String whereClause =" and fts('pg_catalog.english', " +
					"a.title||' '||" +
					"a.document.text, :search) = true";
				queryString+=whereClause;
			}
			Collection<Article> articles = findPagedArticles(
				search!=null ?
					em.createQuery(queryString).setParameter("search", search):
					em.createQuery(queryString),
				pageNo,
				"status", ArticleStatus.LIVE,
				"recent", true);
			result.set(readFromPublishedArticles(articles));
		});
		return result.get();
	}

	@REST(url="/api/article/by-theme/:theme", method=Method.GET)
	public Json getLiveByTheme(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
			long themeId = getIntegerParam(params, "theme", "The requested Theme Id is invalid (%s)");
			String search = (String)params.get("search");
			String queryString = "select a from Article a " +
					"join fetch a.paragraphs " +
					"join fetch a.author " +
					"join fetch a.poll " +
					"where a.status=:status and :theme member of a.themes";
			if (search!=null) {
				String whereClause =" and fts('pg_catalog.english', " +
					"a.title||' '||" +
					"a.document.text, :search) = true";
				queryString+=whereClause;
			}
			Collection<Article> articles = findPagedArticles(
				search!=null ?
					em.createQuery(queryString).setParameter("search", search):
					em.createQuery(queryString),
				pageNo,
				"status", ArticleStatus.LIVE,
				"theme", Theme.find(em, themeId));
			result.set(readFromPublishedArticles(articles));
		});
		return result.get();
	}

	@REST(url="/api/article/by-title/:title", method=Method.GET)
	public Json getByTitle(Map<String, Object> params, Json request) {
		String title = getStringParam(params, "title", null, "The Title of the Article is missing (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Article article = getSingleResult(em,
				"select a from Article a " +
					"join fetch a.firstParagraph " +
					"join fetch a.themes " +
					"join fetch a.author w " +
					"join fetch w.access " +
					"where a.title=:title",
				"title", title);
			if (article==null) {
				throw new SummerControllerException(404,
					"Unknown Article with title %s", title
				);
			}
			ifAuthorized(user->{
				result.set(readFromArticle(article));
			},
			verifyIfAdminOrOwner(article));
		});
		return result.get();
	}

	@REST(url="/api/article/load/:id", method=Method.GET)
	public Json getArticleWithComments(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Article ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Article article = findArticle(em, id);
			ifAuthorized(user->{
				result.set(readFromArticle(article));
			},
			verifyIfAdminOrOwner(article));
		});
		return result.get();
	}

	@REST(url="/api/article/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Article ID is missing or invalid (%s)");
		inTransactionUntilSuccessful(em->{
			try {
				Article article = findArticle(em, id);
				ifAuthorized(
					user->{
						remove(em, article);
					},
					verifyIfAdminOrOwner(article)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/article/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Article ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inTransactionUntilSuccessful(em-> {
			ifAuthorized(
				user -> {
					try {
						Article article = findArticle(em, id);
						writeToArticleStatus(em, request, article);
						flush(em);
						result.set(readFromArticle(article));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(Article article) {
		return (user, roles) -> {
			if (article.getAuthor() != null && article.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	void checkJson(Json json, Usage usage) {
		verify(json)
			.process(v->{
				if (usage.creation) {v
					.checkRequired("title");
				}
			})
			.checkMinSize("title", 2).checkMaxSize("title", 200)
			.checkPattern("title", "[\\d\\s\\w]+")
			.each("themes", tJson -> verify(tJson)
				.checkRequired("id")
				.checkInteger("id", "Not a valid id")
			)
			.each("paragraphs", cJson -> verify(cJson)
				.checkRequired("version")
				.checkRequired("ordinal")
				.checkRequired("title")
				.checkMinSize("title", 2).checkMaxSize("title", 200)
				.checkPattern("title", "[\\d\\s\\w]+")
				.check("illustrationPosition", IllustrationPosition.byLabels().keySet())
				.checkRequired("text")
				.checkMinSize("text", 2)
				.checkMaxSize("text", 19995)
			)
			.process(v->{
				if (usage.propose) {v
					.checkMinSize("newComment", 2).checkMaxSize("newComment", 200);
				}
				else {v
					.check("status", ArticleStatus.byLabels().keySet());
					checkComments(v);
				}
			})
			.ensure();
	}

	void addComment(Json json, Article article, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			article.addComment(new Comment()
				.setDate(PlatformManager.get().today())
				.setText(comment)
				.setAuthor(author));
		}
	}

	Article writeToArticleStatus(EntityManager em, Json json, Article article) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", ArticleStatus.byLabels().keySet())
			.ensure();
		sync(json, article)
			.write("status", label->ArticleStatus.byLabels().get(label));
		return article;
	}

	Article writeToArticle(EntityManager em, Json json, Article article, Usage usage) {
		try {
			sync(json, article)
				.write("version")
				.write("title")
				.syncEach("themes", (Json jsonTheme)-> Theme.find(em, jsonTheme.getLong("id")))
				.syncEach("paragraphs", (cJson, comment)->sync(cJson, comment)
					.write("version")
					.write("ordinal")
					.write("title")
					.write("illustrationPosition", label->IllustrationPosition.byLabels().get(label))
					.write("text")
				)
				.process(s->{
					if (!usage.propose) {s
						.write("status", label -> ArticleStatus.byLabels().get(label));
						writeComments(s);
					}
				});
			article.setFirstParagraph(article.getParagraph(0));
			article.buildDocument();
			return article;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Json readFromArticleSummary(Article article) {
		Json json = Json.createJsonObject();
		sync(json, article)
			.read("id")
			.read("version")
			.readEach("themes", (tJson, account)->sync(tJson, account)
				.read("id")
				.read("title")
			)
			.read("title")
			.read("status", ArticleStatus::getLabel)
			.readLink("firstParagraph", (pJson, paragraph)->sync(pJson, paragraph)
				.read("title")
				.read("illustration")
				.read("illustrationPosition", IllustrationPosition::getLabel)
				.read("text")
			)
			.process(s->readAuthor(s));
		return json;
	}

	Json readFromArticle(Article article) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, article)
			.read("id")
			.read("version")
			.readEach("themes", (tJson, account)->sync(tJson, account)
				.read("id")
				.read("title")
			)
			.read("title")
			.read("status", ArticleStatus::getLabel)
			.readEach("paragraphs", (pJson, paragraph)->sync(pJson, paragraph)
				.read("id")
				.read("version")
				.read("title")
				.read("illustration")
				.read("illustrationPosition", IllustrationPosition::getLabel)
				.read("text")
			)
			.process(s->readAuthor(s))
			.process(s->readComments(s));
		return json;
	}

	Json readFromPublishedArticle(Article article) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, article)
			.read("id")
			.read("title")
			.readEach("paragraphs", (pJson, paragraph)->sync(pJson, paragraph)
				.read("id")
				.read("title")
				.read("illustration")
				.read("illustrationPosition", IllustrationPosition::getLabel)
				.read("text")
			)
			.process(s->readAuthor(s))
			.readLink("poll", (pJson, poll)->sync(pJson, poll)
			.read("id")
			.read("likes")
			.read("dislikes")
		);
		return json;
	}

	Article findArticle(EntityManager em, long id) {
		Article article = find(em, Article.class, id);
		if (article==null) {
			throw new SummerControllerException(404,
				"Unknown Article with id %d", id
			);
		}
		return article;
	}

	Collection<Article> findPagedArticles(Query query, int page, Object... params) {
		setParams(query, params);
		List<Article> articles = getPagedResultList(query, page* ArticleController.ARTICLES_BY_PAGE, ArticleController.ARTICLES_BY_PAGE);
		return articles.stream().distinct().collect(Collectors.toList());
	}

	Json readFromArticleSummaries(Collection<Article> articles) {
		Json list = Json.createJsonArray();
		articles.stream().forEach(article->list.push(readFromArticleSummary(article)));
		return list;
	}

	Json readFromPublishedArticles(Collection<Article> articles) {
		Json list = Json.createJsonArray();
		articles.stream().forEach(article->list.push(readFromPublishedArticle(article)));
		return list;
	}

	static int ARTICLES_BY_PAGE = 10;

	@REST(url = "/api/article/vote/:poll", method = Method.GET)
	public Json getVote(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		long pollId = getIntegerParam(params, "poll", "A valid Poll Id must be provided.");
		use(LikeVoteService.class, likeVoteService -> {
			ifAuthorized(
				user -> {
					try {
						LikeVoteService.Votation votation = likeVoteService.getPoll(pollId, user);
						Json response = readFromPoll(votation);
						result.set(response);
					} catch (SummerPersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected exception: %s.", pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	@REST(url = "/api/article/vote/:poll", method = Method.POST)
	public Json vote(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		long pollId = getIntegerParam(params, "poll", "A valid Poll Id must be provided.");
		String option = request.get("option");
		if (!"like".equals(option) && !"dislike".equals(option)) {
			throw new SummerControllerException(400, "Vote option must be one of these: 'like' or 'dislike'.");
		}
		use(LikeVoteService.class, likeVoteService -> {
			ifAuthorized(
				user -> {
					try {
						LikeVoteService.Votation votation = likeVoteService.vote(pollId,
							option.equals("like")?LikeVoteOption.LIKE:LikeVoteOption.DISLIKE,
							user);
						Json response = readFromPoll(votation);
						result.set(response);
					} catch (SummerPersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected exception: %s.", pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	Json readFromPoll(LikeVoteService.Votation votation) {
		Json json = Json.createJsonObject();
		sync(json, votation.getPoll())
				.read("likes")
				.read("dislikes");
		if (votation.getVote()==null) {
			json.put("option", "none");
		}
		else {
			json.put("option", votation.getVote().getOption()==LikeVoteOption.LIKE ? "like" : "dislike");
		}
		return json;
	}

}