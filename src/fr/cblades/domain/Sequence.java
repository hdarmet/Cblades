package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.*;

@Entity
@Table(indexes=@Index(name="idx_sequence", columnList="game, count"))
public class Sequence extends BaseEntity {

    String game="";
    long count;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "sequence_id")
    @OrderColumn(name="sequenceIndex")
    List<SequenceElement> elements = new ArrayList<>();

    public String getGame() {
        return this.game;
    }
    public Sequence setGame(String game) {
        this.game = game;
        return this;
    }

    public long getCount() {
        return this.count;
    }
    public Sequence setCount(long count) {
        this.count = count;
        return this;
    }

    public List<SequenceElement> getElements() {
        return Collections.unmodifiableList(this.elements);
    }
    public Sequence addElement(SequenceElement element) {
        this.elements.add(element);
        return this;
    }
    public Sequence removeElement(SequenceElement element) {
        this.elements.remove(element);
        return this;
    }

}