package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.HashMap;
import java.util.Map;

@Entity
@Inheritance
@DiscriminatorValue("token")
public class Token extends Piece implements Playable {

    String type;
    String wizard;
    Integer level;
    Boolean density;
    Boolean fire;
    boolean played;

    public String getType() {
        return this.type;
    }
    public Token setType(String type) {
        this.type = type;
        return this;
    }

    public String getWizard() {
        return this.wizard;
    }
    public Token setWizard(String wizard) {
        this.wizard = wizard;
        return this;
    }

    public Integer getLevel() {
        return this.level;
    }
    public Token setLevel(Integer level) {
        this.level = level;
        return this;
    }

    public Boolean getDensity() {
        return this.density;
    }
    public Token setDensity(Boolean density) {
        this.density = density;
        return this;
    }

    public Boolean getFire() {
        return this.fire;
    }
    public Token setFire(Boolean fire) {
        this.fire = fire;
        return this;
    }

    public Token setAngle(int angle) {
        super.setAngle(angle);
        return this;
    }
    public Token setPositionCol(int positionCol) {
        super.setPositionCol(positionCol);
        return this;
    }
    public Token setPositionRow(int positionRow) {
        super.setPositionRow(positionRow);
        return this;
    }
    public Token setPositionAngle(Integer positionAngle) {
        super.setPositionAngle(positionAngle);
        return this;
    }

    @Override
    public boolean isPlayed() {
        return this.played;
    }
    @Override
    public Token setPlayed(boolean played) {
        this.played = played;
        return this;
    }

    public Token setAttrs(Map<String, Object> attrs) {
        super.setAttrs(attrs);
        return this;
    }
    public Token setAttr(String path, Object value) {
        super.setAttr(path, value);
        return this;
    }

    @Override
    public Token duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Token token = (Token)duplications.get(this);
        if (token == null) {
            token = new Token().copy(this);
            duplications.put(this, token);
            em.persist(token);
        }
        return token;
    }

    protected Token copy(Token token) {
        super.copy(token);
        this
            .setType(token.type)
            .setPositionCol(token.getPositionCol())
            .setPositionRow(token.getPositionRow())
            .setPositionAngle(token.getPositionAngle())
            .setAngle(token.getAngle())
            .setLevel(token.getLevel())
            .setFire(token.getFire())
            .setDensity(token.getDensity())
            .setWizard(token.getWizard());
        return this;
    }

    public static String FIRE = "fire";
    public static String SMOKE = "smoke";
}
