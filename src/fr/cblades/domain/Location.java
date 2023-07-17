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
    List<Piece> pieces = new ArrayList<>();

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

    public List<Piece> getPieces() {
        return Collections.unmodifiableList(this.pieces);
    }
    public Location addPiece(Piece piece) {
        this.pieces.add(piece);
        return this;
    }
    public Location addPiece(Piece piece, Stacking stacking) {
        if (stacking==Stacking.BOTTOM) {
            this.pieces.add(0, piece);
        }
        else {
            this.pieces.add(piece);
        }
        return this;
    }
    public Location removePiece(Piece piece) {
        this.pieces.remove(piece);
        return this;
    }

    public static void getLocationContext(Map context, List<Location> locations) {
        for (Location location: locations) {
            context.put(new LocationId(location.getCol(), location.getRow()), location);
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

    public static Location getLocation(Map context, Piece piece) {
        int col = piece.getPositionCol();
        int row = piece.getPositionRow();
        return getLocation(context, col, row);
    }

    public static Location getFormationAltLocation(Map context, Unit unit) {
        int col = unit.getPositionCol();
        int row = unit.getPositionRow();
        int angle = unit.getPositionAngle();
        return getLocation(context,
            LocationId.findNearCol(col, row, angle),
            LocationId.findNearRow(col, row, angle)
        );
    }

    public static Location[] getUnitLocations(Map context, Unit unit) {
        if (unit.getPositionAngle() == null) {
            return new Location[] {
                getLocation(context, unit)
            };
        }
        else {
            return new Location[] {
                getLocation(context, unit), getFormationAltLocation(context, unit)
            };
        }
    }

    public static void addPieceToLocation(Map context, Location location, Piece piece, Game game, Stacking stacking) {
        LocationId locationId = new LocationId(location.getCol(), location.getRow());
        location.addPiece(piece, stacking);
        if (context.get(locationId) != null) {
            game.addLocation(location);
            context.put(locationId, location);
        }
    }

    public static void removePieceFromLocation(Map context, Location location, Piece piece, Game game) {
        LocationId locationId = new LocationId(location.getCol(), location.getRow());
        location.removePiece(piece);
        if (context.get(locationId) == null) {
            game.removeLocation(location);
            context.remove(locationId);
        }
    }

    Location duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Location location = (Location)duplications.get(this);
        if (location == null) {
            location = new Location().setCol(this.col).setRow(this.row);
            for (Piece piece : this.pieces) {
                Piece duplicate = (Piece)duplications.get(piece);
                if (duplicate == null) duplicate = piece.duplicate(em, duplications);
                location.addPiece((Piece)duplicate);
            }
            duplications.put(this, location);
            em.persist(location);
        }
        return location;
    }

}
