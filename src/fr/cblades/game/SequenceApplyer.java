package fr.cblades.game;

import fr.cblades.domain.*;

import javax.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class SequenceApplyer implements SequenceVisitor  {

    public SequenceApplyer(EntityManager em, Game game) {
        this.game = game;
        this.em = em;
        this.units = new HashMap<>();
        this.players = new HashMap<>();
        for (Player player: this.game.getPlayers()) {
            for (Wing wing: player.getWings()) {
                for (Unit unit: wing.getUnits()) {
                    units.put(unit.getName(), unit);
                    players.put(unit, player);
                }
            }
        }
        this.locations = new HashMap<>();
        for (Player player: this.game.getPlayers()) {
            for (Location location: player.getLocations()) {
                locations.put(new HexPos(location.getCol(), location.getRow()), location);
            }
        }
    }

    Game game;
    EntityManager em;

    public long apply(Sequence sequence) {
        this.count = sequence.getCount();
        for (SequenceElement element : sequence.getElements()) {
            element.accept(this);
        }
        sequence.setCurrentTurn(this.game.getCurrentTurn());
        sequence.setCurrentPlayerIndex(this.game.getCurrentPlayerIndex());
        return this.count;
    }

    public long applyForPlayerTurns(List<Sequence> sequences, int turns) {
        for (Sequence sequence : sequences) {
            apply(sequence);
            if (sequence.isTurnClosed()) {
                turns--;
                if (turns==0) break;
            };
        }
        return this.count;
    }

    public long applySequences(List<Sequence> sequences) {
        for (Sequence sequence : sequences) {
            apply(sequence);
        }
        return this.count;
    }

    void changeUnitState(Unit unit, SequenceElement.StateSequenceElement element) {
        unit.setAmmunition(element.getAmmunition());
        unit.setCharging(element.getCharging()==Charging.CHARGING);
        unit.setCohesion(element.getCohesion());
        unit.setTiredness(element.getTiredness());
        unit.setEngaging(element.isEngaging());
        unit.setOrderGiven(element.hasGivenOrder());
        unit.setPlayed(element.isPlayed());
        unit.setSteps(element.getSteps());
        if (unit.getSteps()==0) {
            Location location = getLocation(unit);
            location.removeUnit(unit);
            locations.remove(new HexPos(unit));
        }
    }

    public void visit(SequenceElement.MoveSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        Location location = getLocation(unit);
        location.removeUnit(unit);
        locations.remove(new HexPos(unit));
        changeUnitState(unit, element);
        unit.setPositionAngle(element.getHexAngle());
        unit.setPositionCol(element.getHexCol());
        unit.setPositionRow(element.getHexRow());
        location = getLocation(unit);
        location.addUnit(unit, element.getStacking());
    }

    public void visit(SequenceElement.RotateSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        unit.setAngle(element.getAngle());
    }

    public void visit(SequenceElement.ReorientSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        unit.setAngle(element.getAngle());
    }

    public void visit(SequenceElement.TurnSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        Location location = getLocation(unit);
        location.removeUnit(unit);
        locations.remove(new HexPos(unit));
        changeUnitState(unit, element);
        unit.setAngle(element.getAngle());
        location = getLocation(unit);
        location.addUnit(unit, element.getStacking());
    }

    public void visit(SequenceElement.NextTurnSequenceElement element) {
        this.game.advanceToNextPlayerTurn();
    }

    public void visit(SequenceElement.StateSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.RestSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.RefillSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.RallySequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.ReorganizeSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.LossConsistencySequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.ConfrontSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.CrossingSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.AttackerEngagementSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.DefenderEngagementSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.DisengagementSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.Try2ChangeOrderInstructionSequenceElement element) {
    }

    public void visit(SequenceElement.ChangeOrderInstructionSequenceElement element) {
        Unit leader = units.get(element.getLeader());
        Wing wing = Wing.findWing(this.game, leader);
        wing.setOrderInstruction(element.getOrderInstruction());
    }

    public void visit(SequenceElement.Try2TakeCommandSequenceElement element) {
    }

    public void visit(SequenceElement.Try2DismissCommandSequenceElement element) {
    }

    public void visit(SequenceElement.GiveOrdersSequenceElement element) {
    }

    public void visit(SequenceElement.ManageCommandSequenceElement element) {
        Unit leader = units.get(element.getLeader());
        Wing wing = Wing.findWing(this.game, leader);
        wing.setLeader(element.getInCommand() ? leader : null);
    }

    public void visit(SequenceElement.ShockAttackSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.FireAttackSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        changeUnitState(unit, element);
    }

    public void visit(SequenceElement.Ask4RetreatSequenceElement element) {
    }

    public void visit(SequenceElement.RetreatSequenceElement element) {
        Unit unit = units.get(element.getUnit());
        Location location = getLocation(unit);
        location.removeUnit(unit);
        locations.remove(new HexPos(unit));
        changeUnitState(unit, element);
        unit.setPositionAngle(element.getHexAngle());
        unit.setPositionCol(element.getHexCol());
        unit.setPositionRow(element.getHexRow());
        location = getLocation(unit);
        location.addUnit(unit, element.getStacking());
        em.remove(em.find(SequenceElement.class, element.getAskRequest()));
    }

    long count = -1;
    Map<String, Unit> units = null;
    Map<Unit, Player> players = null;
    Map<HexPos, Location> locations = null;

    static class HexPos {
        int col, row;

        HexPos(int col, int row) {
            this.col = col;
            this.row = row;
        }

        HexPos(Unit unit) {
            this(unit.getPositionCol(), unit.getPositionRow());
        }

        @Override
        public boolean equals(Object hex) {
            if (this == hex) return true;
            if (hex == null || getClass() != hex.getClass()) return false;
            HexPos hexPos = (HexPos) hex;
            return col == hexPos.col &&
                    row == hexPos.row;
        }

        @Override
        public int hashCode() {
            return Objects.hash(col, row);
        }
    }

    Location getLocation(Unit unit) {
        HexPos hexPos = new HexPos(unit);
        Location location = locations.get(hexPos);
        if (location == null) {
            location = new Location().setCol(unit.getPositionCol()).setRow(unit.getPositionRow());
            locations.put(hexPos, location);
        }
        return location;
    }

}
