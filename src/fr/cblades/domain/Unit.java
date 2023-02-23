package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

@Entity
@Table(indexes=@Index(name="idx_unit", unique=true, columnList="wing_id, name"))
public class Unit extends BaseEntity {

    String name;
    @Enumerated(EnumType.STRING)
    UnitCategory category;
    String type;
    int angle;
    int positionCol;
    int positionRow;
    Integer positionAngle;
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
    @Transient
    Map<String, Object> attributes = new HashMap<>();

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

    public String getType() {
        return this.type;
    }
    public Unit setType(String type) {
        this.type = type;
        return this;
    }

    public int getAngle() {
        return this.angle;
    }
    public Unit setAngle(int angle) {
        this.angle = angle;
        return this;
    }

    public int getPositionCol() {
        return this.positionCol;
    }
    public Unit setPositionCol(int positionCol) {
        this.positionCol = positionCol;
        return this;
    }

    public int getPositionRow() {
        return this.positionRow;
    }
    public Unit setPositionRow(int positionRow) {
        this.positionRow = positionRow;
        return this;
    }

    public int getPositionAngle() {
        return this.positionAngle;
    }
    public Unit setPositionAngle(Integer positionAngle) {
        this.positionAngle = positionAngle;
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

    public boolean isPlayed() {
        return this.played;
    }
    public Unit setPlayed(boolean played) {
        this.played = played;
        return this;
    }

    public Unit duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Unit unit = new Unit()
            .setName(name)
            .setCategory(category)
            .setType(type)
            .setAngle(angle)
            .setPositionCol(positionCol)
            .setPositionRow(positionRow)
            .setPositionAngle(positionAngle)
            .setSteps(steps)
            .setTiredness(tiredness)
            .setAmmunition(ammunition)
            .setCohesion(cohesion)
            .setCharging(charging)
            .setContact(contact)
            .setOrderGiven(orderGiven)
            .setPlayed(played);
        duplications.put(this, unit);
        em.persist(unit);
        return unit;
    }

    public java.util.Map<String, Object> getAttrs() { return this.attributes; }
    public Unit setAttrs(java.util.Map<String, Object> attrs) {
        this.attributes = attrs;
        return this;
    }
    public Object getAttr(String path) {
        Map<String, Object> attrs = this.attributes;
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            attrs = (Map<String, Object>) attrs.get(names[index]);
            if (attrs==null) return null;
        }
        return attrs.get(names[names.length-1]);
    }
    public Unit setAttr(String path, Object value) {
        Map<String, Object> attrs = this.attributes;
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            attrs = (Map<String, Object>) attrs.get(names[index]);
            if (attrs==null) attrs=new HashMap<>();
        }
        attrs.put(names[names.length-1], value);
        return this;
    }

}
