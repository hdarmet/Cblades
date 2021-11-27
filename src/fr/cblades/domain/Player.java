package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Entity
@Table(indexes=@Index(name="idx_player", unique=true, columnList="game_id, name"))
public class Player extends BaseEntity {

    String name="";
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "player_id")
    List<Wing> wings = new ArrayList<>();
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "player_id")
    List<Location> locations = new ArrayList<>();

    public String getName() {
        return this.name;
    }
    public Player setName(String name) {
        this.name = name;
        return this;
    }

    public List<Wing> getWings() {
        return Collections.unmodifiableList(this.wings);
    }
    public Player addWing(Wing wing) {
        this.wings.add(wing);
        return this;
    }
    public Player removeWing(Wing wing) {
        this.wings.remove(wing);
        return this;
    }

    public List<Location> getLocations() {
        return Collections.unmodifiableList(this.locations);
    }
    public Player addHex(Location location) {
        this.locations.add(location);
        return this;
    }
    public Player removeHex(Location location) {
        this.locations.remove(location);
        return this;
    }

    public Wing getWing(String banner) {
        return this.wings.stream().filter(wing->banner.equals(wing.getBanner())).findFirst().orElse(null);
    }

    public Unit getUnit(String name) {
        for (Wing wing: wings) {
            Unit unit = wing.getUnit(name);
            if (unit != null) return unit;
        }
        return null;
    }

}
