package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Date;

@Entity
public class ForumMessage extends BaseEntity {

    Date publishedDate;
    @Column(length = 10000)
    String text="";
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    LikePoll poll;
    @ManyToOne
    ForumThread thread;
    @ManyToOne
    Account author;

    public Date getPublishedDate() {
        return this.publishedDate;
    }
    public ForumMessage setPublishedDate(Date publishedDate) {
        this.publishedDate = publishedDate;
        return this;
    }

    public String getText() {
        return this.text;
    }
    public ForumMessage setText(String text) {
        this.text = text;
        return this;
    }

    public LikePoll getPoll() {
        return this.poll;
    }
    public ForumMessage setPoll(LikePoll poll) {
        this.poll = poll;
        return this;
    }

    public ForumThread getForumThread() {
        return this.thread;
    }
    public ForumMessage setForumThread(ForumThread thread) {
        this.thread = thread;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public ForumMessage setAuthor(Account author) {
        this.author = author;
        return this;
    }

}
