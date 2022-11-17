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
public class BoardController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@MIME(url="/api/board/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String webName = (String)params.get("imagename");
			int minusPos = webName.indexOf('-');
			int pointPos = webName.indexOf('.');
			String imageName = webName.substring(0, minusPos)+webName.substring(pointPos);
			return new FileSpecification()
					.setName(imageName)
					.setStream(PlatformManager.get().getInputStream("/boards/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeBoardImages(Map<String, Object> params, Board board) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files.length > 0) {
			if (files.length!= 2) throw new SummerControllerException(400, "Two board files must be loaded.");
			String fileName = "board" + board.getId() + "." + files[0].getExtension();
			String fileIconName = "boardicon" + board.getId() + "." + files[1].getExtension();
			String webName = "board" + board.getId() + "-" + System.currentTimeMillis() + "." + files[0].getExtension();
			String webIconName = "boardicon" + board.getId() + "-" + System.currentTimeMillis() + "." + files[1].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/boards/" + fileName));
			copyStream(files[1].getStream(), PlatformManager.get().getOutputStream("/boards/" + fileIconName));
			board.setPath("/api/board/images/" + webName);
			board.setIcon("/api/board/images/" + webIconName);
		}
	}

	@REST(url="/api/board/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Board newBoard = writeToProposedBoard(request, new Board());
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						addComment(request, newBoard, author);
						newBoard.setStatus(BoardStatus.PROPOSED);
						newBoard.setAuthor(author);
						persist(em, newBoard);
						storeBoardImages(params, newBoard);
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
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						Account author = Account.find(em, user);
						writeToProposedBoard(request, board);
						addComment(request, board, author);
						storeBoardImages(params, board);
						flush(em);
						result.set(readFromBoard(board));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				},
				verifyIfAdminOrOwner(board)
			);
		});
		return result.get();
	}

	@REST(url="/api/board/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Board newBoard = writeToBoard(em, request, new Board());
			ifAuthorized(
				user->{
					try {
						persist(em, newBoard);
						storeBoardImages(params, newBoard);
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

	@REST(url="/api/board/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(b) from Board b";
				String queryString = "select b from Board b";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
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
	public Json getLive(Map<String, String> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			Collection<Board> boards = findBoards(em.createQuery("select b from Board b where b.status=:status"),
				"status", BoardStatus.LIVE);
			result.set(readFromBoardSummaries(boards));
		});
		return result.get();
	}

	@REST(url="/api/board/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
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
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						String searchClause =" and fts('pg_catalog.english', " +
							"b.name||' '||" +
							"b.description||' '||" +
							"b.status, :search) = true";

						String queryString = "select b from Board b where b.author=:author order by b.updateTimestamp, b.status";
						Collection<Board> boards = findPagedBoards(
							em.createQuery(queryString),
							pageNo,
							"author", Account.find(em, user));
						result.set(readFromBoardSummaries(boards));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	@REST(url="/api/board/find/:id", method=Method.GET)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromBoardAndHexes(board));
			},
			verifyIfAdminOrOwner(board));
		});
		return result.get();
	}

	@REST(url="/api/board/load/:id", method=Method.GET)
	public Json getBoardWithComments(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(user->{
				result.set(readFromBoard(board));
			},
			verifyIfAdminOrOwner(board));
		});
		return result.get();
	}

	@REST(url="/api/board/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		inTransaction(em->{
			String id = (String)params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						remove(em, board);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				verifyIfAdminOrOwner(board)
			);
		});
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/board/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToBoard(em, request, board);
						storeBoardImages(params, board);
						flush(em);
						result.set(readFromBoard(board));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/board/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em-> {
			String id = (String) params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToBoardStatus(request, board);
						flush(em);
						result.set(readFromBoard(board));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	@REST(url="/api/board/update-hexes/:id", method=Method.POST)
	public Json updateHexes(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransaction(em->{
			String id = (String)params.get("id");
			Board board = findBoard(em, new Long(id));
			ifAuthorized(
				user->{
					try {
						writeToBoardHexes(request, board);
						flush(em);
						result.set(readFromBoardAndHexes(board));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
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

	Board writeToProposedBoard(Json json, Board board) {
		verify(json)
			.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkPattern("name", "[\\d\\s\\w]+")
			.checkRequired("description").checkMinSize("description", 2).checkMaxSize("description", 1000)
			.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
			.checkRequired("icon").checkMinSize("icon", 2).checkMaxSize("icon", 200)
			.checkMinSize("newComment", 2).checkMaxSize("newComment", 200)
			.ensure();
		sync(json, board)
			.write("version")
			.write("name")
			.write("description")
			.write("path")
			.write("icon");
		return board;
	}

	void addComment(Json json, Board board, Account author) {
		String comment = json.get("newComment");
		if (comment!=null) {
			board.addComment(new Comment().setDate(new Date()).setText(comment).setAuthor(author));
		}
	}

	Board writeToBoard(EntityManager em, Json json, Board board) {
		try {
			verify(json)
				.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 20)
				.checkPattern("name", "[\\d\\s\\w]+")
				.checkRequired("description").checkMinSize("description", 2).checkMaxSize("description", 1000)
				.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
				.checkRequired("icon").checkMinSize("icon", 2).checkMaxSize("icon", 200)
				.check("status", BoardStatus.byLabels().keySet())
				.each("comments", cJson -> verify(cJson)
					.checkRequired("version")
					.checkRequired("date")
					.checkRequired("text")
					.checkMinSize("text", 2)
					.checkMaxSize("text", 19995)
				)
				.ensure();
			sync(json, board)
				.write("version")
				.write("name")
				.write("description")
				.write("path")
				.write("icon")
				.write("status", label -> BoardStatus.byLabels().get(label))
				.writeRef("author.id", "author", (Integer id) -> Account.find(em, id))
				.syncEach("comments", (cJson, comment) -> sync(cJson, comment)
					.write("version")
					.writeDate("date")
					.write("text")
				);
			return board;
		} catch (SummerNotFoundException snfe) {
			throw new SummerControllerException(404, snfe.getMessage());
		}
	}

	Board writeToBoardStatus(Json json, Board board) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.check("status", BoardStatus.byLabels().keySet())
			.ensure();
		sync(json, board)
			.write("status", label->BoardStatus.byLabels().get(label));
		return board;
	}

	Board writeToBoardHexes(Json json, Board board) {
		verify(json)
			.each("hexes", cJson->verify(cJson)
				.checkRequired("version")
				.checkRequired("col").checkMin("col", 0).checkMax("col", 13)
				.checkRequired("row").checkMin("row", 0).checkMax("row", 16)
				.checkRequired("height").checkMin("height", -5).checkMax("height", 5)
				.checkRequired("type").check("type", HexType.byLabels().keySet())
				.checkRequired("side120Type").check("side120Type", HexSideType.byLabels().keySet())
				.checkRequired("side180Type").check("side180Type", HexSideType.byLabels().keySet())
				.checkRequired("side240Type").check("side240Type", HexSideType.byLabels().keySet())
			)
			.ensure();
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
			.readLink("author", (pJson, account)->sync(pJson, account)
				.read("id")
				.read("login", "access.login")
				.read("firstName")
				.read("lastName")
				.read("avatar")
			);
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

	static int ICON_WIDTH = 205;
	static int ICON_HEIGHT = 305;
	static int BOARDS_BY_PAGE = 10;
}
