package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.*;

@Entity
@Table(indexes=@Index(name="idx_wing", unique=true, columnList="player_id, banner"))
public class Wing extends BaseEntity {

    String banner="";
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "wing_id")
    List<Unit> units = new ArrayList<>();
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "wing_id")
    List<TargetHex> retreatZone = new ArrayList<>();
    @Transient
    Map<String, Unit> unitsByName;

    public String getBanner() {
        return this.banner;
    }
    public Wing setBanner(String banner) {
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

}
