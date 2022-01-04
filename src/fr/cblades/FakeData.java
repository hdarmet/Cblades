package fr.cblades;

import fr.cblades.domain.*;
import org.summer.annotation.Launch;
import org.summer.data.DataSunbeam;

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
    }

}

