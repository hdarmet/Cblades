package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.ApplicationManager;
import org.summer.ApplicationManagerForTestImpl;
import org.summer.MockDataManagerImpl;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;

import javax.persistence.NoResultException;
import java.util.ArrayList;
import java.util.Date;

public class ArticleTest implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillComment() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Date now = new Date();
        Comment comment = new Comment()
            .setDate(now)
            .setText("The content of the comment")
            .setAuthor(account);
        Assert.assertEquals(now, comment.getDate());
        Assert.assertEquals("The content of the comment", comment.getText());
        Assert.assertEquals(account, comment.getAuthor());
    }

    @Test
    public void fillTheme() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Theme theme = new Theme()
            .setTitle("Magic")
            .setDescription("Description of Magic")
            .setIllustration("magic.png")
            .setStatus(ThemeStatus.LIVE)
            .setCategory(ThemeCategory.LEGEND)
            .setAuthor(account);
        Assert.assertEquals("Magic", theme.getTitle());
        Assert.assertEquals("Description of Magic", theme.getDescription());
        Assert.assertEquals("magic.png", theme.getIllustration());
        Assert.assertEquals(ThemeStatus.LIVE, theme.getStatus());
        Assert.assertEquals(ThemeCategory.LEGEND, theme.getCategory());
        Assert.assertEquals(account, theme.getAuthor());
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(theme, theme
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, theme.getComments());
        Assert.assertEquals(theme, theme.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, theme.getComments());
    }

    @Test
    public void findThemeById() {
        Theme theme = new Theme()
                .setTitle("Magic");
        dataManager.register("find", theme, null, Theme.class, 1L);
        inTransaction(em->{
            Assert.assertEquals(theme, Theme.find(em, 1L));
        });
    }

    @Test
    public void tryToFindUnknownThemeById() {
        dataManager.register("find", null, null, Theme.class, 1L);
        inTransaction(em->{
            try {
                Theme.find(em, 1L);
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Theme with id 1", snfe.getMessage());
            }
        });
    }

    @Test
    public void findThemeByTitle() {
        Theme theme = new Theme()
                .setTitle("Magic");
        dataManager.register("createQuery", null, null,
                "select t from Theme t left outer join fetch t.author a left outer join fetch a.access where t.title = :title");
        dataManager.register("setParameter", null, null,"title", "Magic");
        dataManager.register("getSingleResult", theme, null);
        inTransaction(em->{
            Assert.assertEquals(theme, Theme.getByTitle(em, "Magic"));
        });
    }

    @Test
    public void tryToFindAnUnknownThemeByTitle() {
        dataManager.register("createQuery", null, null,
                "select t from Theme t left outer join fetch t.author a left outer join fetch a.access where t.title = :title");
        dataManager.register("setParameter", null, null,"title", "Magic");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            Assert.assertNull(Theme.getByTitle(em, "Magic"));
        });
    }

    @Test
    public void fillLikePoll() {
        LikePoll likePoll = new LikePoll()
            .setLikes(10)
            .setDislikes(4);
        Assert.assertEquals(10, likePoll.getLikes());
        Assert.assertEquals(4, likePoll.getDislikes());
        Assert.assertEquals(10, likePoll.addLike());
        Assert.assertEquals(11, likePoll.getLikes());
        Assert.assertEquals(11, likePoll.removeLike());
        Assert.assertEquals(10, likePoll.getLikes());
        Assert.assertEquals(4, likePoll.addDislike());
        Assert.assertEquals(5, likePoll.getDislikes());
        Assert.assertEquals(5, likePoll.removeDislike());
        Assert.assertEquals(4, likePoll.getDislikes());
    }

    @Test
    public void fillLikeVote() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        LikePoll likePoll = new LikePoll();
        LikeVote likeVote = new LikeVote()
            .setPoll(likePoll)
            .setVoter(account)
            .setOption(LikeVoteOption.LIKE);
        Assert.assertEquals(likePoll, likeVote.getPoll());
        Assert.assertEquals(account, likeVote.getVoter());
        Assert.assertEquals(LikeVoteOption.LIKE, likeVote.getOption());
    }

    @Test
    public void findLikePollById() {
        LikePoll likePoll = new LikePoll();
        dataManager.register("find", likePoll, null, LikePoll.class, 1L);
        inTransaction(em->{
            Assert.assertEquals(likePoll, LikePoll.find(em, 1L));
        });
    }

    @Test
    public void tryToFindUnknownLikePollById() {
        dataManager.register("find", null, null, LikePoll.class, 1L);
        inTransaction(em->{
            try {
                LikePoll.find(em, 1L);
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("Unknown Poll with id 1", snfe.getMessage());
            }
        });
    }

    @Test
    public void fillParagraph() {
        Paragraph paragraph = new Paragraph()
            .setTitle("The beginning of Magic")
            .setOrdinal(1)
            .setIllustration("magic.png")
            .setIllustrationPosition(IllustrationPosition.LEFT)
            .setText("A long text about magic");
        Assert.assertEquals("The beginning of Magic", paragraph.getTitle());
        Assert.assertEquals(1, paragraph.getOrdinal());
        Assert.assertEquals("magic.png", paragraph.getIllustration());
        Assert.assertEquals(IllustrationPosition.LEFT, paragraph.getIllustrationPosition());
        Assert.assertEquals("A long text about magic", paragraph.getText());
    }

    @Test
    public void fillArticle() {
        LikePoll likePoll = new LikePoll();
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Article article = new Article()
            .setTitle("Doing Magic")
            .setPoll(likePoll)
            .setAuthor(account)
            .setRecent(true)
            .setStatus(ArticleStatus.LIVE);
        Assert.assertEquals("Doing Magic", article.getTitle());
        Assert.assertEquals(likePoll, article.getPoll());
        Assert.assertEquals(account, article.getAuthor());
        Assert.assertTrue(article.getRecent());
        Assert.assertEquals(ArticleStatus.LIVE, article.getStatus());
        Theme theme1 = new Theme().setTitle("Magic");
        Theme theme2 = new Theme().setTitle("History");
        Assert.assertEquals(article, article
            .addTheme(theme1)
            .addTheme(theme2)
        );
        Assert.assertEquals(new ArrayList<Theme>() {{
            add(theme1);
            add(theme2);
        }}, article.getThemes());
        Assert.assertEquals(article, article.removeTheme(theme1));
        Assert.assertEquals(new ArrayList<Theme>() {{
            add(theme2);
        }}, article.getThemes());
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(article, article
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, article.getComments());
        Assert.assertEquals(article, article.removeComment(comment1));
        Assert.assertEquals(article, article
            .addComment(comment2)
        );
        Paragraph paragraph1 = new Paragraph().setTitle("At start...")
            .setText("Once upon a time...").setOrdinal(0);
        Paragraph paragraph2 = new Paragraph().setTitle("And then...")
            .setText("Many things happen...").setOrdinal(1);
        Paragraph paragraph3 = new Paragraph().setTitle("At the end...")
            .setText("Everything was fine...").setOrdinal(2);
        Assert.assertEquals(article, article
            .addParagraph(paragraph1)
            .setFirstParagraph(paragraph1)
            .addParagraph(paragraph2)
            .addParagraph(paragraph3)
        );
        Assert.assertEquals(new ArrayList<Paragraph>() {{
            add(paragraph1);
            add(paragraph2);
            add(paragraph3);
        }}, article.getParagraphs());
        Document document = article.buildDocument();
        Assert.assertEquals(document, article.getDocument());
        Assert.assertEquals("\n" +
            "At start...\n" +
            "Once upon a time...\n" +
            "And then...\n" +
            "Many things happen...\n" +
            "At the end...\n" +
            "Everything was fine...",
            document.getText());
        Assert.assertEquals(paragraph1, article.getFirstParagraph());
        Assert.assertEquals(paragraph2, article.getParagraph(1));
        Assert.assertNull(article.getParagraph(3));
        Assert.assertEquals(article, article.removeParagraph(paragraph2));
        Assert.assertEquals(new ArrayList<Paragraph>() {{
            add(paragraph1);
            add(paragraph3);
        }}, article.getParagraphs());
    }

}
