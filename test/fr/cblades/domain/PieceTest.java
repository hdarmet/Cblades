package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.ApplicationManager;
import org.summer.ApplicationManagerForTestImpl;
import org.summer.MockDataManagerImpl;
import org.summer.data.BaseEntity;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;

import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import java.util.*;
import java.util.function.Predicate;

public class PieceTest implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillPiece() {
        Piece piece = new Piece() {
            @Override
            public String getName() { return null; }
            public Piece duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) { return null; }
        }
        .setAngle(30)
        .setPositionAngle(60)
        .setPositionCol(2)
        .setPositionRow(3)
        .setType("Unit");
        Assert.assertEquals(30, piece.getAngle());
        Assert.assertEquals(60L, (long)piece.getPositionAngle());
        Assert.assertEquals(2, piece.getPositionCol());
        Assert.assertEquals(3, piece.getPositionRow());
        Assert.assertEquals("Unit", piece.getType());
    }

    @Test
    public void copyPiece() {
        Piece piece = new Piece() {
            @Override
            public String getName() { return null; }
            public Piece duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) { return null; }
        }
        .setAngle(30)
        .setPositionAngle(60)
        .setPositionCol(2)
        .setPositionRow(3)
        .setType("Unit");
        Piece copy = new Piece() {
            @Override
            public String getName() { return null; }
            public Piece duplicate(EntityManager em, java.util.Map<BaseEntity, BaseEntity> duplications) { return null; }
        };
        copy.copy(piece);
        Assert.assertEquals(30, copy.getAngle());
        Assert.assertEquals(60L, (long)copy.getPositionAngle());
        Assert.assertEquals(2, copy.getPositionCol());
        Assert.assertEquals(3, copy.getPositionRow());
        Assert.assertEquals("Unit", copy.getType());
    }

    @Test
    public void fillBanner() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Banner banner = new Banner()
            .setPath("redflag.png")
            .setStatus(BannerStatus.PENDING)
            .setName("Red Kingdom")
            .setDescription("Strong fire faction's flag")
            .setAuthor(account);
        Assert.assertEquals("redflag.png", banner.getPath());
        Assert.assertEquals(BannerStatus.PENDING, banner.getStatus());
        Assert.assertEquals("Red Kingdom", banner.getName());
        Assert.assertEquals("Strong fire faction's flag", banner.getDescription());
        Assert.assertEquals(account, banner.getAuthor());
    }

    @Test
    public void manageCommentsInBanner() {
        Banner banner = new Banner();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(banner, banner
                .addComment(comment1)
                .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, banner.getComments());
        Assert.assertEquals(banner, banner.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, banner.getComments());
    }

    @Test
    public void findBannerByName() {
        Banner banner = new Banner()
            .setName("Red Kingdom");
        dataManager.register("createQuery", null, null,
            "select b from Banner b where b.name = :name");
        dataManager.register("setParameter", null, null,"name", "Red Kingdom");
        dataManager.register("getSingleResult", banner, null);
        inTransaction(em->{
            Assert.assertEquals(banner, Banner.getByName(em, "Red Kingdom"));
        });
    }

    @Test
    public void tryToFindAnUnknownBannerByName() {
        dataManager.register("createQuery", null, null,
                "select b from Banner b where b.name = :name");
        dataManager.register("setParameter", null, null,"name", "Red Kingdom");
        dataManager.register("getSingleResult", null, new NoResultException());
        inTransaction(em->{
            Assert.assertNull(Banner.getByName(em, "Red Kingdom"));
        });
    }

    @Test
    public void fillUnit() {
        Wing wing = new Wing();
        Unit unit = new Unit()
            .setName("Orc-1")
            .setSteps(2)
            .setPlayed(true)
            .setCohesion(Cohesion.GOOD_ORDER)
            .setTiredness(Tiredness.FRESH)
            .setAmmunition(Ammunition.SCARCE)
            .setCategory(UnitCategory.TROOP)
            .setPlayed(true)
            .setEngaging(true)
            .setCharging(true)
            .setOrderGiven(false)
            .setContact(false)
            .setAngle(30)
            .setPositionAngle(60)
            .setPositionCol(2)
            .setPositionRow(3)
            .setType("Unit");
        unit.wing = wing;
        Assert.assertEquals("Orc-1", unit.getName());
        Assert.assertEquals(2, unit.getSteps());
        Assert.assertTrue(unit.isPlayed());
        Assert.assertEquals(Cohesion.GOOD_ORDER, unit.getCohesion());
        Assert.assertEquals(Tiredness.FRESH, unit.getTiredness());
        Assert.assertEquals(Ammunition.SCARCE, unit.getAmmunition());
        Assert.assertEquals(UnitCategory.TROOP, unit.getCategory());
        Assert.assertTrue(unit.isPlayed());
        Assert.assertTrue(unit.isEngaging());
        Assert.assertTrue(unit.isCharging());
        Assert.assertFalse(unit.isOrderGiven());
        Assert.assertFalse(unit.isContact());
        Assert.assertEquals(30, unit.getAngle());
        Assert.assertEquals(60L, (long)unit.getPositionAngle());
        Assert.assertEquals(2, unit.getPositionCol());
        Assert.assertEquals(3, unit.getPositionRow());
        Assert.assertEquals("Unit", unit.getType());
        Assert.assertEquals(wing, unit.getWing());
    }

    @Test
    public void copyUnit() {
        Unit unit = new Unit()
            .setName("Orc-1")
            .setSteps(2)
            .setPlayed(true)
            .setCohesion(Cohesion.GOOD_ORDER)
            .setTiredness(Tiredness.FRESH)
            .setAmmunition(Ammunition.SCARCE)
            .setCategory(UnitCategory.TROOP)
            .setPlayed(true)
            .setEngaging(true)
            .setCharging(true)
            .setOrderGiven(false)
            .setContact(false)
            .setAngle(30)
            .setPositionAngle(60)
            .setPositionCol(2)
            .setPositionRow(3)
            .setType("Unit");
        Unit copy = new Unit();
        copy.copy(unit);
        Assert.assertEquals("Orc-1", copy.getName());
        Assert.assertEquals(2, copy.getSteps());
        Assert.assertTrue(copy.isPlayed());
        Assert.assertEquals(Cohesion.GOOD_ORDER, copy.getCohesion());
        Assert.assertEquals(Tiredness.FRESH, copy.getTiredness());
        Assert.assertEquals(Ammunition.SCARCE, copy.getAmmunition());
        Assert.assertEquals(UnitCategory.TROOP, copy.getCategory());
        Assert.assertTrue(copy.isPlayed());
        Assert.assertTrue(copy.isEngaging());
        Assert.assertTrue(copy.isCharging());
        Assert.assertFalse(copy.isOrderGiven());
        Assert.assertFalse(copy.isContact());
        Assert.assertEquals(30, copy.getAngle());
        Assert.assertEquals(60L, (long)copy.getPositionAngle());
        Assert.assertEquals(2, copy.getPositionCol());
        Assert.assertEquals(3, copy.getPositionRow());
        Assert.assertEquals("Unit", copy.getType());
    }

    @Test
    public void duplicateUnit() {
        Unit unit = new Unit().setName("Orc-1");
        Unit[] copy = new Unit[1];
        dataManager.register("persist", null, null, (Predicate) entity->{
            copy[0] = (Unit)entity;
            return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em->{
           unit.duplicate(em, duplications);
           Assert.assertNotNull(copy[0]);
           Assert.assertEquals(copy[0], duplications.get(unit));
        });
    }

    @Test
    public void fillToken() {
        Token token = new Token()
            .setWizard("Wiz-1")
            .setPlayed(true)
            .setDensity(false)
            .setFire(true)
            .setLevel(0)
            .setAngle(30)
            .setPositionAngle(60)
            .setPositionCol(2)
            .setPositionRow(3)
            .setType("Spell");
        Assert.assertEquals("Spell(2,3)", token.getName());
        Assert.assertEquals("Wiz-1", token.getWizard());
        Assert.assertTrue(token.isPlayed());
        Assert.assertFalse(token.getDensity());
        Assert.assertTrue(token.getFire());
        Assert.assertEquals(0L, (long)token.getLevel());
        Assert.assertEquals(30, token.getAngle());
        Assert.assertEquals(60L, (long)token.getPositionAngle());
        Assert.assertEquals(2, token.getPositionCol());
        Assert.assertEquals(3, token.getPositionRow());
        Assert.assertEquals("Spell", token.getType());
    }

    @Test
    public void copyToken() {
        Token token = new Token()
            .setWizard("Wiz-1")
            .setPlayed(true)
            .setDensity(false)
            .setFire(true)
            .setLevel(0)
            .setAngle(30)
            .setPositionAngle(60)
            .setPositionCol(2)
            .setPositionRow(3)
            .setType("Spell");
        Token copy = new Token();
        copy.copy(token);
        Assert.assertEquals("Spell(2,3)", copy.getName());
        Assert.assertEquals("Wiz-1", copy.getWizard());
        Assert.assertTrue(copy.isPlayed());
        Assert.assertFalse(copy.getDensity());
        Assert.assertTrue(copy.getFire());
        Assert.assertEquals(0L, (long)copy.getLevel());
        Assert.assertEquals(30, copy.getAngle());
        Assert.assertEquals(60L, (long)copy.getPositionAngle());
        Assert.assertEquals(2, copy.getPositionCol());
        Assert.assertEquals(3, copy.getPositionRow());
        Assert.assertEquals("Spell", copy.getType());
    }

    @Test
    public void duplicateToken() {
        Token token = new Token().setWizard("Wiz-1");
        Token[] copy = new Token[1];
        dataManager.register("persist", null, null, (Predicate) entity->{
            copy[0] = (Token)entity;
            return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em->{
            token.duplicate(em, duplications);
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(token));
        });
    }

    @Test
    public void fillHexTarget() {
        TargetHex targetHex = new TargetHex().setCol(0).setRow(1);
        Assert.assertEquals(0, targetHex.getCol());
        Assert.assertEquals(1, targetHex.getRow());
    }

    @Test
    public void fillWing() {
        Unit leader = new Unit().setName("Orc-chief");
        Banner banner = new Banner().setName("Red Kingdom");
        Wing wing = new Wing()
            .setLeader(leader)
            .setBanner(banner)
            .setOrderInstruction(OrderInstruction.DEFEND)
            .setMoral(11)
            .setTiredness(10);
        Assert.assertEquals(leader, wing.getLeader());
        Assert.assertEquals(banner, wing.getBanner());
        Assert.assertEquals(OrderInstruction.DEFEND, wing.getOrderInstruction());
        Assert.assertEquals(11, wing.getMoral());
        Assert.assertEquals(10, wing.getTiredness());
    }

    @Test
    public void manageTargetHexesInWing() {
        Wing wing = new Wing();
        TargetHex targetHex1 = new TargetHex().setCol(0).setRow(1);
        TargetHex targetHex2 = new TargetHex().setCol(0).setRow(2);
        Assert.assertEquals(wing, wing
            .addToRetreatZone(targetHex1)
            .addToRetreatZone(targetHex2)
        );
        Assert.assertEquals(new ArrayList<TargetHex>() {{
            add(targetHex1);
            add(targetHex2);
        }}, wing.getRetreatZone());
        Assert.assertEquals(wing, wing.removeFromRetreatZone(targetHex1));
        Assert.assertEquals(new ArrayList<TargetHex>() {{
            add(targetHex2);
        }}, wing.getRetreatZone());
    }

    @Test
    public void unitManagementInWing() {
        Wing wing = new Wing();
        Unit unit1 = new Unit().setName("Orc-1");
        Unit unit2 = new Unit().setName("Orc-2");
        Assert.assertEquals(wing, wing
            .addUnit(unit1)
            .addUnit(unit2)
        );
        Assert.assertEquals(new ArrayList<Unit>() {{
            add(unit1);
            add(unit2);
        }}, wing.getUnits());
        Assert.assertEquals(unit1, wing.getUnit("Orc-1"));
        Assert.assertEquals(wing, wing.removeUnit(unit1));
        Assert.assertNull(wing.getUnit("Orc-1"));
        Assert.assertEquals(new ArrayList<Unit>() {{
            add(unit2);
        }}, wing.getUnits());
    }

    @Test
    public void duplicateWing() {
        Unit unit1 = new Unit().setName("Orc-1");
        Unit unit2 = new Unit().setName("Orc-2");
        TargetHex targetHex1 = new TargetHex().setCol(0).setRow(1);
        TargetHex targetHex2 = new TargetHex().setCol(0).setRow(2);
        Wing wing = new Wing()
            .addUnit(unit1)
            .addUnit(unit2)
            .addToRetreatZone(targetHex1)
            .addToRetreatZone(targetHex2);
        Object[] copy = new Object[5];
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[0] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[1] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[2] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[3] = entity; return true;
        });
        dataManager.register("persist", null, null, (Predicate) entity -> {
            copy[4] = entity; return true;
        });
        java.util.Map<BaseEntity, BaseEntity> duplications = new HashMap<>();
        inTransaction(em->{
            wing.duplicate(em, duplications);
            Assert.assertNotNull(copy[0]);
            Assert.assertEquals(copy[0], duplications.get(unit1));
            Assert.assertNotNull(copy[1]);
            Assert.assertEquals(copy[1], duplications.get(unit2));
            Assert.assertNotNull(copy[2]);
            Assert.assertEquals(copy[2], duplications.get(targetHex1));
            Assert.assertNotNull(copy[3]);
            Assert.assertEquals(copy[3], duplications.get(targetHex2));
            Assert.assertNotNull(copy[4]);
            Assert.assertEquals(copy[4], duplications.get(wing));
        });
    }

    @Test
    public void findWingByUnit() {
        Unit unit1 = new Unit().setName("Orc-1");
        Wing wing = new Wing().addUnit(unit1);
        dataManager.register("createQuery", null, null,
                "select w from Wing w where :unit member of w.units");
        dataManager.register("setParameter", null, null,"unit", unit1);
        dataManager.register("getSingleResult", wing, null);
        inTransaction(em->{
            Assert.assertEquals(wing, Wing.findWing(em, unit1));
        });
    }

    @Test
    public void tryToFindAnUnknownWingByUnit() {
        Unit unit1 = new Unit().setName("Orc-1");
        dataManager.register("createQuery", null, null,
                "select w from Wing w where :unit member of w.units");
        dataManager.register("setParameter", null, null,"unit", unit1);
        dataManager.register("getSingleResult", null, null);
        inTransaction(em->{
            try {
                Wing.findWing(em, unit1);
                Assert.fail("A Not Found exception should be raised at this point");
            }
            catch(SummerNotFoundException snfe) {
                Assert.assertEquals("No Wing contains unit of id: 0", snfe.getMessage());
            }
        });
    }

    @Test
    public void collectPieces() {
        Unit orc1 = new Unit().setName("orc1");
        Unit orc2 = new Unit().setName("orc2");
        Unit orc3 = new Unit().setName("orc3");
        Unit orc4 = new Unit().setName("orc4");
        Wing wing1 = new Wing().addUnit(orc1);
        Wing wing2 = new Wing().addUnit(orc2).addUnit(orc3);
        Player player = new Player()
            .addWing(wing1)
            .addWing(wing2);
        Game game = new Game()
            .addPlayer(player);
        Assert.assertEquals(wing1, Wing.findWing(game, orc1));
        Assert.assertEquals(wing2, Wing.findWing(game, orc3));
        Assert.assertNull(Wing.findWing(game, orc4));
    }

}
