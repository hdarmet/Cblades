package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
public class Announcement extends BaseEntity {

    @Column(length = 20000)
    String description="";
    String illustration;
    @Enumerated(EnumType.STRING)
    AnnouncementStatus status;

    public String getDescription() {
        return this.description;
    }
    public Announcement setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getIllustration() {
        return this.illustration;
    }
    public Announcement setIllustration(String illustration) {
        this.illustration = illustration;
        return this;
    }

    public AnnouncementStatus getStatus() {
        return this.status;
    }
    public Announcement setStatus(AnnouncementStatus status) {
        this.status = status;
        return this;
    }

}

