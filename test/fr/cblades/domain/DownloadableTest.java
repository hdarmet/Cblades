package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.summer.ApplicationManager;
import org.summer.ApplicationManagerForTestImpl;
import org.summer.MockDataManagerImpl;
import org.summer.data.DataSunbeam;

import java.util.ArrayList;

public class DownloadableTest implements DataSunbeam {

    MockDataManagerImpl dataManager;

    @Before
    public void before() {
        ApplicationManager.set(new ApplicationManagerForTestImpl());
        dataManager = (MockDataManagerImpl)ApplicationManager.get().getDataManager();
        dataManager.openPersistenceUnit("default");
    }

    @Test
    public void fillSheet() {
        Sheet sheet = new Sheet()
            .setName("units-1")
            .setPath("unit-sheet-1.png")
            .setIcon("unit-sheet-icon-1.png")
            .setDescription("Infantry and Cavalry")
            .setOrdinal(0);
        Assert.assertEquals("units-1", sheet.getName());
        Assert.assertEquals("unit-sheet-1.png", sheet.getPath());
        Assert.assertEquals("unit-sheet-icon-1.png", sheet.getIcon());
        Assert.assertEquals("Infantry and Cavalry", sheet.getDescription());
        Assert.assertEquals(0, sheet.getOrdinal());
    }

