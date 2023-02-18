package fr.cblades.domain;

import fr.cblades.game.SequenceVisitor;
import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="type", length=63)
public abstract class SequenceElement extends BaseEntity {

    @Entity
    public static abstract class ExecutableSequenceElement extends SequenceElement {
    }

    @Entity
    public static abstract class AskSequenceElement extends SequenceElement {
    }

    @Entity
    @DiscriminatorValue("State")
    public static class StateSequenceElement extends ExecutableSequenceElement {

        String unit;
        int steps;
        @Enumerated(EnumType.STRING)
        Cohesion cohesion = Cohesion.GOOD_ORDER;
        @Enumerated(EnumType.STRING)
        Tiredness tiredness = Tiredness.FRESH;
        @Enumerated(EnumType.STRING)
        Ammunition ammunition = Ammunition.PLENTIFUL;
        @Enumerated(EnumType.STRING)
        Charging charging = Charging.NONE;
        Boolean engaging = false;
        Boolean orderGiven = false;
        Boolean disruptChecked = false;
        Boolean routChecked = false;
        Boolean neighborsCohesionLoss = false;
        Boolean defenderEngagementChecking = false;
        Boolean attackerEngagementChecking = false;
        Boolean played = false;
        Double movementPoints;
        Double extendedMovementPoints;
        String actionType;
        Integer actionMode;

        public String getUnit() { return this.unit; }
        public StateSequenceElement setUnit(String unit) {
            this.unit = unit;
            return this;
        }

