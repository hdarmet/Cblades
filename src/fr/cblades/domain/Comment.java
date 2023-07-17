package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Date;

@Entity
public class Comment extends BaseEntity {

    Date date;
    @Column(length = 20000)
    String text="";
    @ManyToOne
    Account author;

    public Date getDate() {
        return this.date;
    }
    public Comment setDate(Date date) {
        this.date = date;
        return this;
    }

    public String getText() {
        return this.text;
    }
    public Comment setText(String text) {
        this.text = text;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Comment setAuthor(Account author) {
        this.author = author;
        return this;
    }

}

