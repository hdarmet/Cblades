package fr.cblades.domain;

import org.summer.controller.SummerControllerException;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes=@Index(name="idx_player_identity", unique=true, columnList="name"))
public class PlayerIdentity extends BaseEntity {

    String name;
    String path;
    String description;
    @Enumerated(EnumType.STRING)
    PlayerIdentityStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getName() { return this.name; }
    public PlayerIdentity setName(String name) {
        this.name = name;
        return this;
    }

    public String getPath() { return this.path; }
    public PlayerIdentity setPath(String path) {
        this.path = path;
        return this;
    }

    public String getDescription() { return this.description; }
    public PlayerIdentity setDescription(String description) {
        this.description = description;
        return this;
    }

    public PlayerIdentityStatus getStatus() {
        return this.status;
    }
    public PlayerIdentity setStatus(PlayerIdentityStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public PlayerIdentity setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public PlayerIdentity addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public PlayerIdentity removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

    public static PlayerIdentity getByName(EntityManager em, String name) {
        Query query = em.createQuery("select pi from PlayerIdentity pi where pi.name = :name");
        query.setParameter("name", name);
        try {
            return (PlayerIdentity)query.getSingleResult();
        }
        catch (NoResultException enf) {
            throw new SummerNotFoundException("PlayerIdentity of name %s not found", name);
        }
    }

}
