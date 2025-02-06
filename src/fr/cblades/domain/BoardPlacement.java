package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
public class BoardPlacement extends BaseEntity {

    @ManyToOne
    Board board;
    int col;
    int row;
    boolean invert=false;

    public int getCol() { return this.col; }
    public BoardPlacement setCol(int col) {
        this.col = col;
        return this;
    }

    public int getRow() { return this.row; }
    public BoardPlacement setRow(int row) {
        this.row = row;
        return this;
    }

    public Board getBoard() { return this.board; }
    public BoardPlacement setBoard(Board board) {
        this.board = board;
        return this;
    }

    public boolean isInvert() {
        return this.invert;
    }
    public BoardPlacement setInvert(boolean invert) {
        this.invert = invert;
        return this;
    }

    public BoardPlacement duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        BoardPlacement boardPlacement = (BoardPlacement)duplications.get(this);
        if (boardPlacement == null) {
            boardPlacement = new BoardPlacement()
                .setBoard(board)
                .setCol(col)
                .setRow(row)
                .setInvert(invert);
            duplications.put(this, boardPlacement);
            em.persist(boardPlacement);
        }
        return boardPlacement;
    }

}
