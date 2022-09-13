package fr.cblades;

import fr.cblades.domain.*;
import org.summer.annotation.Launch;
import org.summer.data.DataSunbeam;

import java.util.Date;

public class FakeData {

    @Launch
    public static void createBoards() {
        DataSunbeam data = new DataSunbeam() {};
        data.inTransaction(em->{
            data.persist(em, new Board().setName("map1").setPath("./../images/maps/map1.png").setIcon("./../images/maps/map1-icon.png"));
            data.persist(em, new Board().setName("map2").setPath("./../images/maps/map2.png").setIcon("./../images/maps/map2-icon.png"));
            data.persist(em, new Board().setName("map3").setPath("./../images/maps/map3.png").setIcon("./../images/maps/map3-icon.png"));
            data.persist(em, new Board().setName("map4").setPath("./../images/maps/map4.png").setIcon("./../images/maps/map4-icon.png"));
            data.persist(em, new Board().setName("map5").setPath("./../images/maps/map5.png").setIcon("./../images/maps/map5-icon.png"));
            data.persist(em, new Board().setName("map6").setPath("./../images/maps/map6.png").setIcon("./../images/maps/map6-icon.png"));
            data.persist(em, new Board().setName("map7").setPath("./../images/maps/map7.png").setIcon("./../images/maps/map7-icon.png"));
            data.persist(em, new Board().setName("map8").setPath("./../images/maps/map8.png").setIcon("./../images/maps/map8-icon.png"));
            data.persist(em, new Board().setName("map9").setPath("./../images/maps/map9.png").setIcon("./../images/maps/map9-icon.png"));
            data.persist(em, new Board().setName("map10").setPath("./../images/maps/map10.png").setIcon("./../images/maps/map10-icon.png"));
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
    }

    static String TINY_PARAGRAPH_TEXT = "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit";

    static String SHORT_PARAGRAPH_TEXT = TINY_PARAGRAPH_TEXT + TINY_PARAGRAPH_TEXT;

    static String PARAGRAPH_TEXT = SHORT_PARAGRAPH_TEXT + SHORT_PARAGRAPH_TEXT;

    static String LONG_PARAGRAPH_TEXT = PARAGRAPH_TEXT + PARAGRAPH_TEXT;
}

