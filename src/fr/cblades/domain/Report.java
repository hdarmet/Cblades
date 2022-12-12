package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Date;

@Entity
public class Report extends BaseEntity {

    String category;
    Date sendDate;
    @Column(length = 200)
    String reason="";
    @Column(length = 5000)
    String text="";
    long target;
    @Enumerated(EnumType.STRING)
    ReportStatus status = ReportStatus.IN_PROGRESS;
    @ManyToOne
    Account author;

    public String getCategory() {
        return this.category;
    }
    public Report setCategory(String category) {
        this.category = category;
        return this;
    }

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

    public ReportStatus getStatus() {
        return this.status;
    }
    public Report setStatus(ReportStatus status) {
        this.status = status;
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
