package fr.cblades.game;

import fr.cblades.domain.*;

import javax.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SequenceApplyer implements SequenceElement.SequenceVisitor {

    public SequenceApplyer(EntityManager em, Game game) {
        this.game = game;
        this.em = em;
        this.units = new HashMap<>();
        this.locations = Location.getLocations(game);
        for (Player player: this.game.getPlayers()) {
            for (Wing wing: player.getWings()) {
                for (Unit unit: wing.getUnits()) {
                    this.units.put(unit.getName(), unit);
                }
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

    void setLeaderSequenceElement(SequenceElement element) {
        Unit unit = units.get(element.getAttr("leader"));
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
            deleteUnit(unit);
        }
        unit.setAttrs(element.getAttrs());
        unit.setAttr("sequenceElement", element.getType());
    }

    void deleteUnit(Unit unit) {
        unit.getWing().removeUnit(unit);
        removeUnitFromLocation(unit);
    }

    void removeUnitFromLocation(Unit unit) {
        Location[] locations = Location.getUnitLocations(this.locations, unit);
        for (Location location: locations) {
            Location.removePieceFromLocation(this.locations, location, unit, this.game);
        }
    }

    void addUnitToLocation(Unit unit, Stacking stacking) {
        Location[] locations = Location.getUnitLocations(this.locations, unit);
        for (Location location: locations) {
            Location.addPieceToLocation(this.locations, location, unit, this.game, stacking);
        }
    }

    void addTokenToLocation(Token token) {
        Location location = Location.getLocation(this.locations, token);
        Location.addPieceToLocation(this.locations, location, token, this.game, Stacking.BOTTOM);
    }

    void removeTokenFromLocation(Token token) {
        Location location = Location.getLocation(this.locations, token);
        Location.removePieceFromLocation(this.locations, location, token, this.game);
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

    void removeUnit(SequenceElement element, String field) {
        String troopName = (String)element.getAttr(field);
        Unit unit = units.get(troopName);
        deleteUnit(unit);
    }

    void removeUnits(SequenceElement element, String field) {
        List<String> troopNames = (List<String>)element.getAttr(field);
        for (String name : troopNames) {
            Unit unit = units.get(name);
            deleteUnit(unit);
        }
    }

    void buildUnit(Unit sourceUnit, Map<String, Object> attrs, Stacking stacking) {
        Wing wing = sourceUnit.getWing();
        Unit unit = new Unit()
            .setPositionCol((int)attrs.get("positionCol"))
            .setPositionRow((int)attrs.get("positionRow"))
            .setPositionAngle((Integer)attrs.get("positionAngle"))
            .setName((String)attrs.get("name"))
            .setCategory(UnitCategory.byLabel((String)attrs.get("category")))
            .setType((String)attrs.get("type"))
            .setAngle((int)attrs.get("angle"))
            .setSteps((int)attrs.get("steps"))
            .setTiredness(Tiredness.byLabel((String)attrs.get("tiredness")))
            .setAmmunition(Ammunition.byLabel((String)attrs.get("ammunition")))
            .setCohesion(Cohesion.byLabel((String)attrs.get("cohesion")))
            .setContact((boolean)attrs.get("contact"))
            .setOrderGiven((boolean)attrs.get("orderGiven"))
            .setPlayed((boolean)attrs.get("played"))
            .setCharging((boolean)attrs.get("charging"));
        this.units.put(unit.getName(), unit);
        units.put(unit.getName(), unit);
        wing.addUnit(unit);
        addUnitToLocation(unit, stacking);
    }

    void createUnit(Unit sourceUnit, SequenceElement element, String field) {
        Map<String, Object> attrs = (Map<String, Object>)element.getAttr(field+".unit");
        Stacking stacking = Stacking.byLabel((String)element.getAttr(field+".stacking"));
        buildUnit(sourceUnit, attrs, stacking);
    }

    void createUnits(Unit sourceUnit, SequenceElement element, String field) {
        for (Map<String, Object> troop : (List<Map<String, Object>>) element.getAttr(field)) {
            Map<String, Object> attrs = (Map<String, Object>)troop.get("unit");
            buildUnit(sourceUnit, attrs, Stacking.TOP);
        }
    }

    void createToken(SequenceElement element) {
        if (element.getAttr("token")!=null) {
            Token token = new Token()
                .setType((String) element.getAttr("token.type"))
                .setAngle((int) element.getAttr("token.angle"))
                .setLevel((Integer) element.getAttr("token.level"))
                .setDensity((Boolean) element.getAttr("token.density"))
                .setFire((Boolean) element.getAttr("token.fire"))
                .setPositionCol((int) element.getAttr("token.positionCol"))
                .setPositionRow((int) element.getAttr("token.positionRow"));
            this.addTokenToLocation(token);
        }
    }

    void removeToken(SequenceElement element) {
        String unitName = (String)element.getAttr("unit");
        Unit unit = this.units.get(unitName);
        Location unitLocation = this.locations.get(new LocationId(unit.getPositionCol(), unit.getPositionRow()));
        assert(unitLocation!=null);
        String tokenType = (String)element.getAttr("token.type");
        Token token = unitLocation.getToken(tokenType);
        this.removeTokenFromLocation(token);
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
            setLeaderSequenceElement(element);
        }
        else if (element.getType().equals("order-instructions")) {
            changeOrderInstructions(element);
        }
        else if (element.getType().equals("try2-take-command")) {
            setLeaderSequenceElement(element);
        }
        else if (element.getType().equals("take-command")) {
            changeManageCommand(element, true);
        }
        else if (element.getType().equals("try2-dismiss-command")) {
            setLeaderSequenceElement(element);
        }
        else if (element.getType().equals("dismiss-command")) {
            changeManageCommand(element, false);
        }
        else if (element.getType().equals("give-orders")) {
            setLeaderSequenceElement(element);
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
        else if (element.getType().equals("retreat")) {
            changeUnitState(element);
            changeUnitLocation(element);
            setUnitAttr(element, "retreated", true);
        }
        else if (element.getType().equals("advance")) {
            changeUnitState(element);
            changeUnitLocation(element);
        }
        else if (element.getType().equals("leave")) {
            changeUnitState(element);
            Unit sourceUnit = units.get(element.getAttr("unit"));
            createUnit(sourceUnit, element, "troop");
        }
        else if (element.getType().equals("break")) {
            Unit sourceUnit = units.get(element.getAttr("unit"));
            createUnits(sourceUnit, element, "troops");
            removeUnit(element, "unit");
        }
        else if (element.getType().equals("join")) {
            changeUnitState(element);
            removeUnits(element, "troops");
        }
        else if (element.getType().equals("create")) {
            Unit sourceUnit = units.get(((List<String>)element.getAttr("troops")).get(0));
            createUnit(sourceUnit, element, "formation");
            removeUnits(element, "troops");
        }
        else if (element.getType().equals("set-fire")) {
            createToken(element);
        }
        else if (element.getType().equals("extinguish-fire")) {
            removeToken(element);
        }
        else if (element.getType().equals("set-stakes")) {
            createToken(element);
        }
        else if (element.getType().equals("remove-stakes")) {
            removeToken(element);
        }
        else if (element.getType().equals("next-turn")) {
            changeTurn(element);
        }
    }

    void changeUnitLocation(SequenceElement element) {
        Unit unit = units.get(element.getAttr("unit"));
        unit.setAttrs(element.getAttrs());
        removeUnitFromLocation(unit);
        Integer hexAngle = (Integer)element.getAttr("hexAngle");
        if (hexAngle!=null) unit.setPositionAngle((int)hexAngle);
        unit.setPositionCol((int)element.getAttr("hexLocation.col"));
        unit.setPositionRow((int)element.getAttr("hexLocation.row"));
        unit.setPositionAngle((Integer)element.getAttr("hexLocation.angle"));
        Stacking stacking = Stacking.byLabels().get(element.getAttr("stacking"));
        addUnitToLocation(unit, stacking);
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
    Map<LocationId, Location> locations = null;

}
