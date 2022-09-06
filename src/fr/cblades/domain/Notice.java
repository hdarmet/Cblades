package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
@Table(indexes=@Index(name="idx_notice", unique=true, columnList="category, noticeVersion"))
public class Notice extends BaseEntity {

    String category;
    String title;
    @Column(length = 20000)
    String text;
    String noticeVersion;
    boolean published;

    public String getCategory() {
        return this.category;
    }
    public Notice setCategory(String category) {
        this.category = category;
        return this;
    }

    public String getTitle() {
        return this.title;
    }
    public Notice setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getText() { return this.text; }
    public Notice setText(String text) {
        this.text = text;
        return this;
    }

    public String getNoticeVersion() {
        return this.noticeVersion;
    }
    public Notice setNoticeVersion(String noticeVersion) {
        this.noticeVersion = noticeVersion;
        return this;
    }

    public boolean isPublished() { return this.published; }
    public Notice setPublished(boolean published) {
        this.published = published;
        return this;
    }

}

