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
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;
import org.summer.util.StringReplacer;

import javax.imageio.ImageIO;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collection;
import java.util.List;
import java.util.Map;
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
					.setStream(PlatformManager.get().getInputStream("/board/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	void storeBoard (Map<String, Object> params, Board board) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files.length > 0) {
			if (files.length!= 2) throw new SummerControllerException(400, "Two board files must be loaded.");
			String fileName = "board-" + board.getId() + "." + files[0].getExtension();
			String fileIconName = "board-" + board.getId() + "." + files[1].getExtension();
			String webName = "board-" + board.getId() + "-" + System.currentTimeMillis() + "." + files[0].getExtension();
			String webIconName = "board-icon-" + board.getId() + "-" + System.currentTimeMillis() + "." + files[1].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/board/" + fileName));
			copyStream(files[1].getStream(), PlatformManager.get().getOutputStream("/board/" + fileIconName));
			board.setPath("/api/board/images/" + webName);
			board.setIcon("/api/board/images/" + webIconName);
		}
	}

	@REST(url="/api/board/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Board newBoard = writeToBoard(request, new Board());
					persist(em, newBoard);
					storeBoard(params, newBoard);
					result.set(readFromBoard(newBoard));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Board with name (%s) already exists",
					request.get("name"), null
				);
			}
		}, ADMIN);
	}

	@REST(url="/api/board/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
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
			return result.get();
		}, ADMIN);
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
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String name = (String)params.get("name");
				Board board = getSingleResult(em,
						"select b from Board b left outer join fetch b.hexes where b.name = :name",
						"name", name);
				if (board==null) {
					throw new SummerControllerException(404,
							"Unknown Board with name %s", name
					);
				}
				result.set(readFromBoard(board));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/board/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = (String)params.get("id");
				Board board = findBoard(em, new Long(id));
				result.set(readFromBoard(board));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/board/delete/:id", method=Method.POST)
	public Json delete(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Board board = findBoard(em, new Long(id));
					remove(em, board);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	@REST(url="/api/board/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = (String)params.get("id");
					Board board = findBoard(em, new Long(id));
					writeToBoard(request, board);
					storeBoard(params, board);
					flush(em);
					result.set(readFromBoard(board));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	Board writeToBoard(Json json, Board board) {
		verify(json)
			.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkPattern("name", "[\\d\\s\\w]+")
			.checkRequired("description").checkMinSize("description", 2).checkMaxSize("description", 1000)
			.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
			.checkRequired("icon").checkMinSize("icon", 2).checkMaxSize("icon", 200)
			.check("status",BoardStatus.byLabels().keySet())
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
			.write("version")
			.write("name")
			.write("description")
			.write("path")
			.write("icon")
			.write("status", label->BoardStatus.byLabels().get(label))
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
			.read("status", BoardStatus::getLabel);
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
