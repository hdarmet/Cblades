package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes=@Index(name="idx_board", unique=true, columnList="name"))
public class Board extends BaseEntity {

    String name="";
    String path="";
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "board_id")
    List<Hex> hexes = new ArrayList<>();

    public String getName() {
        return this.name;
    }
    public Board setName(String name) {
        this.name = name;
        return this;
    }

    public String getPath() {
        return this.path;
    }
    public Board setPath(String path) {
        this.path = path;
        return this;
    }

    public List<Hex> getHexes() {
        return Collections.unmodifiableList(this.hexes);
    }
    public Board addHex(Hex hex) {
        this.hexes.add(hex);
        return this;
    }
    public Board removeHex(Hex hex) {
        this.hexes.remove(hex);
        return this;
    }

}