package fr.cblades.domain;

import java.util.Objects;

public class LocationId {
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

}
