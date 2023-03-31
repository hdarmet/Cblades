package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.*;
import java.util.Map;

@Entity
public class Location extends BaseEntity {

    int col;
    int row;
    @ManyToMany(cascade = CascadeType.ALL)
    @OrderColumn(name="unitIndex")
    List<Unit> units = new ArrayList<>();

    public int getCol() {
        return this.col;
    }
    public Location setCol(int col) {
        this.col = col;
        return this;
    }

    public int getRow() {
        return this.row;
    }
    public Location setRow(int row) {
        this.row = row;
        return this;
    }

    public List<Unit> getUnits() {
        return Collections.unmodifiableList(this.units);
    }
    public Location addUnit(Unit unit) {
        this.units.add(unit);
        return this;
    }
    public Location addUnit(Unit unit, Stacking stacking) {
        if (stacking==Stacking.BOTTOM) {
            this.units.add(0, unit);
        }
        else {
            this.units.add(unit);
        }
        return this;
    }
    public Location removeUnit(Unit unit) {
        this.units.remove(unit);
        return this;
    }

    public static int findNearCol(int col, int row, int angle) {
        if (angle == 0 || angle == 180) {
            return col;
        }
        else if (angle == 60 || angle == 120) {
            return col+1;
        }
        else {
            return col-1;
        }
    }

    public static int findNearRow(int col, int row, int angle) {
        if (angle == 0) {
            return row-1;
        }
        else if (angle == 60 || angle == 300) {
            return col%2 != 0 ? row-1 : row;
        }
        else if (angle == 120 || angle == 240) {
            return col%2 != 0 ? row : row+1;
        }
        else {
            return row+1;
        }
    }

    static class LocationId {
        int col;
        int row;

        public LocationId(int col, int row) {
            this.col = col;
            this.row = row;
        }

        @Override
        public boolean equals(Object locationId) {
            if (this == locationId) return true;
            if (locationId == null || getClass() != locationId.getClass()) return false;
            LocationId that = (LocationId) locationId;
            return col == that.col && row == that.row;
        }

        @Override
        public int hashCode() {
            return Objects.hash(col, row);
        }
    }

    public static Location getLocation(Map context, int col, int row) {
        Location location = (Location)context.get(new LocationId(col, row));
        if (location==null) {
            location = new Location().setCol(col).setRow(row);
            context.put(new LocationId(col, row), location);
        }
        return location;
    }

    public static Location getUnitLocation(Map context, Unit unit) {
        int col = unit.getPositionCol();
        int row = unit.getPositionRow();
        return getLocation(context, col, row);
    }

    public static Location getFormationAltLocation(Map context, Unit unit) {
        int col = unit.getPositionCol();
        int row = unit.getPositionRow();
        int angle = unit.getPositionAngle();
        return getLocation(context,
            findNearCol(col, row, angle),
            findNearRow(col, row, angle)
        );
    }

    Location duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Location location = new Location().setCol(this.col).setRow(this.row);
        for (Unit unit: this.units) {
            location.addUnit((Unit)duplications.get(unit));
        }
        duplications.put(this, location);
        em.persist(location);
        return location;
    }

}
