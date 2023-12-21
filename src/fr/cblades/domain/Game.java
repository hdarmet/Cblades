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
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "game_id")
    List<Location> locations = new ArrayList<>();

    int windDirection = 0;
    FogType fog = FogType.NO_FOG;
    WeatherType weather = WeatherType.CLEAR;

    @Transient
    List<SequenceElement> sequenceElements = new ArrayList<>();

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

    public List<Location> getLocations() {
        return Collections.unmodifiableList(this.locations);
    }
    public Game addLocation(Location location) {
        this.locations.add(location);
        return this;
    }
    public Game removeLocation(Location location) {
        this.locations.remove(location);
        return this;
    }
    public boolean containsLocation(Location location) {
        return this.locations.contains(location);
    }

    public int getWindDirection() {
        return this.windDirection;
    }
    public Game setWindDirection(int windDirection) {
        this.windDirection = windDirection;
        return this;
    }

    public WeatherType getWeather() {
        return this.weather;
    }
    public Game setWeather(WeatherType weather) {
        this.weather = weather;
        return this;
    }

    public FogType getFog() {
        return this.fog;
    }
    public Game setFog(FogType fog) {
        this.fog = fog;
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
        Game game = (Game)duplications.get(this);
        if (game == null) {
            game = new Game().setMap(this.map.duplicate(em, duplications))
                    .setCurrentPlayerIndex(this.currentPlayerIndex)
                    .setCurrentTurn(this.currentTurn);
            for (Player player : players) {
                game.addPlayer(player.duplicate(em, duplications));
            }
            for (Location location : this.locations) {
                game.addLocation(location.duplicate(em, duplications));
            }
            duplications.put(this, game);
            em.persist(game);
        }
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
        return new SequenceApplyer(em, this).applyForPlayerTurns(sequenceList, turns);
    }

    public void applySequencesUntil(EntityManager em, long lastSequenceCount) {
        Query query = em.createQuery(
            "select s from Sequence s left outer join fetch s.elements where s.game = :game and s.currentTurn = -1 and s.count <= :count")
            .setParameter("game", this.getId())
            .setParameter("count", lastSequenceCount);
        List<Sequence> sequenceList = getFilterAndSortSequences(query);
        new SequenceApplyer(em,this).applySequences(sequenceList);
    }

    List<Sequence> getFilterAndSortSequences(Query query) {
        Set<Sequence> sequences = new HashSet<>(query.getResultList());
        List<Sequence> sequenceList = new ArrayList<>(sequences);
        Collections.sort(sequenceList,
                (s1, s2) -> (int) (s1.getCount() - s2.getCount())
        );
        return sequenceList;
    }

    public Collection<Piece> getPieces() {
        Set<Piece> pieces = new HashSet<>();
        for (Location location : this.locations) {
            pieces.addAll(location.getPieces());
        }
        return pieces;
    }

    public List<SequenceElement> getSequenceElements() {
        return Collections.unmodifiableList(this.sequenceElements);
    }

    public Game addSequenceElements(List<SequenceElement> elements) {
        this.sequenceElements.addAll(elements);
        return this;
    }

    public Game resetSequenceElements() {
        this.sequenceElements.clear();
        return this;
    }

    public Unit getUnitByName(String name) {
        for (Player player : this.getPlayers()) {
            Unit unit = player.getUnit(name);
            if (unit!=null) return unit;
        }
        return null;
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
