package fr.cblades.domain;

import fr.cblades.game.SequenceVisitor;
import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="type")
public abstract class SequenceElement extends BaseEntity {

    @Entity
    @DiscriminatorValue("State")
    public static abstract class StateSequenceElement extends SequenceElement {

        String unit;
        Cohesion cohesion = Cohesion.GOOD_ORDER;
        Tiredness tiredness = Tiredness.FRESH;
        Ammunition ammunition = Ammunition.PLENTIFUL;
        Charging charging = Charging.NONE;
        boolean engaging = false;
        boolean orderGiven = false;
        boolean played = false;

        public String getUnit() { return this.unit; }
        public StateSequenceElement setUnit(String unit) {
            this.unit = unit;
            return this;
        }

        public Cohesion getCohesion() {
            return this.cohesion;
        }
        public StateSequenceElement setCohesion(Cohesion cohesion) {
            this.cohesion = cohesion;
            return this;
        }

        public Tiredness getTiredness() {
            return this.tiredness;
        }
        public StateSequenceElement setTiredness(Tiredness tiredness) {
            this.tiredness = tiredness;
            return this;
        }

        public Ammunition getAmmunition() {
            return this.ammunition;
        }
        public StateSequenceElement setAmmunition(Ammunition ammunition) {
            this.ammunition = ammunition;
            return this;
        }

        public Charging getCharging() {
            return this.charging;
        }
        public StateSequenceElement setCharging(Charging charging) {
            this.charging = charging;
            return this;
        }

        public boolean isEngaging() {
            return this.engaging;
        }
        public StateSequenceElement setEngaging(boolean engaging) {
            this.engaging = engaging;
            return this;
        }

        public boolean hasGivenOrder() {
            return this.orderGiven;
        }
        public StateSequenceElement setGivenOrder(boolean orderGiven) {
            this.orderGiven = orderGiven;
            return this;
        }

        public boolean isPlayed() {
            return this.played;
        }
        public StateSequenceElement setPlayed(boolean played) {
            this.played = played;
            return this;
        }

    }

    @Entity
    @DiscriminatorValue("Move")
    public static class MoveSequenceElement extends StateSequenceElement {

        int hexCol;
        int hexRow;
        int hexAngle;
        Stacking stacking;

        public int getHexCol() {
            return this.hexCol;
        }
        public MoveSequenceElement setHexCol(int hexCol) {
            this.hexCol = hexCol;
            return this;
        }

        public int getHexRow() {
            return this.hexRow;
        }
        public MoveSequenceElement setHexRow(int hexRow) {
            this.hexRow = hexRow;
            return this;
        }

        public int getHexAngle() {
            return this.hexAngle;
        }
        public MoveSequenceElement setHexAngle(int hexAngle) {
            this.hexAngle = hexAngle;
            return this;
        }

        public Stacking getStacking() {
            return this.stacking;
        }
        public MoveSequenceElement setStacking(Stacking stacking) {
            this.stacking = stacking;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Rotate")
    public static class RotateSequenceElement extends StateSequenceElement {

        int angle;

        public int getAngle() {
            return this.angle;
        }
        public RotateSequenceElement setAngle(int angle) {
            this.angle = angle;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Reorient")
    public static class ReorientSequenceElement extends StateSequenceElement {

        int angle;

        public int getAngle() {
            return this.angle;
        }
        public ReorientSequenceElement setAngle(int angle) {
            this.angle = angle;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Turn")
    public static class TurnSequenceElement extends StateSequenceElement {

        int angle;
        int hexCol;
        int hexRow;
        int hexAngle;
        Stacking stacking;

        public int getAngle() {
            return this.angle;
        }
        public TurnSequenceElement setAngle(int angle) {
            this.angle = angle;
            return this;
        }

        public int getHexCol() {
            return this.hexCol;
        }
        public TurnSequenceElement setHexCol(int hexCol) {
            this.hexCol = hexCol;
            return this;
        }

        public int getHexRow() {
            return this.hexRow;
        }
        public TurnSequenceElement setHexRow(int hexRow) {
            this.hexRow = hexRow;
            return this;
        }

        public int getHexAngle() {
            return this.hexAngle;
        }
        public TurnSequenceElement setHexAngle(int hexAngle) {
            this.hexAngle = hexAngle;
            return this;
        }

        public Stacking getStacking() {
            return this.stacking;
        }
        public TurnSequenceElement setStacking(Stacking stacking) {
            this.stacking = stacking;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("NextTurn")
    public static class NextTurnSequenceElement extends SequenceElement {

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

        public boolean isTurnClosed() {
            return true;
        }

    }

    public abstract void accept(SequenceVisitor visitor);

    public boolean isTurnClosed() {
        return false;
    }

}
