package fr.cblades.game;

import fr.cblades.domain.*;

import javax.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class SequenceApplyer implements SequenceElement.SequenceVisitor {

    public SequenceApplyer(EntityManager em, Game game) {
        this.game = game;
        this.em = em;
        this.units = new HashMap<>();
        this.players = new HashMap<>();
        this.locations = new HashMap<>();
        for (Player player: this.game.getPlayers()) {
            for (Wing wing: player.getWings()) {
                for (Unit unit: wing.getUnits()) {
                    this.units.put(unit.getName(), unit);
                    this.players.put(unit, player);
                }
            }
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

    void setUnitAttr(SequenceElement element, String path, Object value) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAttr(path, value);
    }

    void setUnitSequenceElement(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAttrs(element.getAttrs());
        unit.setAttr("sequenceElement", element.getType());
    }

    void changeUnitState(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAmmunition(Ammunition.byLabels().get(element.getAttr("ammunition")));
        unit.setCharging(Charging.byLabels().get(element.getAttr("charging")) == Charging.CHARGING);
        unit.setCohesion(Cohesion.byLabels().get(element.getAttr("cohesion")));
        unit.setTiredness(Tiredness.byLabels().get(element.getAttr("tiredness")));
        unit.setEngaging((boolean)element.getAttr("engaging"));
        unit.setOrderGiven((boolean)element.getAttr("orderGiven"));
        unit.setPlayed((boolean)element.getAttr("played"));
        unit.setSteps((int)element.getAttr("steps"));
        if (unit.getSteps() == 0 || unit.getCohesion() == Cohesion.DELETED) {
            Location location = getLocation(unit);
            location.removeUnit(unit);
            locations.remove(new HexPos(unit));
        }
        unit.setAttrs(element.getAttrs());
        unit.setAttr("sequenceElement", element.getType());
    }

    void finishUnitAction(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAttr("actionType", null);
        unit.setPlayed(true);
    }

    void countAttacks(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        Integer count = (Integer)unit.getAttr("attackCount");
        unit.setAttr("attackCount", count==null? 1 : count+1);
    }
    @Override
    public void visit(SequenceElement element) {
        if (element.getType().equals("move")) {
            changeUnitState(element);
            changeUnitLocation(element);
        }
        else if (element.getType().equals("rotate")) {
            changeUnitState(element);
            changeUnitAngle(element);
        }
        else if (element.getType().equals("reorient")) {
            changeUnitState(element);
            changeUnitAngle(element);
        }
        else if (element.getType().equals("turn")) {
            changeUnitState(element);
            changeUnitLocation(element);
            changeUnitAngle(element);
        }
        else if (element.getType().equals("confront")) {
            changeUnitState(element);
            changeUnitAngle(element);
        }
        else if (element.getType().equals("state")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("rest")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("refill")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("rally")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("reorganize")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("neighbors-rout-checking")) {
            setUnitSequenceElement(element);
        }
        else if (element.getType().equals("rout-checking")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("neighbor-rout-checking")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("crossing")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("attacker-engagement")) {
            changeUnitState(element);
            setUnitAttr(element, "attackerEngagementChecking", true);
            finishUnitAction(element);
        }
        else if (element.getType().equals("defender-engagement")) {
            changeUnitState(element);
            setUnitAttr(element, "defenderEngagementChecking", true);
        }
        else if (element.getType().equals("try2-order-instructions")) {
            setUnitSequenceElement(element);
        }
        else if (element.getType().equals("order-instructions")) {
            changeOrderInstructions(element);
        }
        else if (element.getType().equals("try2-take-command")) {
            setUnitSequenceElement(element);
        }
        else if (element.getType().equals("take-command")) {
            changeManageCommand(element, true);
        }
        else if (element.getType().equals("try2-dismiss-command")) {
            setUnitSequenceElement(element);
        }
        else if (element.getType().equals("dismiss-command")) {
            changeManageCommand(element, false);
        }
        else if (element.getType().equals("give-orders")) {
            setUnitSequenceElement(element);
        }
        else if (element.getType().equals("shock-attack")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("fire-attack")) {
            changeUnitState(element);
        }
        else if (element.getType().equals("ask4-retreat")) {
            setUnitSequenceElement(element);
        }
        if (element.getType().equals("retreat")) {
            changeUnitState(element);
            changeUnitLocation(element);
            setUnitAttr(element, "retreated", true);
            //changeUnitAngle(element);
        }
        if (element.getType().equals("advance")) {
            changeUnitState(element);
            changeUnitLocation(element);
            //changeUnitAngle(element);
        }
        else if (element.getType().equals("next-turn")) {
            changeTurn(element);
        }
    }

    void changeUnitLocation(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAttrs(element.getAttrs());
        Location location = getLocation(unit);
        location.removeUnit(unit);
        locations.remove(new HexPos(unit));
        Integer hexAngle = (Integer)element.getAttr("hexAngle");
        if (hexAngle!=null) unit.setPositionAngle((int)hexAngle);
        unit.setPositionCol((int)element.getAttr("hexLocation.col"));
        unit.setPositionRow((int)element.getAttr("hexLocation.row"));
        unit.setPositionAngle((Integer)element.getAttr("hexLocation.angle"));
        location = getLocation(unit);
        location.addUnit(unit, Stacking.byLabels().get(element.getAttr("stacking")));
    }

    void changeUnitAngle(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAngle((int)element.getAttr("angle"));
    }

    void changeTurn(SequenceElement element) {
        for (Unit unit : this.units.values()) {
            unit.setAttrs(null);
            unit.setPlayed(false);
        }
        this.game.advanceToNextPlayerTurn();
    }

    void changeOrderInstructions(SequenceElement element) {
        Unit leader = units.get(element.getAttr("leader"));
        Wing wing = Wing.findWing(this.game, leader);
        wing.setOrderInstruction(OrderInstruction.byLabels().get(element.getAttr("order-instruction")));
    }

    void changeManageCommand(SequenceElement element, boolean inCommand) {
        Unit leader = units.get(element.getAttr("leader"));
        Wing wing = Wing.findWing(this.game, leader);
        wing.setLeader(inCommand ? leader : null);
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
