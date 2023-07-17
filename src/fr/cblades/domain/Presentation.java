package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Table;

@Entity
@Table(indexes=@Index(name="idx_presentation", unique=true, columnList="category, presentationVersion"))
public class Presentation extends BaseEntity {

    String category;
    @Column(length = 20000)
    String text;
    String presentationVersion;
    boolean published;

    public String getCategory() {
        return this.category;
    }
    public Presentation setCategory(String category) {
        this.category = category;
        return this;
    }

    public String getText() { return this.text; }
    public Presentation setText(String text) {
        this.text = text;
        return this;
    }

    public String getPresentationVersion() {
        return this.presentationVersion;
    }
    public Presentation setPresentationVersion(String presentationVersion) {
        this.presentationVersion = presentationVersion;
        return this;
    }

    public boolean isPublished() { return this.published; }
    public Presentation setPublished(boolean published) {
        this.published = published;
        return this;
    }

}

