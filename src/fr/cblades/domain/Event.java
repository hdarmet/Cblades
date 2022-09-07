package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
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

}

