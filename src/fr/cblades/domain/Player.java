package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
public class Player extends BaseEntity {

    @ManyToOne
    PlayerIdentity identity;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "player_id")
    List<Wing> wings = new ArrayList<>();

    public String getName() {
        return this.identity.getName();
    }

    public PlayerIdentity getIdentity() {
        return this.identity;
    }
    public Player setIdentity(PlayerIdentity identity) {
        this.identity = identity;
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

    public Wing getWing(String bannerName) {
        return this.wings.stream().filter(wing->bannerName.equals(wing.getBanner().getName())).findFirst().orElse(null);
    }

    public Unit getUnit(String name) {
        for (Wing wing: wings) {
            Unit unit = wing.getUnit(name);
            if (unit != null) return unit;
        }
        return null;
    }

    public Player duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Player player = (Player)duplications.get(this);
        if (player == null) {
            player = new Player().setIdentity(this.identity);
            for (Wing wing : this.wings) {
                player.addWing(wing.duplicate(em, duplications));
            }
            duplications.put(this, player);
            em.persist(player);
        }
        return player;
    }
}
