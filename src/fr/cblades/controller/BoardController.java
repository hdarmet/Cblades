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
import org.summer.data.SummerNotFoundException;
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des planches
 */
@Controller
public class BoardController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam,
		StandardUsers, CommonEntities {

	/**
	 * Endpoint (accessible via "/api/board/images/:imagename") permettant de télécharger depuis le navigateur
	 * une image associée à une planche.
	 * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/board/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getFile(params, "imagename", "/boards/");
	}

	/**
	 * Stocke sur le système de fichiers/blob Cloud, les deux images associées à une planche (la planche elle-même et une
	 * représentation réduite, appelée icone) et les associe à la planche (en précisant l'URL des images dans les champs
	 * "path" et "icon" de la planche). Le contenu des deux images ont été, au préalable, extraits du message HTTP (par
	 * Summer) et passé dans le paramètre params sous l'étiquette MULTIPART_FILES (un tableau qui doit contenir deux
	 * éléments (et deux seulement): le premier est l'image de la planche, le second celui de l'icone).<br>
	 * Les images seront stockées dans le sous répertoire/blob nommé "/boards" sous les noms qui sont, respectivement la
	 * concaténation de "board" et "boardicon" et de l'ID de la planche.
	 * @param params paramètres d'appel HTTP (les images à stocker sont accessibles via l'étiquette
	 *               MULTIPART_FILES)
	 * @param board planche à laquelle il faut associer les images.
	 */
	void storeBoardImages(Map<String, Object> params, Board board) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files!= null) {
			if (files.length != 2) throw new SummerControllerException(400, "Two board files must be loaded.");
			board.setPath(saveFile(files[0],
				"board" + board.getId(),
				"/boards/", "/api/board/images/"
			));
			board.setIcon(saveFile(files[1],
				"boardicon" + board.getId(),
				"/boards/", "/api/board/images/"
			));
		}
	}

	@REST(url="/api/board/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		checkJson(request, Usage.PROPOSE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Board newBoard = writeToBoard(em, request, new Board(), Usage.PROPOSE);
						Account author = Account.find(em, user);
						addComment(request, newBoard, author);
						newBoard.setStatus(BoardStatus.PROPOSED);
						newBoard.setAuthor(author);
						persist(em, newBoard);
						storeBoardImages(params, newBoard);
						flush(em);
						result.set(readFromBoard(newBoard));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Board with name (%s) already exists",
							request.get("name"), null
						);
					}
				}
			);
		});
		return result.get();
	}

	@REST(url="/api/board/amend/:id", method=Method.POST)
	public Json amend(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		checkJson(request, Usage.AMEND);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			try {
				Board board = findBoard(em, id);
				ifAuthorized(
					user -> {
						Account author = Account.find(em, user);
						writeToBoard(em, request, board, Usage.AMEND);
						addComment(request, board, author);
						storeBoardImages(params, board);
						flush(em);
						result.set(readFromBoard(board));
					},
					verifyIfAdminOrOwner(board)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			} catch (SummerNotFoundException snfe) {
				throw new SummerControllerException(404, snfe.getMessage());
			}
		});
		return result.get();
	}

	@REST(url="/api/board/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		checkJson(request, Usage.CREATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Board newBoard = writeToBoard(em, request, new Board(), Usage.CREATE);
						persist(em, newBoard);
						storeBoardImages(params, newBoard);
						flush(em);
						result.set(readFromBoard(newBoard));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409,
							"Board with name (%s) already exists",
							request.get("name"), null
						);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}


	@REST(url="/api/board/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		checkJson(request, Usage.UPDATE);
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			ifAuthorized(user -> {
				try {
					Board board = findBoard(em, id);
					writeToBoard(em, request, board, Usage.UPDATE);
					storeBoardImages(params, board);
					flush(em);
					result.set(readFromBoard(board));
				} catch (PersistenceException pe) {
					throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
				}
			},
			ADMIN);
		});
		return result.get();
	}

	@REST(url="/api/board/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(b) from Board b";
				String queryString = "select b from Board b";
				if (search!=null) {
					String whereClause =" where fts('pg_catalog.english', " +
						"b.name||' '||" +
						"b.description||' '||" +
						"b.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long boardCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
							.setParameter("search", search));
				Collection<Board> boards = (search == null) ?
					findPagedBoards(em.createQuery(queryString), pageNo):
					findPagedBoards(em.createQuery(queryString), pageNo,
							"search", search);
				result.set(Json.createJsonObject()
					.put("boards", readFromBoardSummaries(boards))
					.put("count", boardCount)
					.put("page", pageNo)
					.put("pageSize", BoardController.BOARDS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/board/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Collection<Board> boards = findBoards(em.createQuery("select b from Board b where b.status=:status"),
				"status", BoardStatus.LIVE);
			result.set(readFromBoardSummaries(boards));
		});
		return result.get();
	}

	@REST(url="/api/board/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			String name = (String)params.get("name");
			Board board = getSingleResult(em,
				"select b from Board b left outer join fetch b.hexes left outer join fetch b.author a left outer join fetch a.access where b.name = :name",
				"name", name);
			if (board==null) {
				throw new SummerControllerException(404,
					"Unknown Board with name %s", name
				);
			}
			ifAuthorized(user->{
				result.set(readFromBoard(board));
			},
			verifyIfAdminOrOwner(board));
		});
		return result.get();
	}

	@REST(url="/api/board/contributions", method=Method.GET)
	public Json getContributions(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
		inReadTransaction(em->{
			ifAuthorized(
				user->{
					try {
						String queryString = "select b from Board b where b.author=:author order by b.updateTimestamp, b.status";
						Collection<Board> boards = findPagedBoards(
							em.createQuery(queryString),
							pageNo,
							"author", Account.find(em, user));
						result.set(readFromBoardSummaries(boards));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				}
			);
		});
		return result.get();
	}

	@REST(url="/api/board/find/:id", method=Method.GET)
	public Json getById(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Board board = findBoard(em, id);
			ifAuthorized(user->{
				result.set(readFromBoardAndHexes(board));
			},
			verifyIfAdminOrOwner(board));
		});
		return result.get();
	}

	@REST(url="/api/board/load/:id", method=Method.GET)
	public Json getBoardWithComments(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Board board = findBoard(em, id);
			ifAuthorized(user->{
				result.set(readFromBoard(board));
			},
			verifyIfAdminOrOwner(board));
		});
		return result.get();
	}

	@REST(url="/api/board/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		inTransaction(em->{
			try {
				Board board = findBoard(em, id);
				ifAuthorized(user->{
						remove(em, board);
					},
					verifyIfAdminOrOwner(board)
				);
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		});
		return Json.createJsonObject().put("deleted", "ok");
	}


	@REST(url="/api/board/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user -> {
			try {
				inTransaction(em-> {
					Board board = findBoard(em, id);
					writeToBoardStatus(request, board);
					flush(em);
					result.set(readFromBoard(board));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/board/update-hexes/:id", method=Method.POST)
	public Json updateHexes(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Board ID is missing or invalid (%s)");
		checkJsonForBoardHexes(request);
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Board board = findBoard(em, id);
			ifAuthorized(user->{
					try {
						writeToBoardHexes(request, board);
						flush(em);
						result.set(readFromBoardAndHexes(board));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				verifyIfAdminOrOwner(board)
			);
		});
		return result.get();
	}

	BiPredicate<String, String[]> verifyIfAdminOrOwner(Board board) {
		return (user, roles) -> {
			if (board.getAuthor() != null && board.getAuthor().getLogin().equals(user)) {
				return true;
			}
			for (String role: roles) {
				if (role.equals(ADMIN)) return true;
			}
			return false;
		};
	}

	void addComment(Json json, Board board, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			board.addComment(new Comment().setDate(PlatformManager.get().today()).setText(comment).setAuthor(author));
		}
	}

	void checkJson(Json json, Usage usage) {
		verify(json)
			.process(v->{
				if (usage.creation) {v
					.checkRequired("name");
				}
			})
			.checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkMinSize("description", 2).checkMaxSize("description", 1000)
			.checkPattern("name", "[\\d\\s\\w]+")
			.process(v->{
				if (usage.propose)
					checkNewComment(v);
				else {v
					.check("status", BoardStatus.byLabels().keySet());
					checkComments(v);
				}
			})
			.ensure();
	}

	Board writeToBoard(EntityManager em, Json json, Board board, Usage usage) {
		sync(json, board)
			.write("version")
			.write("name")
			.write("description")
			.process(this::writeComments)
			.process(s-> {
				if (!usage.propose) {s
					.write("status", label -> BoardStatus.byLabels().get(label));
					writeComments(s);
				}
			});
		return board;
	}

	Board writeToBoardStatus(Json json, Board board) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", BoardStatus.byLabels().keySet())
			.ensure();
		sync(json, board)
			.write("status", label->BoardStatus.byLabels().get(label));
		return board;
	}

	void checkJsonForBoardHexes(Json json) {
		verify(json)
			.each("hexes", cJson -> verify(cJson)
				.checkIdAndVersion()
				.checkRequired("col").ifThen(
					iJson -> verify(iJson).checkInteger("col"),
					tJson -> verify(tJson).checkMin("col", 0).checkMax("col", 13)
				)
				.checkRequired("row").ifThen(
					iJson -> verify(iJson).checkInteger("row"),
					tJson -> verify(tJson).checkMin("row", 0).checkMax("row", 16)
				)
				.checkRequired("height").ifThen(
					iJson -> verify(iJson).checkInteger("height"),
					tJson -> verify(tJson).checkMin("height", -5).checkMax("height", 5)
				)
				.checkRequired("row").checkInteger("row")//.checkMin("row", 0).checkMax("row", 16)
				.checkRequired("type").check("type", HexType.byLabels().keySet())
				.checkRequired("side120Type").check("side120Type", HexSideType.byLabels().keySet())
				.checkRequired("side180Type").check("side180Type", HexSideType.byLabels().keySet())
				.checkRequired("side240Type").check("side240Type", HexSideType.byLabels().keySet())
			)
			.ensure();
	}

	Board writeToBoardHexes(Json json, Board board) {
		sync(json, board)
			.syncEach("hexes", (hJson, hex)->sync(hJson, hex)
				.write("version")
				.write("col")
				.write("row")
				.write("height")
				.write("type", label->HexType.byLabels().get(label))
				.write("side120Type", label->HexSideType.byLabels().get(label))
				.write("side180Type", label->HexSideType.byLabels().get(label))
				.write("side240Type", label->HexSideType.byLabels().get(label))
			);
		return board;
	}

	Json readFromBoardAndHexes(Board board) {
		Json json = Json.createJsonObject();
		sync(json, board)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("path")
			.read("icon")
			.read("status", BoardStatus::getLabel)
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			)
			.readEach("hexes", (hJson, hex)->sync(hJson, hex)
				.read("id")
				.read("version")
				.read("col")
				.read("row")
				.read("height")
				.read("type", HexType::getLabel)
				.read("side120Type", HexSideType::getLabel)
				.read("side180Type", HexSideType::getLabel)
				.read("side240Type", HexSideType::getLabel)
			);
		return json;
	}

	Json readFromBoardSummary(Board board) {
		Json json = Json.createJsonObject();
		sync(json, board)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("path")
			.read("icon")
			.read("status", BoardStatus::getLabel)
			.process(this::readAuthor);
		return json;
	}

	Json readFromBoard(Board board) {
		Json json = Json.createJsonObject();
		sync(json, board)
			.read("id")
			.read("version")
			.read("name")
			.read("description")
			.read("path")
			.read("icon")
			.read("status", BoardStatus::getLabel)
			.process(this::readAuthor)
			.process(this::readComments);
		return json;
	}

	Board findBoard(EntityManager em, long id) {
		Board board = find(em, Board.class, id);
		if (board==null) {
			throw new SummerControllerException(404,
				"Unknown Board with id %d", id
			);
		}
		return board;
	}

	Collection<Board> findBoards(Query query, Object... params) {
		setParams(query, params);
		List<Board> boards = getResultList(query);
		return boards.stream().distinct().collect(Collectors.toList());
	}

	Collection<Board> findPagedBoards(Query query, int page, Object... params) {
		setParams(query, params);
		List<Board> boards = getPagedResultList(query, page*BoardController.BOARDS_BY_PAGE, BoardController.BOARDS_BY_PAGE);
		return boards.stream().distinct().collect(Collectors.toList());
	}

	Json readFromBoardSummaries(Collection<Board> boards) {
		Json list = Json.createJsonArray();
		boards.stream().forEach(board->list.push(readFromBoardSummary(board)));
		return list;
	}

	static int BOARDS_BY_PAGE = 10;
}
