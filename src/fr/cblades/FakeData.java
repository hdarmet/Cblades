package fr.cblades;

import fr.cblades.domain.*;
import org.summer.annotation.Launch;
import org.summer.data.DataSunbeam;

import java.util.Date;

public class FakeData {

    @Launch
    public static void createData() {
        DataSunbeam data = new DataSunbeam() {};
        data.inTransaction(em->{
            data.persist(em, new Board().setName("board1").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-1.png").setIcon("./../images/maps/map-1-icon.png")
                .addComment(new Comment().setDate(new Date()).setText(TINY_PARAGRAPH_TEXT))
                .addComment(new Comment().setDate(new Date()).setText(SHORT_PARAGRAPH_TEXT))
                .addComment(new Comment().setDate(new Date()).setText(TINY_PARAGRAPH_TEXT))
                .addComment(new Comment().setDate(new Date()).setText(SHORT_PARAGRAPH_TEXT))
                .addComment(new Comment().setDate(new Date()).setText(TINY_PARAGRAPH_TEXT))
                .addComment(new Comment().setDate(new Date()).setText(SHORT_PARAGRAPH_TEXT))
            );
            data.persist(em, new Board().setName("board2").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-2.png").setIcon("./../images/maps/map-2-icon.png"));
            data.persist(em, new Board().setName("board3").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-3.png").setIcon("./../images/maps/map-3-icon.png"));
            data.persist(em, new Board().setName("board4").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-4.png").setIcon("./../images/maps/map-4-icon.png"));
            data.persist(em, new Board().setName("board5").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-5.png").setIcon("./../images/maps/map-5-icon.png"));
            data.persist(em, new Board().setName("board6").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-6.png").setIcon("./../images/maps/map-6-icon.png"));
            data.persist(em, new Board().setName("board7").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-7.png").setIcon("./../images/maps/map-7-icon.png"));
            data.persist(em, new Board().setName("board8").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-8.png").setIcon("./../images/maps/map-8-icon.png"));
            data.persist(em, new Board().setName("board9").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-9.png").setIcon("./../images/maps/map-9-icon.png"));
            data.persist(em, new Board().setName("board10").setStatus(BoardStatus.LIVE).setDescription(TINY_PARAGRAPH_TEXT).setPath("./../images/maps/map-10.png").setIcon("./../images/maps/map-10-icon.png"));
        });
        data.inTransaction(em->{
            data.persist(em, new PlayerIdentity().setName("orc-1").setPath("./../images/units/players/orc-1.png"));
            data.persist(em, new PlayerIdentity().setName("orc-2").setPath("./../images/units/players/orc-2.png"));
            data.persist(em, new PlayerIdentity().setName("roughneck-1").setPath("./../images/units/players/roughneck-1.png"));
            data.persist(em, new PlayerIdentity().setName("roughneck-2").setPath("./../images/units/players/roughneck-2.png"));
        });
        data.inTransaction(em->{
            data.persist(em, new Banner().setName("orc-banner-0").setPath("./../images/units/orcs/banners/banner0.png"));
            data.persist(em, new Banner().setName("orc-banner-1").setPath("./../images/units/orcs/banners/banner1.png"));
            data.persist(em, new Banner().setName("orc-banner-2").setPath("./../images/units/orcs/banners/banner2.png"));
            data.persist(em, new Banner().setName("roughneck-banner-0").setPath("./../images/units/mercenaries/banners/banner0.png"));
            data.persist(em, new Banner().setName("roughneck-banner-1").setPath("./../images/units/mercenaries/banners/banner1.png"));
            data.persist(em, new Banner().setName("roughneck-banner-2").setPath("./../images/units/mercenaries/banners/banner2.png"));
        });
        data.inTransaction(em->{
            Account temrad = new Account()
                .setFirstName("Henri").setLastName("Darmet").setEmail("hdarmet@gmail.com")
                .setAccess(new Login().setLogin("temrad").setPassword(Login.encrypt("P@ssW0rd.")))
                .setAvatar("../images/site/avatars/my-avatar.png").setStatus(AccountStatus.ACTIVE);
            data.persist(em, temrad);
            long now = new Date().getTime();
            for (int index=0; index<10; index++) {
                Event event = new Event()
                    .setDescription(SHORT_PARAGRAPH_TEXT)
                    .setDate(new Date(now+index*10))
                    .setTitle("Iste natus error sit voluptatem "+index)
                    .setIllustration("../images/site/left-legends.png")
                    .setTarget(temrad)
                    .setStatus(EventStatus.LIVE);
                data.persist(em, event);
                event = new Event()
                    .setDescription(SHORT_PARAGRAPH_TEXT)
                    .setDate(new Date(now+1+index*10))
                    .setTitle("Iste natus error sit voluptatem "+index)
                    .setTarget(temrad)
                    .setStatus(EventStatus.LIVE);
                data.persist(em, event);
            }
        });
        data.inTransaction(em->{
            Notice notice = new Notice()
                .setCategory("forgot-password-mail").setTitle("Forgot My Password").setText("Reniew one more time %s")
                .setNoticeVersion("0.2").setPublished(false);
            data.persist(em, notice);
            notice = new Notice()
                .setCategory("forgot-password-mail").setTitle("Forgot My Password One More Time").setText("Ok try this one : %s")
                .setNoticeVersion("0.3").setPublished(false);
            data.persist(em, notice);
        });
        data.inTransaction(em->{
            Presentation presentation = new Presentation()
                .setCategory("edit-board-presentation").setText("Another text to describe board contribution.")
                .setPresentationVersion("0.2").setPublished(false);
            data.persist(em, presentation);
        });
        data.inTransaction(em-> {
            Announcement announcement = new Announcement()
                .setDescription(PARAGRAPH_TEXT)
                .setIllustration("../../images/scenarii/scenario1.png")
                .setStatus(AnnouncementStatus.LIVE);
            data.persist(em, announcement);
            announcement = new Announcement()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setIllustration("../../images/site/factions/grunedeborg.png")
                .setStatus(AnnouncementStatus.LIVE);
            data.persist(em, announcement);
            announcement = new Announcement()
                .setDescription(LONG_PARAGRAPH_TEXT)
                .setIllustration("../../images/maps/map-12.png")
                .setStatus(AnnouncementStatus.LIVE);
            data.persist(em, announcement);
        });
        data.inTransaction(em-> {
            long now = new Date().getTime();
            for (int index=0; index<10; index++) {
                Event event = new Event()
                    .setDescription(SHORT_PARAGRAPH_TEXT)
                    .setDate(new Date(now+index*10))
                    .setTitle("Iste natus error sit voluptatem "+index)
                    .setIllustration("../images/site/right-legends.png")
                    .setStatus(EventStatus.LIVE);
                data.persist(em, event);
                event = new Event()
                    .setDescription(SHORT_PARAGRAPH_TEXT)
                    .setDate(new Date(now+1+index*10))
                    .setTitle("Iste natus error sit voluptatem "+index)
                    .setStatus(EventStatus.LIVE);
                data.persist(em, event);
            }
        });
        data.inTransaction(em-> {
            Theme theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Rules")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/rules.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Strategies And Tactics")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/strategy.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Units")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/units.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Magic")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/magic.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Scenario")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/scenario.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Campains")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/campains.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("History")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/history.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Siege")
                .setCategory(ThemeCategory.GAME)
                .setIllustration("../images/site/themes/siege.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
        });
    }

    static String TINY_PARAGRAPH_TEXT = "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit";

    static String SHORT_PARAGRAPH_TEXT = TINY_PARAGRAPH_TEXT + TINY_PARAGRAPH_TEXT;

    static String PARAGRAPH_TEXT = SHORT_PARAGRAPH_TEXT + SHORT_PARAGRAPH_TEXT;

    static String LONG_PARAGRAPH_TEXT = PARAGRAPH_TEXT + PARAGRAPH_TEXT;
}

