package fr.cblades;

import fr.cblades.domain.Banner;
import fr.cblades.domain.Board;
import fr.cblades.domain.Login;
import fr.cblades.domain.Player;
import org.summer.Ref;
import org.summer.annotation.Launch;
import org.summer.annotation.Setup;
import org.summer.data.DataSunbeam;
import org.summer.data.JPAOnHibernate;
import org.summer.security.SecurityManager;

import java.util.logging.Logger;

public class FakeData {

    @Launch
    public static void createBoards() {
        DataSunbeam data = new DataSunbeam() {};
        data.inTransaction(em->{
            data.persist(em, new Board().setName("map1").setPath("./../images/maps/map1.png"));
            data.persist(em, new Board().setName("map2").setPath("./../images/maps/map2.png"));
            data.persist(em, new Board().setName("map3").setPath("./../images/maps/map3.png"));
            data.persist(em, new Board().setName("map4").setPath("./../images/maps/map4.png"));
            data.persist(em, new Board().setName("map5").setPath("./../images/maps/map5.png"));
            data.persist(em, new Board().setName("map6").setPath("./../images/maps/map6.png"));
            data.persist(em, new Board().setName("map7").setPath("./../images/maps/map7.png"));
            data.persist(em, new Board().setName("map8").setPath("./../images/maps/map8.png"));
            data.persist(em, new Board().setName("map9").setPath("./../images/maps/map9.png"));
        });
        data.inTransaction(em->{
            data.persist(em, new Player().setName("orc1").setPath("./../images/units/players/orc-1.png"));
            data.persist(em, new Player().setName("orc2").setPath("./../images/units/players/orc-2.png"));
            data.persist(em, new Player().setName("roughneck1").setPath("./../images/units/players/roughneck-1.png"));
            data.persist(em, new Player().setName("roughneck2").setPath("./../images/units/players/roughneck-2.png"));
        });
        data.inTransaction(em->{
            data.persist(em, new Banner().setName("orc-banner0").setPath("./../images/units/orcs/banners/banner0.png"));
            data.persist(em, new Banner().setName("orc-banner1").setPath("./../images/units/orcs/banners/banner1.png"));
            data.persist(em, new Banner().setName("orc-banner2").setPath("./../images/units/orcs/banners/banner2.png"));
        });
    }

}

