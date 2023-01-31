package fr.cblades.domain;

import fr.cblades.game.SequenceApplyer;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.*;

@Entity
public class Game extends BaseEntity {

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "order_player")
    List<Player> players = new ArrayList<>();
    int currentPlayerIndex = 0;
    int currentTurn = 0;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    Map map;

    public List<Player> getPlayers() {
        return Collections.unmodifiableList(this.players);
    }
    public Game addPlayer(Player player) {
        this.players.add(player);
        return this;
    }
    public Game removePlayer(Player player) {
        this.players.remove(player);
        return this;
    }

    public Player getPlayer(String name) {
        return this.players.stream().filter(player->name.equals(player.getName())).findFirst().orElse(null);
    }

    public Map getMap() {
        return this.map;
    }
    public Game setMap(Map map) {
        this.map = map;
        return this;
    }

    public int getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }
    public Game setCurrentPlayerIndex(int currentPlayerIndex) {
        this.currentPlayerIndex = currentPlayerIndex;
        return this;
    }

    public int getCurrentTurn() {
        return this.currentTurn;
    }
    public Game setCurrentTurn(int currentTurn) {
        this.currentTurn = currentTurn;
        return this;
    }

    public Player getCurrentPlayer() {
        return this.players.get(this.currentPlayerIndex);
    }
    public Game setCurrentPlayer(Player currentPlayer) {
        this.currentPlayerIndex = this.players.indexOf(currentPlayer);
        return this;
    }

    public Game duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) {
        Game game = new Game().setMap(this.map)
            .setCurrentPlayerIndex(this.currentPlayerIndex)
            .setCurrentTurn(this.currentTurn);
        for (Player player : players) {
            game.addPlayer(player.duplicate(em, duplications));
        }
        duplications.put(this, game);
        em.persist(game);
        return game;
    }

    public Game advanceToNextPlayerTurn() {
        int currentPlayerIndex = this.getPlayers().indexOf(this.getCurrentPlayer())+1;
        if (currentPlayerIndex == this.getPlayers().size()) {
            this.setCurrentTurn(this.getCurrentTurn()+1);
            currentPlayerIndex = 0;
        }
        this.setCurrentPlayerIndex(currentPlayerIndex);
        System.out.println("Game advance to turn:"+this.getCurrentTurn()+" and player: "+this.getCurrentPlayerIndex());
        return this;
    }

    public long advancePlayerTurns(EntityManager em, int turns) {
        Query query = em.createQuery(
            "select s from Sequence s left outer join fetch s.elements where s.game = :game and s.currentTurn < 0")
                .setParameter("game", this.getId());
        List<Sequence> sequenceList = getFilterAndSortSequences(query);
        return new SequenceApplyer(this).applyForPlayerTurns(sequenceList, turns);
    }

    public void applySequencesUntil(EntityManager em, long lastSequenceCount) {
        Query query = em.createQuery(
            "select s from Sequence s left outer join fetch s.elements where s.game = :game and s.currentTurn = -1 and s.count <= :count")
            .setParameter("game", this.getId())
            .setParameter("count", lastSequenceCount);
        List<Sequence> sequenceList = getFilterAndSortSequences(query);
        new SequenceApplyer(this).applySequences(sequenceList);
    }

    List<Sequence> getFilterAndSortSequences(Query query) {
        Set<Sequence> sequences = new HashSet<>(query.getResultList());
        List<Sequence> sequenceList = new ArrayList<>(sequences);
        Collections.sort(sequenceList,
                (s1, s2) -> (int) (s1.getCount() - s2.getCount())
        );
        return sequenceList;
    }

    static public Game find(EntityManager em, long id) {
        Game game = em.find(Game.class, id);
        if (game==null) {
            throw new SummerNotFoundException(
                    String.format("Unknown Game with id %d", id)
            );
        }
        return game;
    }

}
