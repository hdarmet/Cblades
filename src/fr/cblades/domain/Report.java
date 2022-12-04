package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Date;

@Entity
public class Report extends BaseEntity {

    Date sendDate;
    @Column(length = 200)
    String reason="";
    @Column(length = 5000)
    String text="";
    long target;
    @ManyToOne
    Account author;

    public Date getSendDate() {
        return this.sendDate;
    }
    public Report setSendDate(Date sendDate) {
        this.sendDate = sendDate;
        return this;
    }

    public String getReason() {
        return this.reason;
    }
    public Report setReason(String reason) {
        this.reason = reason;
        return this;
    }

    public String getText() {
        return this.text;
    }
    public Report setText(String text) {
        this.text = text;
        return this;
    }

    public long getTarget() {
        return this.target;
    }
    public Report setTarget(long target) {
        this.target = target;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Report setAuthor(Account author) {
        this.author = author;
        return this;
    }

}
