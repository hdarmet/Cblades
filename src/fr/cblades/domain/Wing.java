package fr.cblades.domain;

import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.*;
import java.util.Map;

@Entity
@Table(indexes=@Index(name="idx_wing", columnList="player_id"))
public class Wing extends BaseEntity {

    @ManyToOne
    Banner banner;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "wing_id")
    List<Unit> units = new ArrayList<>();
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "wing_id")
    List<TargetHex> retreatZone = new ArrayList<>();
    @Transient
    Map<String, Unit> unitsByName;
    int tiredness = 11;
    int moral = 11;
    @OneToOne
    Unit leader = null;
    @Enumerated(EnumType.STRING)
    OrderInstruction orderInstruction;

    public Banner getBanner() {
        return this.banner;
    }
    public Wing setBanner(Banner banner) {
        this.banner = banner;
        return this;
    }

    public List<Unit> getUnits() {
        return Collections.unmodifiableList(this.units);
    }
    public Wing addUnit(Unit unit) {
        this.units.add(unit);
        unit.wing = this;
        unitsByName = null;
        return this;
    }
    public Wing removeUnit(Unit unit) {
        this.units.remove(unit);
        if (unit.wing == this) unit.wing = null;
        unitsByName = null;
        return this;
    }

    public Unit getUnit(String name) {
        if (unitsByName==null) {
            unitsByName = new HashMap<>();
            for (Unit unit : units) {
                unitsByName.put(unit.getName(), unit);
            }
        }
        return unitsByName.get(name);
    }

    public List<TargetHex> getRetreatZone() {
        return Collections.unmodifiableList(this.retreatZone);
    }
    public Wing addToRetreatZone(TargetHex targetHex) {
        this.retreatZone.add(targetHex);
        return this;
    }
    public Wing removeFromRetreatZone(TargetHex targetHex) {
        this.retreatZone.remove((targetHex));
        return this;
    }

    public int getTiredness() {
        return this.tiredness;
    }
    public Wing setTiredness(int tiredness) {
        this.tiredness = tiredness;
        return this;
    }

    public int getMoral() {
        return this.moral;
    }
    public Wing setMoral(int moral) {
        this.moral = moral;
        return this;
    }

    public Unit getLeader() {
        return this.leader;
    }
    public Wing setLeader(Unit leader) {
        this.leader = leader;
        return this;
    }

    public OrderInstruction getOrderInstruction() {
        return this.orderInstruction;
    }
    public Wing setOrderInstruction(OrderInstruction orderInstruction) {
        this.orderInstruction = orderInstruction;
        return this;
    }

    public Wing duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Wing wing = new Wing()
            .setBanner(this.banner)
            .setMoral(this.moral)
            .setTiredness(this.tiredness)
            .setOrderInstruction(this.orderInstruction);
        for (Unit unit : this.units) {
            wing.addUnit(unit.duplicate(em, duplications));
        }
        for (TargetHex hex : this.retreatZone) {
            wing.addToRetreatZone(hex.duplicate(em, duplications));
        }
        wing.setLeader((Unit)duplications.get(this.leader));
        duplications.put(this, wing);
        em.persist(wing);
        return wing;
    }

    static public Wing findWing(EntityManager em, Unit unit) {
        Wing wing = (Wing)em.createQuery("select w from Wing w where :unit member of w.units")
            .setParameter("unit", unit).getSingleResult();
        if (wing==null) {
            throw new SummerNotFoundException(
                String.format("No Wing contains unit of %d", unit.getId())
            );
        }
        return wing;
    }

    static public Wing findWing(Game game, Unit unit) {
        for (Player player : game.getPlayers()) {
            for (Wing wing : player.getWings()) {
                if (wing.getUnits().contains(unit)) return wing;
            }
        }
        return null;
    }
}
