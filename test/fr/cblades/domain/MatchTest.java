package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.*;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;

import javax.persistence.NoResultException;
import java.util.ArrayList;

public class MatchTest implements DataSunbeam, CollectionSunbeam, TestSeawave {

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
        Game game = new Game();
        Scenario scenario = new Scenario()
            .setTitle("The fierce victory of Jurgen")
            .setGame(game)
            .setIllustration("scenario.png")
            .setStatus(ScenarioStatus.LIVE)
            .setStory("A big and terrifying battle...")
            .setVictoryConditions("How to win here...")
            .setSpecialRules("Special rules here...")
            .setSetUp("The way units should be deplyed.")
            .setAuthor(account);
        Assert.assertEquals("The fierce victory of Jurgen", scenario.getTitle());
        Assert.assertEquals(game, scenario.getGame());
        Assert.assertEquals("scenario.png", scenario.getIllustration());
        Assert.assertEquals(ScenarioStatus.LIVE, scenario.getStatus());
        Assert.assertEquals("A big and terrifying battle...", scenario.getStory());
        Assert.assertEquals("How to win here...", scenario.getVictoryConditions());
        Assert.assertEquals("Special rules here...", scenario.getSpecialRules());
        Assert.assertEquals("The way units should be deplyed.", scenario.getSetUp());
        Assert.assertEquals(account, scenario.getAuthor());
    }

    @Test
    public void manageCommentsInScenario() {
        Scenario scenario = new Scenario();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(scenario, scenario
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, scenario.getComments());
        Assert.assertEquals(scenario, scenario.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, scenario.getComments());
    }

    @Test
    public void findScenarioById() {
        Scenario scenario = new Scenario();
        dataManager.register("find", scenario, null, Scenario.class, 1L);
        inTransaction(em->{
            Assert.assertEquals(scenario, Scenario.find(em, 1L));
        });
    }

    @Test
    public void tryToFindUnknownScenarioById() {
        dataManager.register("find", null, null, Scenario.class, 1L);
        inTransaction(em->{
            try {
                Scenario.find(em, 1L);
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Scenario with id 1", snfe.getMessage());
            }
        });
    }

    @Test
    public void fillPlayerMatch() {
        PlayerIdentity playerIdentity = new PlayerIdentity()
            .setName("Jurgen Dan Babenberg");
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        PlayerMatch playerMatch = new PlayerMatch()
            .setPlayerAccount(account)
            .setPlayerIdentity(playerIdentity)
            .setLastSequenceCount(4);
        Assert.assertEquals(playerIdentity, playerMatch.getPlayerIdentity());
        Assert.assertEquals(account, playerMatch.getPlayerAccount());
        Assert.assertEquals(4, playerMatch.getLastSequenceCount());
    }

    @Test
    public void fillGameMatch() {
        Game game = new Game();
        Scenario scenario = new Scenario();
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        GameMatch gameMatch = new GameMatch()
            .setGame(game)
            .setScenario(scenario)
            .setCurrentTurn(2)
            .setStatus(GameMatchStatus.IN_PROGRESS)
            .setAuthor(account)
            .setCurrentPlayerIndex(1);
        Assert.assertEquals(game, gameMatch.getGame());
        Assert.assertEquals(scenario, gameMatch.getScenario());
        Assert.assertEquals(2, gameMatch.getCurrentTurn());
        Assert.assertEquals(GameMatchStatus.IN_PROGRESS, gameMatch.getStatus());
        Assert.assertEquals(account, gameMatch.getAuthor());
        Assert.assertEquals(1, gameMatch.getCurrentPlayerIndex());
    }

    @Test
    public void managePlayerMatchInGameMatch() {
        PlayerIdentity playerIdentity1 = new PlayerIdentity();
        Player player1 = new Player().setIdentity(playerIdentity1);
        PlayerIdentity playerIdentity2 = new PlayerIdentity();
        Player player2 = new Player().setIdentity(playerIdentity2);
        Game game = new Game()
            .addPlayer(player1)
            .addPlayer(player2);
        PlayerMatch playerMatch1 = new PlayerMatch().setPlayerIdentity(playerIdentity1);
        PlayerMatch playerMatch2 = new PlayerMatch().setPlayerIdentity(playerIdentity2);
        GameMatch gameMatch = new GameMatch()
            .setGame(game)
            .setCurrentPlayerIndex(1);
        Assert.assertEquals(gameMatch, gameMatch
            .addPlayerMatch(playerMatch1)
            .addPlayerMatch(playerMatch2)
        );
        Assert.assertEquals(new ArrayList<PlayerMatch>() {{
            add(playerMatch1);
            add(playerMatch2);
        }}, gameMatch.getPlayerMatches());
        Assert.assertEquals(playerMatch2, gameMatch.getCurrentPlayerMatch());
        Assert.assertEquals(gameMatch, gameMatch.removePlayerMatch(playerMatch1));
        Assert.assertEquals(new ArrayList<PlayerMatch>() {{
            add(playerMatch2);
        }}, gameMatch.getPlayerMatches());
        try {
            PlayerIdentity playerIdentity3 = new PlayerIdentity();
            Player player3 = new Player().setIdentity(playerIdentity3);
            game.addPlayer(player3);
            gameMatch.setCurrentPlayerIndex(2);
            gameMatch.getCurrentPlayerMatch();
            Assert.fail("A Not Found exception should be raised at this point");
        }
        catch(SummerException se) {
            Assert.assertEquals("Inconsistency between Game and GameMatch of id:0", se.getMessage());
        }
    }

    @Test
    public void advanceTurnInAGameMatch() {
        PlayerMatch playerMatch1 = new PlayerMatch();
        PlayerMatch playerMatch2 = new PlayerMatch();
        GameMatch gameMatch = new GameMatch()
            .addPlayerMatch(playerMatch1)
            .addPlayerMatch(playerMatch2)
            .setCurrentPlayerIndex(0);
        Assert.assertEquals(gameMatch, gameMatch.advanceOnePlayerTurn());
        Assert.assertEquals(1, gameMatch.getCurrentPlayerIndex());
        Assert.assertEquals(gameMatch, gameMatch.advanceOnePlayerTurn());
        Assert.assertEquals(0, gameMatch.getCurrentPlayerIndex());
    }

    @Test
    public void findGameMatchById() {
        GameMatch gameMatch = new GameMatch();
        dataManager.register("find", gameMatch, null, GameMatch.class, 1L);
        inTransaction(em->{
            Assert.assertEquals(gameMatch, GameMatch.find(em, 1L));
        });
    }

    @Test
    public void tryToFindUnknownGameMatchById() {
        dataManager.register("find", null, null, GameMatch.class, 1L);
        inTransaction(em->{
            try {
                GameMatch.find(em, 1L);
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Game Match with id 1", snfe.getMessage());
            }
        });
    }


    @Test
    public void findBannerByName() {
        GameMatch gameMatch = new GameMatch();
        dataManager.register("createQuery", null, null,
                "select gm from GameMatch gm where gm.game.id = :gameId");
        dataManager.register("setParameter", null, null,"gameId", 101L);
        dataManager.register("getSingleResult", gameMatch, null);
        inTransaction(em->{
            Assert.assertEquals(gameMatch, GameMatch.getByGame(em, 101L));
        });
    }

    @Test
    public void tryToFindAnUnknownBannerByName() {
        dataManager.register("createQuery", null, null,
                "select gm from GameMatch gm where gm.game.id = :gameId");
        dataManager.register("setParameter", null, null,"gameId", 101L);
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            Assert.assertNull(GameMatch.getByGame(em, 101L));
        });
    }

}
