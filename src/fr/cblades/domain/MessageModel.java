package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_model_by_category", columnList="category")
})
public class MessageModel extends BaseEntity {

    @Enumerated(EnumType.STRING)
    MessageModelCategory category;
    String title="";
    @Column(length = 5000)
    String text="";
    @Enumerated(EnumType.STRING)
    MessageModelStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getTitle() {
        return this.title;
    }
    public MessageModel setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getText() {
        return this.text;
    }
    public MessageModel setText(String text) {
        this.text = text;
        return this;
    }

    public MessageModelCategory getCategory() {
        return this.category;
    }
    public MessageModel setCategory(MessageModelCategory category) {
        this.category = category;
        return this;
    }

    public MessageModelStatus getStatus() {
        return this.status;
    }
    public MessageModel setStatus(MessageModelStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public MessageModel setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public MessageModel addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public MessageModel removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

}