    @Test
    public void fillFaction() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        Faction faction = new Faction()
            .setName("Roughneck")
            .setDescription("The feared mercenaries of the North")
            .setIllustration("roughneck.png")
            .setAuthor(account)
            .setStatus(FactionStatus.LIVE);
        Assert.assertEquals("Roughneck", faction.getName());
        Assert.assertEquals("The feared mercenaries of the North", faction.getDescription());
        Assert.assertEquals("roughneck.png", faction.getIllustration());
        Assert.assertEquals(account, faction.getAuthor());
        Assert.assertEquals(FactionStatus.LIVE, faction.getStatus());
    }

    @Test
    public void manageSheetsInFaction() {
        Faction faction = new Faction();
        Sheet sheet1 = new Sheet().setName("unit-1").setOrdinal(0);
        Sheet sheet2 = new Sheet().setName("unit-2").setOrdinal(1);
        Assert.assertEquals(faction, faction
            .addSheet(sheet1)
            .addSheet(sheet2)
        );
        Assert.assertEquals(new ArrayList<Sheet>() {{
            add(sheet1);
            add(sheet2);
        }}, faction.getSheets());
        Assert.assertEquals(sheet2, faction.getSheet(1));
        Assert.assertNull(faction.getSheet(3));
        Assert.assertEquals(faction, faction.removeSheet(sheet1));
        Assert.assertEquals(new ArrayList<Sheet>() {{
            add(sheet2);
        }}, faction.getSheets());
        Assert.assertEquals(faction, faction.setFirstSheet(sheet1));
        Assert.assertEquals(sheet1, faction.getFirstSheet());
    }

    @Test
    public void manageCommentsInFaction() {
        Faction faction = new Faction();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(faction, faction
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, faction.getComments());
        Assert.assertEquals(faction, faction.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, faction.getComments());
    }

    @Test
    public void generateDocumentForFaction() {
        Sheet sheet0 = new Sheet().setName("unit-3")
            .setOrdinal(2).setDescription("Artillery");
        Sheet sheet1 = new Sheet().setName("unit-1")
            .setOrdinal(0).setDescription("Infantery");
        Sheet sheet2 = new Sheet().setName("unit-2")
            .setOrdinal(1).setDescription("Cavalry");
        Faction faction = new Faction()
            .addSheet(sheet0)
            .addSheet(sheet1)
            .addSheet(sheet2);
        Document document = faction.buildDocument();
        Assert.assertEquals(
            "\nunit-1Infantery\n" +
            "unit-2Cavalry\n" +
            "unit-3Artillery",
            document.getText());
        Assert.assertEquals(document, faction.getDocument());
    }

    @Test
    public void fillMagicArt() {
        Account account = new Account().setAccess(new Login()).setLogin("adebrie");
        MagicArt magicArt = new MagicArt()
            .setName("Roughneck")
            .setDescription("The feared mercenaries of the North")
            .setIllustration("roughneck.png")
            .setAuthor(account)
            .setStatus(MagicArtStatus.LIVE);
        Assert.assertEquals("Roughneck", magicArt.getName());
        Assert.assertEquals("The feared mercenaries of the North", magicArt.getDescription());
        Assert.assertEquals("roughneck.png", magicArt.getIllustration());
        Assert.assertEquals(account, magicArt.getAuthor());
        Assert.assertEquals(MagicArtStatus.LIVE, magicArt.getStatus());
    }

    @Test
    public void manageSheetsInMagicArt() {
        MagicArt magicArt = new MagicArt();
        Sheet sheet1 = new Sheet().setName("unit-1").setOrdinal(0);
        Sheet sheet2 = new Sheet().setName("unit-2").setOrdinal(1);
        Assert.assertEquals(magicArt, magicArt
            .addSheet(sheet1)
            .addSheet(sheet2)
        );
        Assert.assertEquals(new ArrayList<Sheet>() {{
            add(sheet1);
            add(sheet2);
        }}, magicArt.getSheets());
        Assert.assertEquals(sheet2, magicArt.getSheet(1));
        Assert.assertNull(magicArt.getSheet(3));
        Assert.assertEquals(magicArt, magicArt.removeSheet(sheet1));
        Assert.assertEquals(new ArrayList<Sheet>() {{
            add(sheet2);
        }}, magicArt.getSheets());
        Assert.assertEquals(magicArt, magicArt.setFirstSheet(sheet1));
        Assert.assertEquals(sheet1, magicArt.getFirstSheet());
    }

    @Test
    public void manageCommentsInMagicArt() {
        MagicArt magicArt = new MagicArt();
        Comment comment1 = new Comment().setText("My first comment.");
        Comment comment2 = new Comment().setText("My second comment.");
        Assert.assertEquals(magicArt, magicArt
            .addComment(comment1)
            .addComment(comment2)
        );
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment1);
            add(comment2);
        }}, magicArt.getComments());
        Assert.assertEquals(magicArt, magicArt.removeComment(comment1));
        Assert.assertEquals(new ArrayList<Comment>() {{
            add(comment2);
        }}, magicArt.getComments());
    }

    @Test
    public void generateDocumentForMagicArt() {
        Sheet sheet0 = new Sheet().setName("magic-2")
            .setOrdinal(2).setDescription("Black Magic");
        Sheet sheet1 = new Sheet().setName("magic-0")
            .setOrdinal(0).setDescription("Fire Magic");
        Sheet sheet2 = new Sheet().setName("magic-1")
            .setOrdinal(1).setDescription("Earth Magic");
        MagicArt magicArt = new MagicArt()
            .addSheet(sheet0)
            .addSheet(sheet1)
            .addSheet(sheet2);
        Document document = magicArt.buildDocument();
        Assert.assertEquals(
        "\nmagic-0Fire Magic\n" +
                "magic-1Earth Magic\n" +
                "magic-2Black Magic",
            document.getText());
        Assert.assertEquals(document, magicArt.getDocument());
    }

    @Test
    public void fillRuleSet() {
        RuleSet ruleSet = new RuleSet()
                .setRuleSetVersion("1.01")
                .setPublished(true)
                .setCategory("Rules");
        Assert.assertEquals("1.01", ruleSet.getRuleSetVersion());
        Assert.assertTrue(ruleSet.isPublished());
        Assert.assertEquals("Rules", ruleSet.getCategory());
    }

    @Test
    public void manageSheetsInRuleSet() {
        RuleSet ruleSet = new RuleSet();
        Sheet sheet1 = new Sheet().setName("unit-1").setOrdinal(0);
        Sheet sheet2 = new Sheet().setName("unit-2").setOrdinal(1);
        Assert.assertEquals(ruleSet, ruleSet
            .addSheet(sheet1)
            .addSheet(sheet2)
        );
        Assert.assertEquals(new ArrayList<Sheet>() {{
            add(sheet1);
            add(sheet2);
        }}, ruleSet.getSheets());
        Assert.assertEquals(sheet2, ruleSet.getSheet(1));
        Assert.assertNull(ruleSet.getSheet(3));
        Assert.assertEquals(ruleSet, ruleSet.removeSheet(sheet1));
        Assert.assertEquals(new ArrayList<Sheet>() {{
            add(sheet2);
        }}, ruleSet.getSheets());
    }

    @Test
    public void findRuleSetByCategory() {
        RuleSet ruleSet = new RuleSet()
                .setCategory("General");
        dataManager.register("createQuery", null, null,
                "select r from RuleSet r where r.category=:category");
        dataManager.register("setParameter", null, null,"category", "General");
        dataManager.register("getSingleResult", ruleSet, null);
        inTransaction(em->{
            Assert.assertEquals(ruleSet, RuleSet.findByCategory(em, "General"));
        });
        dataManager.hasFinished();
    }

    @Test
    public void tryToFindAnUnknownRuleSetByCategory() {
        dataManager.register("createQuery", null, null,
                "select r from RuleSet r where r.category=:category");
        dataManager.register("setParameter", null, null,"category", "General");
        dataManager.register("getSingleResult", null, null);
        inTransaction(em->{
            Assert.assertNull(RuleSet.findByCategory(em, "General"));
        });
        dataManager.hasFinished();
    }
}
