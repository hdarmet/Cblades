package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.*;

@Entity
@Table(indexes=@Index(name="idx_sequence", columnList="game, count"))
public class Sequence extends BaseEntity {

    long game;
    long count;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "sequence_id")
    @OrderColumn(name="sequenceIndex")
    List<SequenceElement> elements = new ArrayList<>();
    int currentPlayerIndex = -1;
    int currentTurn = -1;

    public long getGame() {
        return this.game;
    }
    public Sequence setGame(long game) {
        this.game = game;
        return this;
    }
    public Game getGame(EntityManager em) {
        return Game.find(em, this.game);
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

    public int getCurrentTurn() {
        return this.currentTurn;
    }
    public Sequence setCurrentTurn(int currentTurn) {
        this.currentTurn = currentTurn;
        return this;
    }

    public int getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }
    public Sequence setCurrentPlayerIndex(int currentPlayerIndex) {
        this.currentPlayerIndex = currentPlayerIndex;
        return this;
    }
    public Player getPlayer(EntityManager em) {
        if (currentPlayerIndex == -1) return null;
        return this.getGame(em).getPlayers().get(currentPlayerIndex);
    }

    public boolean isTurnClosed() {
        SequenceElement element = elements.get(elements.size()-1);
        return element.isTurnClosed();
    }
}
