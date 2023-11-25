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

    public Token getToken(String tokenType) {
        for (Piece piece : this.pieces) {
            if (piece instanceof Token && ((Token) piece).getType().equals(tokenType)) {
                return (Token)piece;
            }
        }
        return null;
    }
    public static Location getLocation(Game game, Map context, int col, int row) {
        Location location = (Location)context.get(new LocationId(col, row));
        if (location==null) {
            location = new Location().setCol(col).setRow(row);
            game.addLocation(location);
            context.put(location.getLocationId(), location);
        }
        return location;
    }

    public static Location getLocation(Game game, Map context, Piece piece) {
        int col = piece.getPositionCol();
        int row = piece.getPositionRow();
        return getLocation(game, context, col, row);
    }

    public static Location getFormationAltLocation(Game game, Map context, Unit unit) {
        int col = unit.getPositionCol();
        int row = unit.getPositionRow();
        int angle = unit.getPositionAngle();
        return getLocation(game, context,
            LocationId.findNearCol(col, row, angle),
            LocationId.findNearRow(col, row, angle)
        );
    }

    public static Location[] getUnitLocations(Game game, Map context, Unit unit) {
        if (unit.getPositionAngle() == null) {
            return new Location[] {
                getLocation(game, context, unit)
            };
        }
        else {
            return new Location[] {
                getLocation(game, context, unit), getFormationAltLocation(game, context, unit)
            };
        }
    }

    public LocationId getLocationId() {
        return new LocationId(this.getCol(), this.getRow());
    }
    public static void addPieceToLocation(Game game, Map context, Location location, Piece piece, Stacking stacking) {
        LocationId locationId = location.getLocationId();
        location.addPiece(piece, stacking);
    }

    public static void removePieceFromLocation(Game game, Map context, Location location, Piece piece) {
        location.removePiece(piece);
        if (location.getPieces().size() == 0) {
            LocationId locationId = location.getLocationId();
            game.removeLocation(location);
            context.remove(locationId);
        }
    }

    public static Map<LocationId, Location> getLocations(Game game) {
        Map<LocationId, Location> locations = new HashMap<>();
        for (Location location: game.getLocations()) {
            locations.put(location.getLocationId(), location);
        }
        return locations;
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
