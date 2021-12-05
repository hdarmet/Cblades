package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.Board;
import fr.cblades.domain.HexSideType;
import fr.cblades.domain.HexType;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class BoardController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/board/create", method=Method.POST)
	public Json create(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Board newBoard = writeToBoard(request, new Board());
					persist(em, newBoard);
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

	@REST(url="/api/board/all", method=Method.POST)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				Collection<Board> boards = findBoards(em.createQuery("select b from Board b left outer join fetch b.hexes"));
				result.set(readFromBoards(boards));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/board/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String name = params.get("name");
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
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				Board board = findBoard(em, new Long(id));
				result.set(readFromBoard(board));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/board/delete/:id", method=Method.POST)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
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
	public Json update(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = params.get("id");
					Board board = findBoard(em, new Long(id));
					writeToBoard(request, board);
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
			.checkPattern("name", "[a-zA-Z0-9_\\-]+")
			.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
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
			.write("path")
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
			.read("path")
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

	Json readFromBoards(Collection<Board> boards) {
		Json list = Json.createJsonArray();
		boards.stream().forEach(board->list.push(readFromBoard(board)));
		return list;
	}

}
