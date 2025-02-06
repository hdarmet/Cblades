package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.ApplicationManager;
import org.summer.ApplicationManagerForTestImpl;
import org.summer.MockDataManagerImpl;
import org.summer.data.BaseEntity;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;

import javax.persistence.NoResultException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.function.Predicate;

public class MapTest  implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillHex() {
        Hex hex  = new Hex()
            .setCol(2).setRow(3).setHeight(-1)
            .setSide120Type(HexSideType.EASY)
            .setSide180Type(HexSideType.WALL)
            .setSide240Type(HexSideType.NORMAL)
            .setType(HexType.OUTDOOR_ROUGH);
        Assert.assertEquals(2, hex.getCol());
        Assert.assertEquals(3, hex.getRow());
        Assert.assertEquals(-1, hex.getHeight());
        Assert.assertEquals(HexSideType.EASY, hex.getSide120Type());
        Assert.assertEquals(HexSideType.WALL, hex.getSide180Type());
        Assert.assertEquals(HexSideType.NORMAL, hex.getSide240Type());
        Assert.assertEquals(HexType.OUTDOOR_ROUGH, hex.getType());
    }

    @Test
    public void fillBoard() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Board board = new Board()
            .setName("Forest 1")
            .setPath("forest1.png")
            .setIcon("forest1Icon.png")
            .setStatus(BoardStatus.LIVE)
            .setAuthor(account)
            .setDescription("A dense dark forest.");
        Assert.assertEquals("Forest 1", board.getName());
        Assert.assertEquals("forest1.png", board.getPath());
        Assert.assertEquals("forest1Icon.png", board.getIcon());
        Assert.assertEquals(BoardStatus.LIVE, board.getStatus());
        Assert.assertEquals(account, board.getAuthor());
        Assert.assertEquals("A dense dark forest.", board.getDescription());
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(board, board
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, board.getComments());
        Assert.assertEquals(board, board.removeComment(comment1));
        Assert.assertEquals(board, board
            .addComment(comment2)
        );
        Hex hex1 = new Hex().setCol(1).setRow(2).setHeight(0);
        Hex hex2 = new Hex().setCol(2).setRow(2).setHeight(0);
        Assert.assertEquals(board, board
            .addHex(hex1)
            .addHex(hex2)
        );
        Assert.assertEquals(new ArrayList<Hex>() {{
            add(hex1);
            add(hex2);
        }}, board.getHexes());
        Assert.assertEquals(board, board.removeHex(hex1));
        Assert.assertEquals(board, board
            .addHex(hex2)
        );
    }

    @Test
    public void findBoardByName() {
        Board board = new Board()
            .setName("Forest 1")
            .setPath("forest1.png");
        dataManager.register("createQuery", null, null,
                "select b from Board b where b.name = :name");
        dataManager.register("setParameter", null, null,"name", "Forest 1");
        dataManager.register("getSingleResult", board, null);
        inTransaction(em->{
            Assert.assertEquals(board, Board.getByName(em, "Forest 1"));
        });
    }

    @Test
    public void tryToFindAnUnknownBoardByName() {
        dataManager.register("createQuery", null, null,
                "select b from Board b where b.name = :name");
        dataManager.register("setParameter", null, null,"name", "Forest 1");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            try {
                Board.getByName(em, "Forest 1");
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Board with name Forest 1", snfe.getMessage());
            }
        });
    }

    @Test
    public void findBoardByPath() {
        Board board = new Board()
                .setName("Forest 1")
                .setPath("forest1.png");
        dataManager.register("createQuery", null, null,
                "select b from Board b where b.path = :path");
        dataManager.register("setParameter", null, null,"path", "forest1.png");
        dataManager.register("getSingleResult", board, null);
        inTransaction(em->{
            Assert.assertEquals(board, Board.getByPath(em, "forest1.png"));
        });
    }

    @Test
    public void tryToFindAnUnknownBoardByPath() {
        dataManager.register("createQuery", null, null,
                "select b from Board b where b.path = :path");
        dataManager.register("setParameter", null, null,"path", "forest1.png");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            try {
                Board.getByPath(em, "forest1.png");
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Board with path forest1.png", snfe.getMessage());
            }
        });
    }

    @Test
    public void fillBoardPlacement() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Board board = new Board()
            .setName("Forest 1")
            .setPath("forest1.png");
        BoardPlacement boardPlacement = new BoardPlacement()
            .setCol(0).setRow(1).setInvert(true)
            .setBoard(board);
        Assert.assertEquals(0, boardPlacement.getCol());
        Assert.assertEquals(1, boardPlacement.getRow());
        Assert.assertTrue(boardPlacement.isInvert());
        Assert.assertEquals(board, boardPlacement.getBoard());
    }

    @Test
    public void duplicateBoardPlacement() {
        BoardPlacement boardPlacement = new BoardPlacement();
        BoardPlacement[] copy = new BoardPlacement[1];
        dataManager.register("persist", null, null, (Predicate) entity->{
            copy[0] = (BoardPlacement) entity;
            return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em->{
            boardPlacement.duplicate(em, duplications);
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(boardPlacement));
        });
    }

    @Test
    public void fillMap() {
        Map map = new Map();
        BoardPlacement boardPlacement1 = new BoardPlacement();
        BoardPlacement boardPlacement2 = new BoardPlacement();
        Assert.assertEquals(map, map
                .addBoardPlacement(boardPlacement1)
                .addBoardPlacement(boardPlacement2)
        );
        Assert.assertEquals(new ArrayList<BoardPlacement>() {{
            add(boardPlacement1);
            add(boardPlacement2);
        }}, map.getBoardPlacements());
        Assert.assertEquals(map, map.removeBoardPlacement(boardPlacement1));
        Assert.assertEquals(new ArrayList<BoardPlacement>() {{
            add(boardPlacement2);
        }}, map.getBoardPlacements());
    }

    @Test
    public void duplicateMap() {
        BoardPlacement boardPlacement1 = new BoardPlacement();
        BoardPlacement boardPlacement2 = new BoardPlacement();
        Map map = new Map()
            .addBoardPlacement(boardPlacement1)
            .addBoardPlacement(boardPlacement2);
        Object[] copy = new Object[3];
        dataManager.register("persist", null, null, (Predicate) entity->{
            copy[0] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity->{
            copy[1] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity->{
            copy[2] = entity; return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em->{
            map.duplicate(em, duplications);
            Assert.assertNotNull(copy[2]);
            Assert.assertEquals(copy[2], duplications.get(map));
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(boardPlacement1));
            Assert.assertNotNull(copy[1]);
            Assert.assertEquals(copy[1], duplications.get(boardPlacement2));
        });
    }

}
