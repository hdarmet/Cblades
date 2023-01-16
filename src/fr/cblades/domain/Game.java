package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
public class Game extends BaseEntity {

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "order_player")
    List<Player> players = new ArrayList<>();
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    Map map;

    public List<Player> getPlayers() {
        return Collections.unmodifiableList(this.players);
    }
    public Game addPlayer(Player player) {
        this.players.add(player);
        return this;
    }
    public Game removePlayer(Player player) {
        this.players.remove(player);
        return this;
    }

    public Player getPlayer(String name) {
        return this.players.stream().filter(player->name.equals(player.getName())).findFirst().orElse(null);
    }

    public Map getMap() {
        return this.map;
    }
    public Game setMap(Map map) {
        this.map = map;
        return this;
    }

    public Game duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Game game = new Game().setMap(this.map);
        for (Player player : players) {
            game.addPlayer(player.duplicate(em, duplications));
        }
        duplications.put(this, game);
        em.persist(game);
        return game;
    }
}
