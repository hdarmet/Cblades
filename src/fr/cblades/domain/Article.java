package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Entity
@Table(indexes= {
    @Index(name="idx_article_by_title", unique=true, columnList="title")
})
public class Article extends BaseEntity {

    String title="";
    boolean recent;
    @ManyToMany
    List<Theme> themes = new ArrayList<>();
    @OneToOne(cascade = CascadeType.ALL)
    Paragraph firstParagraph;
    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    Document document;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    LikePoll poll;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Paragraph> paragraphs = new ArrayList<>();
    ArticleStatus status;
    @ManyToOne
    Account author;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    public String getTitle() {
        return this.title;
    }
    public Article setTitle(String title) {
        this.title = title;
        return this;
    }

    public List<Theme> getThemes() {
        return Collections.unmodifiableList(this.themes);
    }
    public Article addTheme(Theme theme) {
        this.themes.add(theme);
        return this;
    }
    public Article removeTheme(Theme theme) {
        this.themes.remove(theme);
        return this;
    }

    public Document getDocument() {
        return this.document;
    }
    public Document buildDocument() {
        StringBuilder textBuilder = new StringBuilder();
        List<Paragraph> paragraphs = new ArrayList<>(this.paragraphs);
        paragraphs.sort(Comparator.comparingInt(p -> p.ordinal));
        for (Paragraph paragraph : paragraphs) {
            textBuilder.append('\n').append(paragraph.title).append('\n').append(paragraph.text);
        }
        String text = textBuilder.toString();
        if (this.document == null || !(this.document.getText().equals(text))) {
            this.document = new Document().setText(text.toString());
        }
        return this.document;
    }

    public boolean getRecent() {
        return this.recent;
    }
    public Article setRecent(boolean recent) {
        this.recent = recent;
        return this;
    }

    public Paragraph getFirstParagraph() {
        return this.firstParagraph;
    }
    public Article setFirstParagraph(Paragraph paragraph) {
        this.firstParagraph = paragraph;
        return this;
    }

    public List<Paragraph> getParagraphs() {
        return Collections.unmodifiableList(this.paragraphs);
    }
    public Paragraph getParagraph(int ordinal) {
        for (Paragraph paragraph : paragraphs) {
            if (paragraph.getOrdinal()==ordinal) return paragraph;
        }
        return null;
    }
    public Article addParagraph(Paragraph paragraph) {
        this.paragraphs.add(paragraph);
        return this;
    }
    public Article removeParagraph(Paragraph paragraph) {
        this.paragraphs.remove(paragraph);
        return this;
    }

    public ArticleStatus getStatus() {
        return this.status;
    }
    public Article setStatus(ArticleStatus status) {
        this.status = status;
        return this;
    }

    public Account getAuthor() {
        return this.author;
    }
    public Article setAuthor(Account author) {
        this.author = author;
        return this;
    }

    public List<Comment> getComments() {
        return Collections.unmodifiableList(this.comments);
    }
    public Article addComment(Comment comment) {
        this.comments.add(comment);
        return this;
    }
    public Article removeComment(Comment comment) {
        this.comments.remove(comment);
        return this;
    }

    public LikePoll getPoll() {
        return this.poll;
    }
    public Article setPoll(LikePoll poll) {
        this.poll = poll;
        return this;
    }
}
