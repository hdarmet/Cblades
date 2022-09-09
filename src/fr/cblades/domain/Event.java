package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Date;

@Entity
public class Event extends BaseEntity {

    Date date;
    String title="";
    @Column(length = 20000)
    String description="";
    String illustration;
    @Enumerated(EnumType.STRING)
    EventStatus status;
    @ManyToOne
    Account target;

    public Date getDate() {
        return this.date;
    }
    public Event setDate(Date date) {
        this.date = date;
        return this;
    }

    public String getTitle() {
        return this.title;
    }
    public Event setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public Event setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getIllustration() {
        return this.illustration;
    }
    public Event setIllustration(String illustration) {
        this.illustration = illustration;
        return this;
    }

    public EventStatus getStatus() {
        return this.status;
    }
    public Event setStatus(EventStatus status) {
        this.status = status;
        return this;
    }

    public Account getTarget() {
        return this.target;
    }
    public Event setTarget(Account target) {
        this.target = target;
        return this;
    }

}