        public int getSteps() {
            return this.steps;
        }
        public StateSequenceElement setSteps(int steps) {
            this.steps = steps;
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

        public Boolean isEngaging() {
            return this.engaging;
        }
        public StateSequenceElement setEngaging(Boolean engaging) {
            this.engaging = engaging;
            return this;
        }

        public Boolean hasGivenOrder() {
            return this.orderGiven;
        }
        public StateSequenceElement setGivenOrder(Boolean orderGiven) {
            this.orderGiven = orderGiven;
            return this;
        }

        public Boolean isDisruptChecked() {
            return this.disruptChecked;
        }
        public StateSequenceElement setDisruptChecked(Boolean disruptChecked) {
            this.disruptChecked = disruptChecked;
            return this;
        }

        public Boolean isRoutChecked() {
            return this.routChecked;
        }
        public StateSequenceElement setRoutChecked(Boolean routChecked) {
            this.routChecked = routChecked;
            return this;
        }

        public Boolean isNeighborsCohesionLoss() {
            return this.neighborsCohesionLoss;
        }
        public StateSequenceElement setNeighborsCohesionLoss(Boolean neighborsCohesionLoss) {
            this.neighborsCohesionLoss = neighborsCohesionLoss;
            return this;
        }

        public Boolean isDefenderEngagementChecking() {
            return this.defenderEngagementChecking;
        }
        public StateSequenceElement setDefenderEngagementChecking(Boolean defenderEngagementChecking) {
            this.defenderEngagementChecking = defenderEngagementChecking;
            return this;
        }

        public Boolean isAttackerEngagementChecking() {
            return this.attackerEngagementChecking;
        }
        public StateSequenceElement setAttackerEngagementChecking(Boolean attackerEngagementChecking) {
            this.attackerEngagementChecking = attackerEngagementChecking;
            return this;
        }

        public Boolean isPlayed() {
            return this.played;
        }
        public StateSequenceElement setPlayed(Boolean played) {
            this.played = played;
            return this;
        }

        public Double getMovementPoints() {
            return this.movementPoints;
        }
        public StateSequenceElement setMovementPoints(Double movementPoints) {
            this.movementPoints = movementPoints;
            return this;
        }

        public Double getExtendedMovementPoints() {
            return this.extendedMovementPoints;
        }
        public StateSequenceElement setExtendedMovementPoints(Double extendedMovementPoints) {
            this.extendedMovementPoints = extendedMovementPoints;
            return this;
        }

        public String getActionType() {
            return this.actionType;
        }
        public StateSequenceElement setActionType(String actionType) {
            this.actionType = actionType;
            return this;
        }

        public Integer getActionMode() {
            return this.actionMode;
        }
        public StateSequenceElement setActionMode(Integer actionMode) {
            this.actionMode = actionMode;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Move")
    public static class MoveSequenceElement extends StateSequenceElement {

        int hexCol;
        int hexRow;
        Integer hexAngle=null;
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

        public Integer getHexAngle() {
            return this.hexAngle;
        }
        public MoveSequenceElement setHexAngle(Integer hexAngle) {
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
        Integer hexAngle=null;
        @Enumerated(EnumType.STRING)
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

        public Integer getHexAngle() {
            return this.hexAngle;
        }
        public TurnSequenceElement setHexAngle(Integer hexAngle) {
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
    public static class NextTurnSequenceElement extends ExecutableSequenceElement {

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

        public boolean isTurnClosed() {
            return true;
        }

    }

    @Entity
    @DiscriminatorValue("Rest")
    public static class RestSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public RestSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public RestSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Refill")
    public static class RefillSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public RefillSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public RefillSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Rally")
    public static class RallySequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public RallySequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public RallySequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Reorganize")
    public static class ReorganizeSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public ReorganizeSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public ReorganizeSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("LossConsistency")
    public static class LossConsistencySequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public LossConsistencySequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public LossConsistencySequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Crossing")
    public static class CrossingSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public CrossingSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public CrossingSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("AttackerEngagement")
    public static class AttackerEngagementSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public AttackerEngagementSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public AttackerEngagementSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("DefenderEngagement")
    public static class DefenderEngagementSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public DefenderEngagementSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public DefenderEngagementSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Disengagement")
    public static class DisengagementSequenceElement extends StateSequenceElement {

        int dice1;
        int dice2;

        public int getDice1() {
            return this.dice1;
        }
        public DisengagementSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public DisengagementSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Try2ChangeOInst")
    public static class Try2ChangeOrderInstructionSequenceElement extends AskSequenceElement {

        String leader;
        int dice1;
        int dice2;

        public String getLeader() {
            return this.leader;
        }
        public Try2ChangeOrderInstructionSequenceElement setLeader(String leader) {
            this.leader = leader;
            return this;
        }

        public int getDice1() {
            return this.dice1;
        }
        public Try2ChangeOrderInstructionSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public Try2ChangeOrderInstructionSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Try2TakeCommand")
    public static class Try2TakeCommandSequenceElement extends ExecutableSequenceElement {

        String leader;
        int dice1;
        int dice2;

        public String getLeader() {
            return this.leader;
        }
        public Try2TakeCommandSequenceElement setLeader(String leader) {
            this.leader = leader;
            return this;
        }

        public int getDice1() {
            return this.dice1;
        }
        public Try2TakeCommandSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public Try2TakeCommandSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Try2DismissCommand")
    public static class Try2DismissCommandSequenceElement extends ExecutableSequenceElement {

        String leader;
        int dice1;
        int dice2;

        public String getLeader() {
            return this.leader;
        }
        public Try2DismissCommandSequenceElement setLeader(String leader) {
            this.leader = leader;
            return this;
        }

        public int getDice1() {
            return this.dice1;
        }
        public Try2DismissCommandSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public Try2DismissCommandSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("GiveOrders")
    public static class GiveOrdersSequenceElement extends ExecutableSequenceElement {

        String leader;
        int dice1;
        int dice2;

        public String getLeader() {
            return this.leader;
        }
        public GiveOrdersSequenceElement setLeader(String leader) {
            this.leader = leader;
            return this;
        }

        public int getDice1() {
            return this.dice1;
        }
        public GiveOrdersSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public GiveOrdersSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("ManageCommand")
    public static class ManageCommandSequenceElement extends ExecutableSequenceElement {

        String leader;
        boolean inCommand;

        public String getLeader() {
            return this.leader;
        }
        public ManageCommandSequenceElement setLeader(String leader) {
            this.leader = leader;
            return this;
        }

        public boolean getInCommand() {
            return this.inCommand;
        }
        public ManageCommandSequenceElement setInCommand(boolean inCommand) {
            this.inCommand = inCommand;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("ChangeOInst")
    public static class ChangeOrderInstructionSequenceElement extends ExecutableSequenceElement {

        String leader;
        @Enumerated(EnumType.STRING)
        OrderInstruction orderInstruction;

        public String getLeader() {
            return this.leader;
        }
        public ChangeOrderInstructionSequenceElement setLeader(String leader) {
            this.leader = leader;
            return this;
        }

        public OrderInstruction getOrderInstruction() {
            return this.orderInstruction;
        }
        public ChangeOrderInstructionSequenceElement setOrderInstruction(OrderInstruction orderInstruction) {
            this.orderInstruction = orderInstruction;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("ShockAttack")
    public static class ShockAttackSequenceElement extends StateSequenceElement {

        int attackerHexCol;
        int attackerHexRow;
        String defender;
        int defenderHexCol;
        int defenderHexRow;
        boolean supported;
        int advantage;
        int dice1;
        int dice2;

        public int getAttackerHexCol() {
            return this.attackerHexCol;
        }
        public ShockAttackSequenceElement setAttackerHexCol(int attackerHexCol) {
            this.attackerHexCol = attackerHexCol;
            return this;
        }

        public int getAttackerHexRow() {
            return this.attackerHexRow;
        }
        public ShockAttackSequenceElement setAttackerHexRow(int attackerHexRow) {
            this.attackerHexRow = attackerHexRow;
            return this;
        }

        public String getDefender() {
            return this.defender;
        }
        public ShockAttackSequenceElement setDefender(String defender) {
            this.defender = defender;
            return this;
        }

        public int getDefenderHexCol() {
            return this.defenderHexCol;
        }
        public ShockAttackSequenceElement setDefenderHexCol(int defenderHexCol) {
            this.defenderHexCol = defenderHexCol;
            return this;
        }

        public int getDefenderHexRow() {
            return this.defenderHexRow;
        }
        public ShockAttackSequenceElement setDefenderHexRow(int defenderHexRow) {
            this.defenderHexRow = defenderHexRow;
            return this;
        }

        public int getAdvantage() {
            return this.advantage;
        }
        public ShockAttackSequenceElement setAdvantage(int advantage) {
            this.advantage = advantage;
            return this;
        }

        public boolean getSupported() {
            return this.supported;
        }
        public ShockAttackSequenceElement setSupported(boolean supported) {
            this.supported = supported;
            return this;
        }

        public int getDice1() {
            return this.dice1;
        }
        public ShockAttackSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public ShockAttackSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }
    }

    @Entity
    @DiscriminatorValue("FireAttack")
    public static class FireAttackSequenceElement extends StateSequenceElement {

        int attackerHexCol;
        int attackerHexRow;
        String defender;
        int defenderHexCol;
        int defenderHexRow;
        int advantage;
        int dice1;
        int dice2;

        public int getAttackerHexCol() {
            return this.attackerHexCol;
        }
        public FireAttackSequenceElement setAttackerHexCol(int attackerHexCol) {
            this.attackerHexCol = attackerHexCol;
            return this;
        }

        public int getAttackerHexRow() {
            return this.attackerHexRow;
        }
        public FireAttackSequenceElement setAttackerHexRow(int attackerHexRow) {
            this.attackerHexRow = attackerHexRow;
            return this;
        }

        public String getDefender() {
            return this.defender;
        }
        public FireAttackSequenceElement setDefender(String defender) {
            this.defender = defender;
            return this;
        }

        public int getDefenderHexCol() {
            return this.defenderHexCol;
        }
        public FireAttackSequenceElement setDefenderHexCol(int defenderHexCol) {
            this.defenderHexCol = defenderHexCol;
            return this;
        }

        public int getDefenderHexRow() {
            return this.defenderHexRow;
        }
        public FireAttackSequenceElement setDefenderHexRow(int defenderHexRow) {
            this.defenderHexRow = defenderHexRow;
            return this;
        }

        public int getAdvantage() {
            return this.advantage;
        }
        public FireAttackSequenceElement setAdvantage(int advantage) {
            this.advantage = advantage;
            return this;
        }

        public int getDice1() {
            return this.dice1;
        }
        public FireAttackSequenceElement setDice1(int dice1) {
            this.dice1 = dice1;
            return this;
        }

        public int getDice2() {
            return this.dice1;
        }
        public FireAttackSequenceElement setDice2(int dice2) {
            this.dice2 = dice2;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }
    }

    @Entity
    @DiscriminatorValue("Ask4Retreat")
    public static class Ask4RetreatSequenceElement extends AskSequenceElement {

        String unit;
        String attacker;
        int losses;
        boolean advance;

        public String getUnit() {
            return this.unit;
        }
        public Ask4RetreatSequenceElement setUnit(String unit) {
            this.unit = unit;
            return this;
        }

        public String getAttacker() {
            return this.attacker;
        }
        public Ask4RetreatSequenceElement setAttacker(String attacker) {
            this.attacker = attacker;
            return this;
        }

        public int getLosses() {
            return this.losses;
        }
        public Ask4RetreatSequenceElement setLosses(int losses) {
            this.losses = losses;
            return this;
        }

        public boolean getAdvance() {
            return this.advance;
        }
        public Ask4RetreatSequenceElement setAdvance(boolean advance) {
            this.advance = advance;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }

    }

    @Entity
    @DiscriminatorValue("Retreat")
    public static class RetreatSequenceElement extends StateSequenceElement {

        int hexCol;
        int hexRow;
        Integer hexAngle=null;
        Stacking stacking;
        long askRequest;

        public int getHexCol() {
            return this.hexCol;
        }
        public RetreatSequenceElement setHexCol(int hexCol) {
            this.hexCol = hexCol;
            return this;
        }

        public int getHexRow() {
            return this.hexRow;
        }
        public RetreatSequenceElement setHexRow(int hexRow) {
            this.hexRow = hexRow;
            return this;
        }

        public Integer getHexAngle() {
            return this.hexAngle;
        }
        public RetreatSequenceElement setHexAngle(Integer hexAngle) {
            this.hexAngle = hexAngle;
            return this;
        }

        public Stacking getStacking() {
            return this.stacking;
        }
        public RetreatSequenceElement setStacking(Stacking stacking) {
            this.stacking = stacking;
            return this;
        }

        public long getAskRequest() {
            return this.askRequest;
        }
        public RetreatSequenceElement setAskRequest(long askRequest) {
            this.askRequest = askRequest;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }
    }

    @Entity
    @DiscriminatorValue("Advance")
    public static class AdvanceSequenceElement extends StateSequenceElement {

        int hexCol;
        int hexRow;
        Integer hexAngle=null;
        Stacking stacking;

        public int getHexCol() {
            return this.hexCol;
        }
        public AdvanceSequenceElement setHexCol(int hexCol) {
            this.hexCol = hexCol;
            return this;
        }

        public int getHexRow() {
            return this.hexRow;
        }
        public AdvanceSequenceElement setHexRow(int hexRow) {
            this.hexRow = hexRow;
            return this;
        }

        public Integer getHexAngle() {
            return this.hexAngle;
        }
        public AdvanceSequenceElement setHexAngle(Integer hexAngle) {
            this.hexAngle = hexAngle;
            return this;
        }

        public Stacking getStacking() {
            return this.stacking;
        }
        public AdvanceSequenceElement setStacking(Stacking stacking) {
            this.stacking = stacking;
            return this;
        }

        public void accept(SequenceVisitor visitor) {
            visitor.visit(this);
        }
    }

    public abstract void accept(SequenceVisitor visitor);

    public boolean isTurnClosed() {
        return false;
    }

}
