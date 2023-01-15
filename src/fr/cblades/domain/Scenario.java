package fr.cblades.domain;

import org.hibernate.annotations.LazyToOne;
import org.hibernate.annotations.LazyToOneOption;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_scenario_by_title", unique=true, columnList="title")
})
public class Scenario extends BaseEntity {

    String title="";
    @Column(length = 2000)
    String story="";
    @Column(length = 2000)
    String setUp="";
    @Column(length = 2000)
    String victoryConditions="";
    @Column(length = 2000)
    String specialRules="";
    String illustration ="";
    @Enumerated(EnumType.STRING)
    ScenarioStatus status;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    Game game;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getTitle() {
        return this.title;
    }
    public Scenario setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getStory() {
        return this.story;
    }
    public Scenario setStory(String story) {
        this.story = story;
        return this;
    }

    public String getSetUp() {
        return this.setUp;
    }
    public Scenario setSetUp(String setUp) {
        this.setUp = setUp;
        return this;
    }

    public String getVictoryConditions() {
        return this.victoryConditions;
    }
    public Scenario setVictoryConditions(String victoryConditions) {
        this.victoryConditions = victoryConditions;
        return this;
    }

    public String getSpecialRules() {
        return this.specialRules;
    }
    public Scenario setSpecialRules(String specialRules) {
        this.specialRules = specialRules;
        return this;
    }

    public String getIllustration() {
        return this.illustration;
    }
    public Scenario setIllustration(String illustration) {
        this.illustration = illustration;
        return this;
    }

    public ScenarioStatus getStatus() {
        return this.status;
    }
    public Scenario setStatus(ScenarioStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Scenario setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public Game getGame() {
        return this.game;
    }
    public Scenario setGame(Game game) {
        this.game = game;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Scenario addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Scenario removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

    static public Scenario find(EntityManager em, long id) {
        Scenario theme = em.find(Scenario.class, id);
        if (theme==null) {
            throw new SummerNotFoundException(
                String.format("Unknown Theme with id %d", id)
            );
        }
        return theme;
    }

}
