package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

@Entity
@DiscriminatorValue("unit")
public class Unit extends Piece implements Playable {

    String name;
    @Enumerated(EnumType.STRING)
    UnitCategory category;
    int steps;
    @Enumerated(EnumType.STRING)
    Tiredness tiredness;
    @Enumerated(EnumType.STRING)
    Ammunition ammunition;
    @Enumerated(EnumType.STRING)
    Cohesion cohesion;
    boolean engaging;
    boolean charging;
    boolean contact;
    boolean orderGiven;
    boolean played;
    @Transient
    Wing wing;

    @Override
    public String getName() {
        return this.name;
    }
    public Unit setName(String name) {
        this.name = name;
        if (wing!=null) wing.unitsByName = null;
        return this;
    }

    public UnitCategory getCategory() {
        return this.category;
    }
    public Unit setCategory(UnitCategory category) {
        this.category = category;
        return this;
    }

    public int getSteps() {
        return this.steps;
    }
    public Unit setSteps(int steps) {
        this.steps = steps;
        return this;
    }

    public Tiredness getTiredness() {
        return this.tiredness;
    }
    public Unit setTiredness(Tiredness tiredness) {
        this.tiredness = tiredness;
        return this;
    }

    public Ammunition getAmmunition() {
        return this.ammunition;
    }
    public Unit setAmmunition(Ammunition ammunition) {
        this.ammunition = ammunition;
        return this;
    }

    public Cohesion getCohesion() {
        return this.cohesion;
    }
    public Unit setCohesion(Cohesion cohesion) {
        this.cohesion = cohesion;
        return this;
    }

    public boolean isEngaging() {
        return this.engaging;
    }
    public Unit setEngaging(boolean engaging) {
        this.engaging = engaging;
        return this;
    }

    public boolean isCharging() {
        return this.charging;
    }
    public Unit setCharging(boolean charging) {
        this.charging = charging;
        return this;
    }

    public boolean isContact() {
        return this.contact;
    }
    public Unit setContact(boolean contact) {
        this.contact = contact;
        return this;
    }

    public boolean isOrderGiven() {
        return this.orderGiven;
    }
    public Unit setOrderGiven(boolean orderGiven) {
        this.orderGiven = orderGiven;
        return this;
    }

    @Override
    public boolean isPlayed() {
        return this.played;
    }
    @Override
    public Unit setPlayed(boolean played) {
        this.played = played;
        return this;
    }

    public Wing getWing() {
        return this.wing;
    }

    @Override
    public Unit duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Unit unit = (Unit)duplications.get(this);
        if (unit == null) {
            unit = new Unit().copy(this);
            duplications.put(this, unit);
            em.persist(unit);
        }
        return unit;
    }

    protected Unit copy(Unit unit) {
        super.copy(unit);
        this
            .setName(unit.name)
            .setCategory(unit.category)
            .setSteps(unit.steps)
            .setTiredness(unit.tiredness)
            .setAmmunition(unit.ammunition)
            .setCohesion(unit.cohesion)
            .setCharging(unit.charging)
            .setEngaging(unit.engaging)
            .setContact(unit.contact)
            .setOrderGiven(unit.orderGiven)
            .setPlayed(unit.played);
        return this;
    }

    public Unit setType(String type) {
        super.setType(type);
        return this;
    }
    public Unit setAngle(int angle) {
        super.setAngle(angle);
        return this;
    }
    public Unit setPositionCol(int positionCol) {
        super.setPositionCol(positionCol);
        return this;
    }
    public Unit setPositionRow(int positionRow) {
        super.setPositionRow(positionRow);
        return this;
    }
    public Unit setPositionAngle(Integer positionAngle) {
        super.setPositionAngle(positionAngle);
        return this;
    }

}
