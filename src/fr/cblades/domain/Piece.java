package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.HashMap;
import java.util.Map;

@Entity
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="pieceType")
public abstract class Piece extends BaseEntity {

    int angle;
    int positionCol;
    int positionRow;
    Integer positionAngle;
    @Transient
    Map<String, Object> attributes = new HashMap<>();

    public int getAngle() {
        return this.angle;
    }
    public Piece setAngle(int angle) {
        this.angle = angle;
        return this;
    }

    public int getPositionCol() {
        return this.positionCol;
    }
    public Piece setPositionCol(int positionCol) {
        this.positionCol = positionCol;
        return this;
    }

    public int getPositionRow() {
        return this.positionRow;
    }
    public Piece setPositionRow(int positionRow) {
        this.positionRow = positionRow;
        return this;
    }

    public Integer getPositionAngle() {
        return this.positionAngle;
    }
    public Piece setPositionAngle(Integer positionAngle) {
        this.positionAngle = positionAngle;
        return this;
    }

    protected Piece copy(Piece piece) {
        this.setAngle(piece.angle)
            .setPositionCol(piece.positionCol)
            .setPositionRow(piece.positionRow)
            .setPositionAngle(piece.positionAngle);
        return this;
    }

    public Map<String, Object> getAttrs() { return this.attributes; }
    public Piece setAttrs(Map<String, Object> attrs) {
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
    public Piece setAttr(String path, Object value) {
        Map<String, Object> attrs = this.attributes;
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            Map<String, Object> lattrs = (Map<String, Object>) attrs.get(names[index]);
            if (lattrs==null) {
                lattrs=new HashMap<>();
                attrs.put(names[index], lattrs);
            }
            attrs = lattrs;
        }
        attrs.put(names[names.length-1], value);
        return this;
    }

    public abstract Piece duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications);
}
