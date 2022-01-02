package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
public class Map extends BaseEntity {

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<BoardPlacement> boards = new ArrayList<>();

    public List<BoardPlacement> getBoardPlacements() {
        return Collections.unmodifiableList(this.boards);
    }
    public Map addBoardPlacement(BoardPlacement boardPlacement) {
        this.boards.add(boardPlacement);
        return this;
    }
    public Map removeBoardPlacement(BoardPlacement boardPlacement) {
        this.boards.remove(boardPlacement);
        return this;
    }

}
