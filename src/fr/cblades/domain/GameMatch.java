package fr.cblades.domain;

import org.summer.SummerException;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.Map;
import java.util.*;

@Entity
@Table(indexes = {
    @Index(name = "idx_gmatch_scenario", columnList = "scenario_id"),
    @Index(name = "idx_gmatch_account", columnList = "author_id")
})
public class GameMatch extends BaseEntity {

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    Game game;
    @OneToOne
    Scenario scenario;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "gamematch_id")
    List<PlayerMatch> playerMatches = new ArrayList<>();
    @ManyToOne
    Account author;
    @Enumerated(EnumType.STRING)
    GameMatchStatus status;
    int currentPlayerIndex = 0;
    int currentTurn = 0;

    public Game getGame() {
        return this.game;
    }
    public GameMatch setGame(Game game) {
        this.game = game;
        return this;
    }

    public Scenario getScenario() {
        return this.scenario;
    }
    public GameMatch setScenario(Scenario scenario) {
        this.scenario = scenario;
        return this;
    }

    public List<PlayerMatch> getPlayerMatches() {
        return Collections.unmodifiableList(this.playerMatches);
    }
    public GameMatch addPlayerMatch(PlayerMatch playerMatch) {
        this.playerMatches.add(playerMatch);
        return this;
    }
    public GameMatch removePlayerMatch(PlayerMatch playerMatch) {
        this.playerMatches.remove(playerMatch);
        return this;
    }
    public PlayerMatch getCurrentPlayerMatch() {
        PlayerIdentity identity = this.getGame().getPlayers().get(this.currentPlayerIndex).getIdentity();
        for (PlayerMatch playerMatch : this.getPlayerMatches()) {
            if (playerMatch.getPlayerIdentity()==identity) return playerMatch;
        }
        throw new SummerException("Inconsistency between Game and GameMatch of id:"+this.getGame().getId());
    }

    public Account getAuthor() {
        return this.author;
    }
    public GameMatch setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public GameMatchStatus getStatus() {
        return this.status;
    }
    public GameMatch setStatus(GameMatchStatus status) {
        this.status = status;
        return this;
    }

    public int getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }
    public GameMatch setCurrentPlayerIndex(int currentPlayerIndex) {
        this.currentPlayerIndex = currentPlayerIndex;
        return this;
    }

    public int getCurrentTurn() {
        return this.currentTurn;
    }
    public GameMatch setCurrentTurn(int currentTurn) {
        this.currentTurn = currentTurn;
        return this;
    }

    public GameMatch advanceOnePlayerTurn() {
        this.currentPlayerIndex++;
        if (this.currentPlayerIndex==this.playerMatches.size()) {
            this.currentPlayerIndex=0;
            this.currentTurn++;
        }
        return this;
    }

    static public GameMatch find(EntityManager em, long id) {
        GameMatch gameMatch = em.find(GameMatch.class, id);
        if (gameMatch==null) {
            throw new SummerNotFoundException(
                    String.format("Unknown Game Match with id %d", id)
            );
        }
        return gameMatch;
    }

    public static GameMatch getByGame(EntityManager em, long gameId) {
        Query query = em.createQuery("select gm from GameMatch gm where gm.game.id = :gameId");
        query.setParameter("gameId", gameId);
        try {
            return (GameMatch)query.getSingleResult();
        }
        catch (NoResultException nre) {
            return null;
        }
    }

}
