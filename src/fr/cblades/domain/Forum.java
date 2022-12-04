package fr.cblades.domain;

import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_forum_by_title", unique=true, columnList="title")
})
public class Forum extends BaseEntity {

    String title="";
    @Column(length = 5000)
    String description="";
    int threadCount=0;
    int messageCount=0;
    @Enumerated(EnumType.STRING)
    ForumStatus status;
    @OneToOne
    ForumMessage lastMessage;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getTitle() {
        return this.title;
    }
    public Forum setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public Forum setDescription(String description) {
        this.description = description;
        return this;
    }

    public int getThreadCount() {
        return this.threadCount;
    }
    public Forum setThreadCount(int threadCount) {
        this.threadCount = threadCount;
        return this;
    }

    public int getMessageCount() {
        return this.messageCount;
    }
    public Forum setMessageCount(int messageCount) {
        this.messageCount = messageCount;
        return this;
    }

    public ForumStatus getStatus() {
        return this.status;
    }
    public Forum setStatus(ForumStatus status) {
        this.status = status;
        return this;
    }

    public ForumMessage getLastMessage() {
        return this.lastMessage;
    }
    public Forum setLastMessage(ForumMessage lastMessage) {
        this.lastMessage = lastMessage;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Forum addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Forum removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }
}
