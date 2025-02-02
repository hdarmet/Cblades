package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
public class Paragraph extends BaseEntity {

    int ordinal;
    String title="";
    @Column(length = 20000)
    String text="";
    String illustration ="";
    @Enumerated(EnumType.STRING)
    IllustrationPosition illustrationPosition;

    public int getOrdinal() {
        return this.ordinal;
    }
    public Paragraph setOrdinal(int ordinal) {
        this.ordinal = ordinal;
        return this;
    }

    public String getTitle() {
        return this.title;
    }
    public Paragraph setTitle(String title) {
        this.title = title;
        return this;
    }

    public String getText() {
        return this.text;
    }
    public Paragraph setText(String text) {
        this.text = text;
        return this;
    }

    public String getIllustration() {
        return this.illustration;
    }
    public Paragraph setIllustration(String illustration) {
        this.illustration = illustration;
        return this;
    }

    public IllustrationPosition getIllustrationPosition() {
        return this.illustrationPosition;
    }
    public Paragraph setIllustrationPosition(IllustrationPosition illustrationPosition) {
        this.illustrationPosition = illustrationPosition;
        return this;
    }
}
