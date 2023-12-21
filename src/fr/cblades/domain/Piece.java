package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.HashMap;
import java.util.Map;

@Entity
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="pieceType")
public abstract class Piece extends BaseEntity {

    String type;
    int angle;
    int positionCol;
    int positionRow;
    Integer positionAngle;

    public abstract String getName();

    public String getType() {
        return this.type;
    }
    public Piece setType(String type) {
        this.type = type;
        return this;
    }

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
        this
            .setAngle(piece.angle)
            .setType(piece.type)
            .setPositionCol(piece.positionCol)
            .setPositionRow(piece.positionRow)
            .setPositionAngle(piece.positionAngle);
        return this;
    }

    public abstract Piece duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications);
}
