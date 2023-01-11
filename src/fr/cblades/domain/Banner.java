package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes=@Index(name="idx_banner", unique=true, columnList="name"))
public class Banner extends BaseEntity {

    String name;
    String path;
    String description;
    @Enumerated(EnumType.STRING)
    BannerStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getName() { return this.name; }
    public Banner setName(String name) {
        this.name = name;
        return this;
    }

    public String getPath() { return this.path; }
    public Banner setPath(String path) {
        this.path = path;
        return this;
    }

    public String getDescription() { return this.description; }
    public Banner setDescription(String description) {
        this.description = description;
        return this;
    }

    public BannerStatus getStatus() {
        return this.status;
    }
    public Banner setStatus(BannerStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Banner setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Banner addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Banner removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

    public static Banner getByName(EntityManager em, String name) {
        Query query = em.createQuery("select b from Banner b where b.name = :name");
        query.setParameter("name", name);
        try {
            return (Banner)query.getSingleResult();
        }
        catch (NoResultException nre) {
            return null;
        }
    }

}
