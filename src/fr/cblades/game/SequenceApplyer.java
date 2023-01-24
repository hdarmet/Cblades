package fr.cblades.game;

import fr.cblades.domain.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class SequenceApplyer implements SequenceVisitor  {

    public SequenceApplyer(Game game) {
        this.game = game;
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

    void changeUnitState(Unit unit, SequenceElement.StateSequenceElement element) {
        unit.setAmmunition(element.getAmmunition());
        unit.setCharging(element.getCharging()==Charging.CHARGING);
        unit.setCohesion(element.getCohesion());
        unit.setTiredness(element.getTiredness());
        unit.setEngaging(element.isEngaging());
        unit.setOrderGiven(element.hasGivenOrder());
        unit.setPlayed(element.isPlayed());
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
        int currentPlayerIndex = this.game.getPlayers().indexOf(this.game.getCurrentPlayer())+1;
        if (currentPlayerIndex == this.game.getPlayers().size()) {
            this.game.setCurrentTurn(this.game.getCurrentTurn()+1);
            currentPlayerIndex = 0;
        }
        this.game.setCurrentPlayerIndex(currentPlayerIndex);
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
