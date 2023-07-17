package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_forum_thread_by_title", unique=true, columnList="forum_id,title")
})
public class ForumThread extends BaseEntity {

    String title="";
    @Column(length = 5000)
    String description="";
    int messageCount=0;
    int likeCount=0;
    @Enumerated(EnumType.STRING)
    ForumThreadStatus status;
    @ManyToOne
    Forum forum;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();
    @OneToOne
    ForumMessage lastMessage;

    public String getTitle() {
        return this.title;
    }
    public ForumThread setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public ForumThread setDescription(String description) {
        this.description = description;
        return this;
    }

    public int getlikeCount() {
        return this.likeCount;
    }
    public ForumThread setLikeCount(int likeCount) {
        this.likeCount = likeCount;
        return this;
    }

    public int getMessageCount() {
        return this.messageCount;
    }
    public ForumThread setMessageCount(int messageCount) {
        this.messageCount = messageCount;
        return this;
    }

    public ForumThreadStatus getStatus() {
        return this.status;
    }
    public ForumThread setStatus(ForumThreadStatus status) {
        this.status = status;
        return this;
    }

    public Forum getForum() {
        return this.forum;
    }
    public ForumThread setForum(Forum forum) {
        this.forum = forum;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public ForumThread setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public ForumMessage getLastMessage() {
        return this.lastMessage;
    }
    public ForumThread setLastMessage(ForumMessage lastMessage) {
        this.lastMessage = lastMessage;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public ForumThread addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public ForumThread removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }
}
