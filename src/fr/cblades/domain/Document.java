package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import java.util.Date;

@Entity
public class Document extends BaseEntity {

    @Column(length = 20000)
    String text="";

    public String getText() {
        return this.text;
    }
    public Document setText(String text) {
        this.text = text;
        return this;
    }

}

