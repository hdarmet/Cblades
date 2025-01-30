package fr.cblades.domain;

import org.summer.SummerException;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_board_by_name", unique=true, columnList="name"),
    @Index(name="idx_board_by_path", unique=true, columnList="path")
})
public class Board extends BaseEntity {

    String name="";
    String description="";
    String path="";
    String icon="";
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "board_id")
    List<Hex> hexes = new ArrayList<>();
    @Enumerated(EnumType.STRING)
    BoardStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getName() {
        return this.name;
    }
    public Board setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public Board setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getPath() {
        return this.path;
    }
    public Board setPath(String path) {
        this.path = path;
        return this;
    }

    public String getIcon() {
        return this.icon;
    }
    public Board setIcon(String icon) {
        this.icon = icon;
        return this;
    }

    public BoardStatus getStatus() {
        return this.status;
    }
    public Board setStatus(BoardStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Board setAuthor(Account author) {
        this.author = author;
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

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Board addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Board removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

    public static Board getByPath(EntityManager em, String path) {
        Query query = em.createQuery("select b from Board b where b.path = :path");
        query.setParameter("path", path);
        try {
            return (Board)query.getSingleResult();
        }
        catch (NoResultException enf) {
            throw new SummerNotFoundException(
                String.format("Unknown Board with path %s", path)
            );
        }
    }

    public static Board getByName(EntityManager em, String name) {
        Query query = em.createQuery("select b from Board b where b.name = :name");
        query.setParameter("name", name);
        try {
            return (Board)query.getSingleResult();
        }
        catch (NoResultException enf) {
            throw new SummerNotFoundException(
                String.format("Unknown Board with name %s", name)
            );
        }
    }

}
