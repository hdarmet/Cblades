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
import java.util.*;
import java.util.function.Predicate;

public class GameTest implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillPlayerIdentity() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        PlayerIdentity playerIdentity = new PlayerIdentity()
            .setName("Jurgen Dan Babenberg")
            .setDescription("Roughneck Most Powerful Captain")
            .setPath("babenborg.png")
            .setStatus(PlayerIdentityStatus.LIVE)
            .setAuthor(account);
        Assert.assertEquals("Jurgen Dan Babenberg", playerIdentity.getName());
        Assert.assertEquals("Roughneck Most Powerful Captain", playerIdentity.getDescription());
        Assert.assertEquals("babenborg.png", playerIdentity.getPath());
        Assert.assertEquals(PlayerIdentityStatus.LIVE, playerIdentity.getStatus());
        Assert.assertEquals(account, playerIdentity.getAuthor());
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(playerIdentity, playerIdentity
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, playerIdentity.getComments());
        Assert.assertEquals(playerIdentity, playerIdentity.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, playerIdentity.getComments());
    }

    @Test
    public void findPlayerIdentityByName() {
        PlayerIdentity playerIdentity = new PlayerIdentity()
                .setName("Jurgen Dan Babenberg");
        dataManager.register("createQuery", null, null,
                "select pi from PlayerIdentity pi where pi.name = :name");
        dataManager.register("setParameter", null, null,"name", "Jurgen Dan Babenberg");
        dataManager.register("getSingleResult", playerIdentity, null);
        inTransaction(em->{
            Assert.assertEquals(playerIdentity, PlayerIdentity.getByName(em, "Jurgen Dan Babenberg"));
        });
    }

    @Test
    public void tryToFindAnUnknownPlayerIdentityByName() {
        dataManager.register("createQuery", null, null,
                "select pi from PlayerIdentity pi where pi.name = :name");
        dataManager.register("setParameter", null, null,"name", "Jurgen Dan Babenberg");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            try {
                PlayerIdentity.getByName(em, "Jurgen Dan Babenberg");
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("PlayerIdentity of name Jurgen Dan Babenberg not found", snfe.getMessage());
            }
        });
    }

    @Test
    public void fillPlayer() {
        PlayerIdentity playerIdentity = new PlayerIdentity()
            .setName("Jurgen Dan Babenberg");
        Player player = new Player()
            .setIdentity(playerIdentity);
        Assert.assertEquals(playerIdentity, player.getIdentity());
        Assert.assertEquals("Jurgen Dan Babenberg", player.getName());
        Unit goblin1 = new Unit().setName("goblin1");
        Wing wing1 = new Wing()
            .setBanner(new Banner().setName("Black Orcs"))
            .addUnit(new Unit().setName("orc1"))
            .addUnit(new Unit().setName("orc2"));
        Wing wing2 = new Wing()
            .setBanner(new Banner().setName("Broken Bones"))
            .addUnit(goblin1)
            .addUnit(new Unit().setName("goblin2"));
        Assert.assertEquals(player, player
            .addWing(wing1)
            .addWing(wing2)
        );
        Assert.assertEquals(new ArrayList<Wing>() {{
            add(wing1);
            add(wing2);
        }}, player.getWings());
        Assert.assertEquals(wing2, player.getWing("Broken Bones"));
        Assert.assertNull(player.getWing("Invern"));
        Assert.assertEquals(goblin1, player.getUnit("goblin1"));
        Assert.assertNull(player.getUnit("Goblin3"));
        Assert.assertEquals(player, player.removeWing(wing1));
        Assert.assertEquals(new ArrayList<Wing>() {{
            add(wing2);
        }}, player.getWings());

    }

    @Test
    public void duplicateWing() {
        Unit unit = new Unit().setName("Orc-1");
        Wing wing = new Wing().addUnit(unit);
        PlayerIdentity playerIdentity = new PlayerIdentity()
            .setName("Jurgen Dan Babenberg");
        Player player = new Player()
            .setIdentity(playerIdentity)
            .addWing(wing);
        Object[] copy = new Object[3];
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[0] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[1] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[2] = entity; return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em->{
            player.duplicate(em, duplications);
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(unit));
            Assert.assertNotNull(copy[1]);
            Assert.assertEquals(copy[1], duplications.get(wing));
            Assert.assertNotNull(copy[2]);
            Assert.assertEquals(copy[2], duplications.get(player));
        });
    }

    @Test
    public void fillLocation() {
        Location location = new Location()
            .setRow(2).setCol(3);
        Assert.assertEquals(2, location.getRow());
        Assert.assertEquals(3, location.getCol());
        Unit unit = new Unit();
        Token token = new Token();
        Assert.assertEquals(location, location
            .addPiece(unit)
            .addPiece(token)
        );
        Assert.assertEquals(new ArrayList<Piece>() {{
            add(unit);
            add(token);
        }}, location.getPieces());
        Assert.assertEquals(location, location.removePiece(unit));
        Assert.assertEquals(new ArrayList<Piece>() {{
            add(token);
        }}, location.getPieces());
        Assert.assertEquals(location, location.addPiece(unit, Stacking.BOTTOM));
        Assert.assertEquals(new ArrayList<Piece>() {{
            add(unit);
            add(token);
        }}, location.getPieces());
        Unit unit2 = new Unit();
        Assert.assertEquals(location, location.addPiece(unit2, Stacking.TOP));
        Assert.assertEquals(new ArrayList<Piece>() {{
            add(unit);
            add(token);
            add(unit2);
        }}, location.getPieces());
    }

    @Test
    public void finfATokenByType() {
        Token token1 = new Token().setType("Fire");
        Token token2 = new Token().setType("Fog");
        Token token3 = new Token().setType("Water");
        Unit unit = new Unit();
        Location location = new Location()
            .addPiece(token1)
            .addPiece(token2)
            .addPiece(token3)
            .addPiece(unit);
        Assert.assertEquals(token2, location.getToken("Fog"));
        Assert.assertNull(location.getToken("Magic"));
    }

    @Test
    public void findALocationInAGame() {
        Game game = new Game();
        Location location = new Location().setCol(2).setRow(3);
        game
            .addLocation(
                new Location().setCol(1).setRow(2)
            )
            .addLocation(location)
            .addLocation(
                new Location().setCol(2).setRow(1)
            );
        java.util.Map context = Location.getLocations(game);
        Assert.assertEquals(location, Location.getLocation(game, context, 2, 3));
        Location newLocation = Location.getLocation(game, context, 3, 2);
        Assert.assertNotNull(newLocation);
        Assert.assertTrue(context.containsValue(newLocation));
        Assert.assertTrue(game.getLocations().contains(newLocation));
        Unit unit = new Unit().setPositionCol(2).setPositionRow(3);
        Assert.assertEquals(location, Location.getLocation(game, context, unit));
        Location[] locations = Location.getUnitLocations(game, context, unit);
        Assert.assertEquals(1, locations.length);
        Assert.assertEquals(location, locations[0]);
        unit.setPositionAngle(60);
        Location altLocation = Location.getFormationAltLocation(game, context, unit);
        Assert.assertEquals(new LocationId(3, 3), altLocation.getLocationId());
        locations = Location.getUnitLocations(game, context, unit);
        Assert.assertEquals(2, locations.length);
        Assert.assertEquals(location, locations[0]);
        Assert.assertEquals(altLocation, locations[1]);
    }

    @Test
    public void addAndRemovePiecesToLocation() {
        Game game = new Game();
        Location location = new Location().setCol(2).setRow(3);
        game.addLocation(location);
        Unit unit = new Unit().setPositionCol(2).setPositionRow(3);
        java.util.Map context = Location.getLocations(game);
        Location.addPieceToLocation(game, context, location, unit, Stacking.TOP);
        Assert.assertTrue(location.getPieces().contains(unit));
        Assert.assertTrue(game.containsLocation(location));
        Location.removePieceFromLocation(game, context, location, unit);
        Assert.assertFalse(location.getPieces().contains(unit));
        Assert.assertFalse(game.getLocations().contains(location));
        Assert.assertFalse(game.containsLocation(location));
    }

    @Test
    public void duplicateLocation() {
        Game game = new Game();
        Location location = new Location().setCol(2).setRow(3);
        game.addLocation(location);
        Unit unit = new Unit().setPositionCol(2).setPositionRow(3);
        location.addPiece(unit);
        Object[] copy = new Object[2];
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[0] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[1] = entity; return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em-> {
            location.duplicate(em, duplications);
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(unit));
            Assert.assertNotNull(copy[1]);
            Assert.assertEquals(copy[1], duplications.get(location));
            Assert.assertEquals(3, ((Location)copy[1]).getRow());
            Assert.assertEquals(2, ((Location)copy[1]).getCol());
            Assert.assertEquals(copy[0], ((Location)copy[1]).getPieces().get(0));
            location.duplicate(em, duplications);
            Assert.assertEquals(copy[1], duplications.get(location));
        });
    }

    @Test
    public void checkLocationId() {
        LocationId locationId = new LocationId(2, 3);
        Assert.assertEquals(2, locationId.getCol());
        Assert.assertEquals(3, locationId.getRow());
        Assert.assertEquals("location(2, 3)",locationId.toString());
        Assert.assertEquals(2, LocationId.findNearCol(2, 3, 0));
        Assert.assertEquals(3, LocationId.findNearCol(2, 3, 60));
        Assert.assertEquals(3, LocationId.findNearCol(2, 3, 120));
        Assert.assertEquals(2, LocationId.findNearCol(2, 3, 180));
        Assert.assertEquals(1, LocationId.findNearCol(2, 3, 240));
        Assert.assertEquals(1, LocationId.findNearCol(2, 3, 300));

        Assert.assertEquals(2, LocationId.findNearRow(2, 3, 0));
        Assert.assertEquals(3, LocationId.findNearRow(2, 3, 60));
        Assert.assertEquals(4, LocationId.findNearRow(2, 3, 120));
        Assert.assertEquals(4, LocationId.findNearRow(2, 3, 180));
        Assert.assertEquals(4, LocationId.findNearRow(2, 3, 240));
        Assert.assertEquals(3, LocationId.findNearRow(2, 3, 300));

        Assert.assertEquals("location(2, 2)", LocationId.getNear(2, 3, 0).toString());
    }

    @Test
    public void fillSequenceElement() {
        String CONTENT = "{\n\"unit\":\"1\",\n\"target\":{\n\"col\":\"1\",\n\"row\":\"2\"},\n\"spent\":[1, 2, 2]\n}";
        SequenceElement sequenceElement = new SequenceElement()
            .setType("MOVE")
            .setContent(CONTENT)
            .setLast(true);
        Assert.assertEquals("MOVE", sequenceElement.getType());
        Assert.assertEquals(CONTENT, sequenceElement.getContent());
        Assert.assertTrue(sequenceElement.isLast());
        java.util.Map<String, Object> attrs = sequenceElement.getAttrs();
        Assert.assertEquals("1", attrs.get("unit"));
        Assert.assertEquals(new HashMap() {{
            put("col", "1");
            put("row", "2");
        }}, attrs.get("target"));
        Assert.assertEquals(
            Arrays.asList(1, 2, 2),
            attrs.get("spent")
        );
        Assert.assertEquals("2", sequenceElement.getAttr("target.row"));
        sequenceElement.setAttr(attrs, "target.angle", "60");
        Assert.assertEquals("60", sequenceElement.getAttr("target.angle"));
        sequenceElement.setAttr(attrs, "props.steps", 2);
        Assert.assertEquals(2, sequenceElement.getAttr("props.steps"));
        Assert.assertFalse(sequenceElement.isTurnClosed());
        sequenceElement.setType(SequenceElement.TYPE_NEXT_TURN);
        Assert.assertTrue(sequenceElement.isTurnClosed());
        sequenceElement.setAttrs(new HashMap<String, Object>() {{
            put("token", "fire");
        }});
        Assert.assertEquals("fire", sequenceElement.getAttr("token"));
        boolean passed[] = new boolean[] {false};
        sequenceElement.accept(new SequenceElement.SequenceVisitor() {
            @Override
            public void visit(SequenceElement element) {
                SequenceElement.SequenceVisitor.super.visit(element);
                passed[0] = true;
            }
        });
        Assert.assertTrue(passed[0]);
    }

    @Test
    public void fillSequence() {
        Player player1 = new Player()
            .setIdentity(new PlayerIdentity().setName("Orc Chief"));
        Player player2 = new Player()
            .setIdentity(new PlayerIdentity().setName("Roughneck Captain"));
        Game game = new Game()
            .addPlayer(player1)
            .addPlayer(player2);
        Sequence sequence = new Sequence()
            .setGame(101L)
            .setCount(2)
            .setCurrentTurn(3)
            .setCurrentPlayerIndex(1);
        Assert.assertEquals(101, sequence.getGame());
        Assert.assertEquals(2, sequence.getCount());
        Assert.assertEquals(3, sequence.getCurrentTurn());
        Assert.assertEquals(1, sequence.getCurrentPlayerIndex());
        dataManager.register("find", game, null, Game.class, 101L);
        inTransaction(em->{
            Assert.assertEquals(game, sequence.getGame(em));
        });
        SequenceElement sequenceElement1 = new SequenceElement().setType("MOVE");
        SequenceElement sequenceElement2 = new SequenceElement().setType("MOVE");
        Assert.assertEquals(sequence, sequence
            .addElement(sequenceElement1)
            .addElement(sequenceElement2)
        );
        Assert.assertEquals(new ArrayList<SequenceElement>() {{
            add(sequenceElement1);
            add(sequenceElement2);
        }}, sequence.getElements());
        Assert.assertEquals(sequence, sequence.removeElement(sequenceElement1));
        Assert.assertEquals(new ArrayList<SequenceElement>() {{
            add(sequenceElement2);
        }}, sequence.getElements());
        Assert.assertFalse(sequence.isTurnClosed());
        sequenceElement1.setType(SequenceElement.TYPE_NEXT_TURN);
        Assert.assertFalse(sequence.isTurnClosed());
        sequenceElement2.setType(SequenceElement.TYPE_NEXT_TURN);
        Assert.assertTrue(sequence.isTurnClosed());
        dataManager.register("find", game, null, Game.class, 101L);
        inTransaction(em->{
            Assert.assertEquals(player2, sequence.getPlayer(em));
        });
        Assert.assertFalse(sequenceElement2.isLast());
        Assert.assertEquals(sequence, sequence.setLastSequence());
        Assert.assertTrue(sequenceElement2.isLast());
    }

    @Test
    public void fillGame() {
        Map map = new Map();
        Game game = new Game()
                .setMap(map)
                .setFog(FogType.DENSE_MIST)
                .setWeather(WeatherType.RAIN)
                .setWindDirection(60)
                .setCurrentPlayerIndex(1)
                .setCurrentTurn(2);
        Assert.assertEquals(map, game.getMap());
        Assert.assertEquals(FogType.DENSE_MIST, game.getFog());
        Assert.assertEquals(WeatherType.RAIN, game.getWeather());
        Assert.assertEquals(60, game.getWindDirection());
        Assert.assertEquals(1, game.getCurrentPlayerIndex());
        Assert.assertEquals(2, game.getCurrentTurn());
        Player player1 = new Player()
                .setIdentity(new PlayerIdentity().setName("Orc Chief"));
        Player player2 = new Player()
                .setIdentity(new PlayerIdentity().setName("Roughneck Captain"));
        Assert.assertEquals(game, game
            .addPlayer(player1)
            .addPlayer(player2)
        );
        Assert.assertEquals(new ArrayList<Player>() {{
            add(player1);
            add(player2);
        }}, game.getPlayers());
        Assert.assertEquals(game, game.setCurrentPlayer(player1));
        Assert.assertEquals(player1, game.getCurrentPlayer());
        Assert.assertEquals(game, game.removePlayer(player1));
        Assert.assertEquals(new ArrayList<Player>() {{
            add(player2);
        }}, game.getPlayers());
        Assert.assertEquals(player2, game.getPlayer("Roughneck Captain"));
        Assert.assertNull(game.getPlayer("Amarys's General"));
    }

    @Test
    public void duplicateGame() {
        Map map = new Map();
        Player player = new Player()
            .setIdentity(new PlayerIdentity().setName("Orc Chief"));
        Location location = new Location().setCol(2).setRow(3);
        Game game = new Game()
            .setMap(map)
            .addPlayer(player)
            .addLocation(location);
        Object[] copy = new Object[4];
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[0] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[1] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[2] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[3] = entity; return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em-> {
            game.duplicate(em, duplications);
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(map));
            Assert.assertNotNull(copy[1]);
            Assert.assertEquals(copy[1], duplications.get(player));
            Assert.assertNotNull(copy[2]);
            Assert.assertEquals(copy[2], duplications.get(location));
            Assert.assertNotNull(copy[3]);
            Assert.assertEquals(copy[3], duplications.get(game));
        });
    }

    @Test
    public void collectPieces() {
        Unit orc1 = new Unit().setName("orc1");
        Unit orc2 = new Unit().setName("orc2");
        Token fire = new Token().setType("Fire");
        Player player = new Player()
            .addWing(new Wing()
                .addUnit(orc1)
                .addUnit(orc2)
            );
        Game game = new Game()
            .addPlayer(player)
            .addLocation(new Location().setCol(1).setRow(2)
                .addPiece(orc1)
                .addPiece(fire)
            )
            .addLocation(new Location().setCol(1).setRow(2)
                .addPiece(orc1)
                .addPiece(orc2)
            );
        Assert.assertEquals(new HashSet<Piece>() {{
            add(orc1);
            add(orc2);
            add(fire);
        }},
        game.getPieces());
        Assert.assertEquals(orc2, game.getUnitByName("orc2"));
        Assert.assertNull(game.getUnitByName("orc3"));
    }

    @Test
    public void nextPlayerTurn() {
        Player player1 = new Player()
            .setIdentity(new PlayerIdentity().setName("Orc Chief"));
        Player player2 = new Player()
            .setIdentity(new PlayerIdentity().setName("Roughneck Captain"));
        Game game = new Game()
            .addPlayer(player1)
            .addPlayer(player2)
            .setCurrentPlayer(player1)
            .setCurrentTurn(0);
        Assert.assertEquals(game, game.advanceToNextPlayerTurn());
        Assert.assertEquals(0, game.getCurrentTurn());
        Assert.assertEquals(player2, game.getCurrentPlayer());
        Assert.assertEquals(game, game.advanceToNextPlayerTurn());
        Assert.assertEquals(1, game.getCurrentTurn());
        Assert.assertEquals(player1, game.getCurrentPlayer());
    }

}
