package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_faction_by_name", unique=true, columnList="name")
})
public class Faction extends BaseEntity {

    String name="";
    @Column(length = 20000)
    String description="";
    String illustration="";
    @OneToOne(cascade = CascadeType.ALL)
    Sheet firstSheet;
    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    Document document;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Sheet> sheets = new ArrayList<>();
    @Enumerated(EnumType.STRING)
    FactionStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getName() {
        return this.name;
    }
    public Faction setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public Faction setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getIllustration() {
        return this.illustration;
    }
    public Faction setIllustration(String illustration) {
        this.illustration = illustration;
        return this;
    }

    public Document getDocument() {
        return this.document;
    }
    public Document buildDocument() {
        StringBuilder textBuilder = new StringBuilder();
        List<Sheet> sheets = new ArrayList<>(this.sheets);
        sheets.sort(Comparator.comparingInt(p -> p.ordinal));
        for (Sheet sheet : sheets) {
            textBuilder.append('\n').append(sheet.name).append(sheet.description);
        }
        String text = textBuilder.toString();
        if (this.document == null || !(this.document.getText().equals(text))) {
            this.document = new Document().setText(text.toString());
        }
        return this.document;
    }

    public Sheet getFirstSheet() {
        return this.firstSheet;
    }
    public Faction setFirstSheet(Sheet sheet) {
        this.firstSheet = sheet;
        return this;
    }

    public List<Sheet> getSheets() {
        return Collections.unmodifiableList(this.sheets);
    }
    public Sheet getSheet(int ordinal) {
        for (Sheet sheet : sheets) {
            if (sheet.getOrdinal()==ordinal) return sheet;
        }
        return null;
    }
    public Faction addSheet(Sheet sheet) {
        this.sheets.add(sheet);
        return this;
    }
    public Faction removeSheet(Sheet sheet) {
        this.sheets.remove(sheet);
        return this;
    }

    public FactionStatus getStatus() {
        return this.status;
    }
    public Faction setStatus(FactionStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Faction setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Faction addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Faction removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

}
