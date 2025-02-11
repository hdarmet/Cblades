package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.ApplicationManager;
import org.summer.ApplicationManagerForTestImpl;
import org.summer.MockDataManagerImpl;
import org.summer.data.DataSunbeam;

import java.util.ArrayList;
import java.util.Date;

public class ForumTest implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillForumMessage() {
        ForumThread forumThread = new ForumThread()
            .setTitle("A feature about Magic");
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        LikePoll likePoll = new LikePoll();
        Date now = new Date();
        ForumMessage forumMessage = new ForumMessage()
            .setForumThread(forumThread)
            .setText("I want a new feature")
            .setPoll(likePoll)
            .setStatus(ForumMessageStatus.LIVE)
            .setPublishedDate(now)
            .setAuthor(account);
        Assert.assertEquals(forumThread, forumMessage.getForumThread());
        Assert.assertEquals("I want a new feature", forumMessage.getText());
        Assert.assertEquals(likePoll, forumMessage.getPoll());
        Assert.assertEquals(ForumMessageStatus.LIVE, forumMessage.getStatus());
        Assert.assertEquals(now, forumMessage.getPublishedDate());
        Assert.assertEquals(account, forumMessage.getAuthor());
    }

    @Test
    public void fillForum() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        ForumMessage forumMessage = new ForumMessage()
            .setText("I want a new feature");
        Forum forum = new Forum()
            .setStatus(ForumStatus.LIVE)
            .setTitle("New features")
            .setDescription("Place to talk about feature")
            .setThreadCount(10)
            .setMessageCount(425)
            .setLastMessage(forumMessage)
            .setAuthor(account);
        Assert.assertEquals(ForumStatus.LIVE, forum.getStatus());
        Assert.assertEquals("New features", forum.getTitle());
        Assert.assertEquals("Place to talk about feature", forum.getDescription());
        Assert.assertEquals(10, forum.getThreadCount());
        Assert.assertEquals(425, forum.getMessageCount());
        Assert.assertEquals(forumMessage, forum.getLastMessage());
        Assert.assertEquals(account, forum.getAuthor());
    }

    @Test
    public void manageCommentsInRuleSet() {
        Forum forum = new Forum();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(forum, forum
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, forum.getComments());
        Assert.assertEquals(forum, forum.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, forum.getComments());
    }

    @Test
    public void fillForumThread() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Forum forum = new Forum()
            .setTitle("New features");
        ForumMessage forumMessage = new ForumMessage()
            .setText("I want a new feature");
        ForumThread forumThread = new ForumThread()
            .setTitle("A feature about Magic")
            .setForum(forum)
            .setMessageCount(102)
            .setLastMessage(forumMessage)
            .setLikeCount(15)
            .setDescription("Discussion about new magic feature")
            .setStatus(ForumThreadStatus.LIVE)
            .setAuthor(account);
        Assert.assertEquals("A feature about Magic", forumThread.getTitle());
        Assert.assertEquals(forum, forumThread.getForum());
        Assert.assertEquals(102, forumThread.getMessageCount());
        Assert.assertEquals(forumMessage, forumThread.getLastMessage());
        Assert.assertEquals(15, forumThread.getlikeCount());
        Assert.assertEquals("Discussion about new magic feature", forumThread.getDescription());
        Assert.assertEquals(ForumThreadStatus.LIVE, forumThread.getStatus());
        Assert.assertEquals(account, forumThread.getAuthor());
    }

    @Test
    public void manageCommentsInForumThread() {
        ForumThread forumThread = new ForumThread();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(forumThread, forumThread
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, forumThread.getComments());
        Assert.assertEquals(forumThread, forumThread.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, forumThread.getComments());
    }
}
