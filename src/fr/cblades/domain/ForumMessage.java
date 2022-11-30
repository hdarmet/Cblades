package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Date;

@Entity
public class ForumMessage extends BaseEntity {

    Date publishedDate;
    @Column(length = 5000)
    String text="";
    int likeCount=0;
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

    public int getlikeCount() {
        return this.likeCount;
    }
    public ForumMessage setLikeCount(int likeCount) {
        this.likeCount = likeCount;
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
