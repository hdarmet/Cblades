package fr.cblades.domain;

import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_theme_by_title", unique=true, columnList="title")
})
public class Theme extends BaseEntity {

    String title="";
    @Column(length = 1000)
    String description="";
    String illustration = null;
    @Enumerated(EnumType.STRING)
    ThemeCategory category;
    @Enumerated(EnumType.STRING)
    ThemeStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getTitle() {
        return this.title;
    }
    public Theme setTitle(String title) {
        this.title = title;
        return this;
    }

    public ThemeCategory getCategory() {
        return this.category;
    }
    public Theme setCategory(ThemeCategory category) {
        this.category = category;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public Theme setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getIllustration() {
        return this.illustration;
    }
    public Theme setIllustration(String illustration) {
        this.illustration = illustration;
        return this;
    }

    public ThemeStatus getStatus() {
        return this.status;
    }
    public Theme setStatus(ThemeStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Theme setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Theme addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Theme removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

    static public Theme find(EntityManager em, long id) {
        Theme theme = em.find(Theme.class, id);
        if (theme==null) {
            throw new SummerNotFoundException(
                String.format("Unknown Theme with id %d", id)
            );
        }
        return theme;
    }

    public static Theme getByTitle(EntityManager em, String title) {
        Query query = em.createQuery("select t from Theme t " +
            "left outer join fetch t.author a " +
            "left outer join fetch a.access " +
            "where t.title = :title");
        query.setParameter("title", title);
        try {
            return (Theme)query.getSingleResult();
        }
        catch (NoResultException enf) {
            return null;
        }
    }
}
