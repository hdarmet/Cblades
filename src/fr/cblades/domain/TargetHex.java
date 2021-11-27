package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.Entity;
import javax.persistence.Enumerated;

@Entity
public class TargetHex extends BaseEntity {

    int col;
    int row;

    public int getCol() {
        return this.col;
    }
    public TargetHex setCol(int col) {
        this.col = col;
        return this;
    }

    public int getRow() {
        return this.row;
    }
    public TargetHex setRow(int row) {
        this.row = row;
        return this;
    }

}

