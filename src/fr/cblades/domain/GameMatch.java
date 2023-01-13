package fr.cblades.domain;

import org.summer.data.BaseEntity;

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

    public Account getAuthor() {
        return this.author;
    }
    public GameMatch setAuthor(Account author) {
        this.author = author;
        return this;
    }

}
