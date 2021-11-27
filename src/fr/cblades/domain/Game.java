package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes=@Index(name="idx_game", unique=true, columnList="name"))
public class Game extends BaseEntity {

    String name="";
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "game_id")
    List<Player> players = new ArrayList<>();

    public String getName() {
        return this.name;
    }
    public Game setName(String name) {
        this.name = name;
        return this;
    }

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

}
