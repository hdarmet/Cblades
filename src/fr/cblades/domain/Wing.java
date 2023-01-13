package fr.cblades.domain;

import org.summer.data.BaseEntity;

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

    public Wing duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Wing wing = new Wing().setBanner(this.banner);
        for (Unit unit : this.units) {
            this.addUnit(unit.duplicate(em, duplications));
        }
        for (TargetHex hex : this.retreatZone) {
            this.addToRetreatZone(hex.duplicate(em, duplications));
        }
        duplications.put(this, wing);
        em.persist(wing);
        return wing;
    }
}
