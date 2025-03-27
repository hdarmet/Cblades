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

public class MiscellanousWebSiteEntityTest  implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillAnnouncement() {
        Announcement announcement = new Announcement()
            .setIllustration("announcement.png")
            .setStatus(AnnouncementStatus.COMING_SOON)
            .setDescription("A big great announcement !");
        Assert.assertEquals("announcement.png", announcement.getIllustration());
        Assert.assertEquals(AnnouncementStatus.COMING_SOON, announcement.getStatus());
        Assert.assertEquals("A big great announcement !", announcement.getDescription());
    }

    @Test
    public void fillEvent() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Date now = new Date();
        Event event = new Event()
            .setTitle("New event")
            .setDate(now)
            .setTarget(account)
            .setIllustration("event.png")
            .setStatus(EventStatus.COMING_SOON)
            .setDescription("An exciting event !");
        Assert.assertEquals("New event", event.getTitle());
        Assert.assertEquals(now, event.getDate());
        Assert.assertEquals(account, event.getTarget());
        Assert.assertEquals("event.png", event.getIllustration());
        Assert.assertEquals(EventStatus.COMING_SOON, event.getStatus());
        Assert.assertEquals("An exciting event !", event.getDescription());
    }

    @Test
    public void fillMessageModel() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        MessageModel messageModel = new MessageModel()
            .setTitle("Standard")
            .setAuthor(account)
            .setCategory(MessageModelCategory.MESSAGE_AUTHOR)
            .setStatus(MessageModelStatus.PENDING)
            .setText("The text of the message model");
        Assert.assertEquals("Standard", messageModel.getTitle());
        Assert.assertEquals(account, messageModel.getAuthor());
        Assert.assertEquals(MessageModelCategory.MESSAGE_AUTHOR, messageModel.getCategory());
        Assert.assertEquals(MessageModelStatus.PENDING, messageModel.getStatus());
        Assert.assertEquals("The text of the message model", messageModel.getText());
    }

    @Test
    public void fillMap() {
        MessageModel messageModel = new MessageModel();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(messageModel, messageModel
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, messageModel.getComments());
        Assert.assertEquals(messageModel, messageModel.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, messageModel.getComments());
    }

    @Test
    public void fillNoticel() {
        Notice notice = new Notice()
            .setNoticeVersion("1.01")
            .setTitle("Be careful")
            .setPublished(true)
            .setText("A text about a new thread.")
            .setCategory("General");
        Assert.assertEquals("1.01", notice.getNoticeVersion());
        Assert.assertEquals("Be careful", notice.getTitle());
        Assert.assertTrue(notice.isPublished());
        Assert.assertEquals("A text about a new thread.", notice.getText());
        Assert.assertEquals("General", notice.getCategory());
    }

    @Test
    public void fillReport() {
        Date now = new Date();
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Report report = new Report()
            .setReason("Scam")
            .setSendDate(now)
            .setStatus(ReportStatus.CANCELLED)
            .setCategory("Issue")
            .setText("Description of the issue")
            .setAuthor(account)
            .setTarget(3);
        Assert.assertEquals("Scam", report.getReason());
        Assert.assertEquals(now, report.getSendDate());
        Assert.assertEquals(ReportStatus.CANCELLED, report.getStatus());
        Assert.assertEquals("Issue", report.getCategory());
        Assert.assertEquals("Description of the issue", report.getText());
        Assert.assertEquals(account, report.getAuthor());
        Assert.assertEquals(3, report.getTarget());
    }

    @Test
    public void fillPresentation() {
        Date now = new Date();
        Presentation presentation = new Presentation()
            .setPresentationVersion("1.01")
            .setPublished(true)
            .setCategory("History")
            .setText("The greatest battles in History.");
        Assert.assertEquals("1.01", presentation.getPresentationVersion());
        Assert.assertTrue(presentation.isPublished());
        Assert.assertEquals("History", presentation.getCategory());
        Assert.assertEquals("The greatest battles in History.", presentation.getText());
    }

}
