package fr.cblades.domain;

import org.summer.data.BaseEntity;
import javax.persistence.Entity;
import javax.persistence.Enumerated;

@Entity
public class Hex extends BaseEntity {

    int col;
    int row;
    @Enumerated
    HexType type;
    int height;
    @Enumerated
    HexSideType side120Type;
    @Enumerated
    HexSideType side180Type;
    @Enumerated
    HexSideType side240Type;

    public int getCol() {
        return this.col;
    }
    public Hex setCol(int col) {
        this.col = col;
        return this;
    }

    public int getRow() {
        return this.row;
    }
    public Hex setRow(int row) {
        this.row = row;
        return this;
    }

    public HexType getType() {
        return this.type;
    }
    public Hex setType(HexType type) {
        this.type = type;
        return this;
    }

    public int getHeight() {
        return this.height;
    }
    public Hex setHeight(int height) {
        this.height = height;
        return this;
    }

    public HexSideType getSide120Type() {
        return this.side120Type;
    }
    public Hex setSide120Type(HexSideType sideType) {
        this.side120Type = sideType;
        return this;
    }

    public HexSideType getSide180Type() {
        return this.side180Type;
    }
    public Hex setSide180Type(HexSideType sideType) {
        this.side180Type = sideType;
        return this;
    }

    public HexSideType getSide240Type() {
        return this.side240Type;
    }
    public Hex setSide240Type(HexSideType sideType) {
        this.side240Type = sideType;
        return this;
    }

}

