package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
    public Location removeUnit(Unit unit) {
        this.units.remove(unit);
        return this;
    }

}
