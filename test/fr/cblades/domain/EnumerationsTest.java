package fr.cblades.domain;

import org.junit.Assert;
import org.junit.Test;

import java.util.HashMap;

public class EnumerationsTest {

    @Test
    public void testAccountRatingLevel() {
        Assert.assertEquals(AccountRatingLevel.SQUIRE.getMinRating(), 0);
        Assert.assertEquals(AccountRatingLevel.SQUIRE.getMaxRating(), 99);
        Assert.assertEquals(AccountRatingLevel.SQUIRE.getLabel(), "Squire");
        Assert.assertEquals(AccountRatingLevel.KNIGHT.getMinRating(), 100);
        Assert.assertEquals(AccountRatingLevel.KNIGHT.getMaxRating(), 299);
        Assert.assertEquals(AccountRatingLevel.KNIGHT.getLabel(), "Knight");
        Assert.assertEquals(AccountRatingLevel.LORD.getMinRating(), 300);
        Assert.assertEquals(AccountRatingLevel.LORD.getMaxRating(), 599);
        Assert.assertEquals(AccountRatingLevel.LORD.getLabel(), "Lord");
        Assert.assertEquals(AccountRatingLevel.BANNER_LORD.getMinRating(), 600);
        Assert.assertEquals(AccountRatingLevel.BANNER_LORD.getMaxRating(), 999);
        Assert.assertEquals(AccountRatingLevel.BANNER_LORD.getLabel(), "Banner Lord");
        Assert.assertEquals(AccountRatingLevel.EARL.getMinRating(), 1000);
        Assert.assertEquals(AccountRatingLevel.EARL.getMaxRating(), 1499);
        Assert.assertEquals(AccountRatingLevel.EARL.getLabel(), "Earl");
        Assert.assertEquals(AccountRatingLevel.DUKE.getMinRating(), 1500);
        Assert.assertEquals(AccountRatingLevel.DUKE.getMaxRating(), 1999);
        Assert.assertEquals(AccountRatingLevel.DUKE.getLabel(), "Duke");
        Assert.assertEquals(AccountRatingLevel.KING.getMinRating(), 2000);
        Assert.assertEquals(AccountRatingLevel.KING.getMaxRating(), 2999);
        Assert.assertEquals(AccountRatingLevel.KING.getLabel(), "King");
        Assert.assertEquals(AccountRatingLevel.EMPEROR.getMinRating(), 3000);
        Assert.assertEquals(AccountRatingLevel.EMPEROR.getMaxRating(), Integer.MAX_VALUE);
        Assert.assertEquals(AccountRatingLevel.EMPEROR.getLabel(), "Emperor");
        Assert.assertTrue((new HashMap<String, AccountRatingLevel>() {{
            put(AccountRatingLevel.SQUIRE.getLabel(), AccountRatingLevel.SQUIRE);
            put(AccountRatingLevel.KNIGHT.getLabel(), AccountRatingLevel.KNIGHT);
            put(AccountRatingLevel.LORD.getLabel(), AccountRatingLevel.LORD);
            put(AccountRatingLevel.BANNER_LORD.getLabel(), AccountRatingLevel.BANNER_LORD);
            put(AccountRatingLevel.EARL.getLabel(), AccountRatingLevel.EARL);
            put(AccountRatingLevel.DUKE.getLabel(), AccountRatingLevel.DUKE);
            put(AccountRatingLevel.KING.getLabel(), AccountRatingLevel.KING);
            put(AccountRatingLevel.EMPEROR.getLabel(), AccountRatingLevel.EMPEROR);
        }}).equals(AccountRatingLevel.byLabels()));
        Assert.assertEquals(AccountRatingLevel.byLabel(AccountRatingLevel.EARL.getLabel()), AccountRatingLevel.EARL);
        Assert.assertNull(AccountRatingLevel.byLabel("dummy"));
    }

    @Test
    public void testFogType() {
        Assert.assertEquals(FogType.NO_FOG.getLabel(), "NF");
        Assert.assertEquals(FogType.MIST.getLabel(), "M");
        Assert.assertEquals(FogType.DENSE_MIST.getLabel(), "DM");
        Assert.assertEquals(FogType.FOG.getLabel(), "F");
        Assert.assertEquals(FogType.DENSE_FOG.getLabel(), "DF");
        Assert.assertTrue((new HashMap<String, FogType>() {{
            put(FogType.NO_FOG.getLabel(), FogType.NO_FOG);
            put(FogType.MIST.getLabel(), FogType.MIST);
            put(FogType.DENSE_MIST.getLabel(), FogType.DENSE_MIST);
            put(FogType.FOG.getLabel(), FogType.FOG);
            put(FogType.DENSE_FOG.getLabel(), FogType.DENSE_FOG);
        }}).equals(FogType.byLabels()));
        Assert.assertEquals(FogType.byLabel(FogType.FOG.getLabel()), FogType.FOG);
        Assert.assertNull(FogType.byLabel("dummy"));
    }

    @Test
    public void testAccountStatus() {
        Assert.assertEquals(AccountStatus.ACTIVE.getLabel(), "act");
        Assert.assertEquals(AccountStatus.BLOCKED.getLabel(), "blk");
        Assert.assertEquals(AccountStatus.PENDING.getLabel(), "pnd");
        Assert.assertTrue((new HashMap<String, AccountStatus>() {{
            put(AccountStatus.ACTIVE.getLabel(), AccountStatus.ACTIVE);
            put(AccountStatus.BLOCKED.getLabel(), AccountStatus.BLOCKED);
            put(AccountStatus.PENDING.getLabel(), AccountStatus.PENDING);
        }}).equals(AccountStatus.byLabels()));
        Assert.assertEquals(AccountStatus.byLabel(AccountStatus.ACTIVE.getLabel()), AccountStatus.ACTIVE);
        Assert.assertNull(AccountStatus.byLabel("dummy"));
    }

    @Test
    public void testAmmunition() {
        Assert.assertEquals(Ammunition.PLENTIFUL.getLabel(), "P");
        Assert.assertEquals(Ammunition.SCARCE.getLabel(), "S");
        Assert.assertEquals(Ammunition.EXHAUSTED.getLabel(), "E");
        Assert.assertTrue((new HashMap<String, Ammunition>() {{
            put(Ammunition.PLENTIFUL.getLabel(), Ammunition.PLENTIFUL);
            put(Ammunition.SCARCE.getLabel(), Ammunition.SCARCE);
            put(Ammunition.EXHAUSTED.getLabel(), Ammunition.EXHAUSTED);
        }}).equals(Ammunition.byLabels()));
        Assert.assertEquals(Ammunition.byLabel(Ammunition.PLENTIFUL.getLabel()), Ammunition.PLENTIFUL);
        Assert.assertNull(Ammunition.byLabel("dummy"));
    }

    @Test
    public void testAnnouncementStatus() {
        Assert.assertEquals(AnnouncementStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(AnnouncementStatus.COMING_SOON.getLabel(), "soon");
        Assert.assertEquals(AnnouncementStatus.ARCHIVED.getLabel(), "arch");
        Assert.assertTrue((new HashMap<String, AnnouncementStatus>() {{
            put(AnnouncementStatus.LIVE.getLabel(), AnnouncementStatus.LIVE);
            put(AnnouncementStatus.COMING_SOON.getLabel(), AnnouncementStatus.COMING_SOON);
            put(AnnouncementStatus.ARCHIVED.getLabel(), AnnouncementStatus.ARCHIVED);
        }}).equals(AnnouncementStatus.byLabels()));
        Assert.assertEquals(AnnouncementStatus.byLabel(AnnouncementStatus.ARCHIVED.getLabel()), AnnouncementStatus.ARCHIVED);
        Assert.assertNull(AnnouncementStatus.byLabel("dummy"));
    }

    @Test
    public void testArticleStatus() {
        Assert.assertEquals(ArticleStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(ArticleStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(ArticleStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, ArticleStatus>() {{
            put(ArticleStatus.LIVE.getLabel(), ArticleStatus.LIVE);
            put(ArticleStatus.PENDING.getLabel(), ArticleStatus.PENDING);
            put(ArticleStatus.PROPOSED.getLabel(), ArticleStatus.PROPOSED);
        }}).equals(ArticleStatus.byLabels()));
        Assert.assertEquals(ArticleStatus.byLabel(ArticleStatus.PENDING.getLabel()), ArticleStatus.PENDING);
        Assert.assertNull(ArticleStatus.byLabel("dummy"));
    }

    @Test
    public void testBannerStatus() {
        Assert.assertEquals(BannerStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(BannerStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(BannerStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, BannerStatus>() {{
            put(BannerStatus.LIVE.getLabel(), BannerStatus.LIVE);
            put(BannerStatus.PENDING.getLabel(), BannerStatus.PENDING);
            put(BannerStatus.PROPOSED.getLabel(), BannerStatus.PROPOSED);
        }}).equals(BannerStatus.byLabels()));
        Assert.assertEquals(BannerStatus.byLabel(BannerStatus.PENDING.getLabel()), BannerStatus.PENDING);
        Assert.assertNull(BannerStatus.byLabel("dummy"));
    }

    @Test
    public void testBoardStatus() {
        Assert.assertEquals(BoardStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(BoardStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(BoardStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, BoardStatus>() {{
            put(BoardStatus.LIVE.getLabel(), BoardStatus.LIVE);
            put(BoardStatus.PENDING.getLabel(), BoardStatus.PENDING);
            put(BoardStatus.PROPOSED.getLabel(), BoardStatus.PROPOSED);
        }}).equals(BoardStatus.byLabels()));
        Assert.assertEquals(BoardStatus.byLabel(BoardStatus.PENDING.getLabel()), BoardStatus.PENDING);
        Assert.assertNull(BoardStatus.byLabel("dummy"));
    }

    @Test
    public void testCharging() {
        Assert.assertEquals(Charging.BEGIN_CHARGE.getLabel(), "BC");
        Assert.assertEquals(Charging.CAN_CHARGE.getLabel(), "CC");
        Assert.assertEquals(Charging.CHARGING.getLabel(), "C");
        Assert.assertEquals(Charging.NONE.getLabel(), "N");
        Assert.assertTrue((new HashMap<String, Charging>() {{
            put(Charging.BEGIN_CHARGE.getLabel(), Charging.BEGIN_CHARGE);
            put(Charging.CAN_CHARGE.getLabel(), Charging.CAN_CHARGE);
            put(Charging.CHARGING.getLabel(), Charging.CHARGING);
            put(Charging.NONE.getLabel(), Charging.NONE);
        }}).equals(Charging.byLabels()));
        Assert.assertEquals(Charging.byLabel(Charging.CHARGING.getLabel()), Charging.CHARGING);
        Assert.assertNull(Charging.byLabel("dummy"));
    }

    @Test
    public void testCohesion() {
        Assert.assertEquals(Cohesion.DELETED.getLabel(), "X");
        Assert.assertEquals(Cohesion.DISRUPTED.getLabel(), "D");
        Assert.assertEquals(Cohesion.ROOTED.getLabel(), "R");
        Assert.assertEquals(Cohesion.GOOD_ORDER.getLabel(), "GO");
        Assert.assertTrue((new HashMap<String, Cohesion>() {{
            put(Cohesion.DELETED.getLabel(), Cohesion.DELETED);
            put(Cohesion.DISRUPTED.getLabel(), Cohesion.DISRUPTED);
            put(Cohesion.ROOTED.getLabel(), Cohesion.ROOTED);
            put(Cohesion.GOOD_ORDER.getLabel(), Cohesion.GOOD_ORDER);
        }}).equals(Cohesion.byLabels()));
        Assert.assertEquals(Cohesion.byLabel(Cohesion.ROOTED.getLabel()), Cohesion.ROOTED);
        Assert.assertNull(Cohesion.byLabel("dummy"));
    }

    @Test
    public void testEventStatus() {
        Assert.assertEquals(EventStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(EventStatus.COMING_SOON.getLabel(), "soon");
        Assert.assertEquals(EventStatus.ARCHIVED.getLabel(), "arch");
        Assert.assertTrue((new HashMap<String, EventStatus>() {{
            put(EventStatus.LIVE.getLabel(), EventStatus.LIVE);
            put(EventStatus.COMING_SOON.getLabel(), EventStatus.COMING_SOON);
            put(EventStatus.ARCHIVED.getLabel(), EventStatus.ARCHIVED);
        }}).equals(EventStatus.byLabels()));
        Assert.assertEquals(EventStatus.byLabel(EventStatus.ARCHIVED.getLabel()), EventStatus.ARCHIVED);
        Assert.assertNull(EventStatus.byLabel("dummy"));
    }

    @Test
    public void testFactionStatus() {
        Assert.assertEquals(FactionStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(FactionStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(FactionStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, FactionStatus>() {{
            put(FactionStatus.LIVE.getLabel(), FactionStatus.LIVE);
            put(FactionStatus.PENDING.getLabel(), FactionStatus.PENDING);
            put(FactionStatus.PROPOSED.getLabel(), FactionStatus.PROPOSED);
        }}).equals(FactionStatus.byLabels()));
        Assert.assertEquals(FactionStatus.byLabel(FactionStatus.PENDING.getLabel()), FactionStatus.PENDING);
        Assert.assertNull(FactionStatus.byLabel("dummy"));
    }

    @Test
    public void testForumMessageStatus() {
        Assert.assertEquals(ForumMessageStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(ForumMessageStatus.BLOCKED.getLabel(), "blk");
        Assert.assertEquals(ForumMessageStatus.ARCHIBED.getLabel(), "arc");
        Assert.assertTrue((new HashMap<String, ForumMessageStatus>() {{
            put(ForumMessageStatus.LIVE.getLabel(), ForumMessageStatus.LIVE);
            put(ForumMessageStatus.BLOCKED.getLabel(), ForumMessageStatus.BLOCKED);
            put(ForumMessageStatus.ARCHIBED.getLabel(), ForumMessageStatus.ARCHIBED);
        }}).equals(ForumMessageStatus.byLabels()));
        Assert.assertEquals(ForumMessageStatus.byLabel(ForumMessageStatus.BLOCKED.getLabel()), ForumMessageStatus.BLOCKED);
        Assert.assertNull(ForumMessageStatus.byLabel("dummy"));
    }

    @Test
    public void testForumStatus() {
        Assert.assertEquals(ForumStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(ForumStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(ForumStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, ForumStatus>() {{
            put(ForumStatus.LIVE.getLabel(), ForumStatus.LIVE);
            put(ForumStatus.PENDING.getLabel(), ForumStatus.PENDING);
            put(ForumStatus.PROPOSED.getLabel(), ForumStatus.PROPOSED);
        }}).equals(ForumStatus.byLabels()));
        Assert.assertEquals(ForumStatus.byLabel(ForumStatus.PENDING.getLabel()), ForumStatus.PENDING);
        Assert.assertNull(ForumStatus.byLabel("dummy"));
    }

    @Test
    public void testForumThreadStatus() {
        Assert.assertEquals(ForumThreadStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(ForumThreadStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(ForumThreadStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, ForumThreadStatus>() {{
            put(ForumThreadStatus.LIVE.getLabel(), ForumThreadStatus.LIVE);
            put(ForumThreadStatus.PENDING.getLabel(), ForumThreadStatus.PENDING);
            put(ForumThreadStatus.PROPOSED.getLabel(), ForumThreadStatus.PROPOSED);
        }}).equals(ForumThreadStatus.byLabels()));
        Assert.assertEquals(ForumThreadStatus.byLabel(ForumThreadStatus.PENDING.getLabel()), ForumThreadStatus.PENDING);
        Assert.assertNull(ForumThreadStatus.byLabel("dummy"));
    }

    @Test
    public void testGameMatchStatus() {
        Assert.assertEquals(GameMatchStatus.CANCELLED.getLabel(), "cnd");
        Assert.assertEquals(GameMatchStatus.FINISHED.getLabel(), "end");
        Assert.assertEquals(GameMatchStatus.IN_PROGRESS.getLabel(), "ipr");
        Assert.assertEquals(GameMatchStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, GameMatchStatus>() {{
            put(GameMatchStatus.CANCELLED.getLabel(), GameMatchStatus.CANCELLED);
            put(GameMatchStatus.FINISHED.getLabel(), GameMatchStatus.FINISHED);
            put(GameMatchStatus.IN_PROGRESS.getLabel(), GameMatchStatus.IN_PROGRESS);
            put(GameMatchStatus.PROPOSED.getLabel(), GameMatchStatus.PROPOSED);
        }}).equals(GameMatchStatus.byLabels()));
        Assert.assertEquals(GameMatchStatus.byLabel(GameMatchStatus.FINISHED.getLabel()), GameMatchStatus.FINISHED);
        Assert.assertNull(GameMatchStatus.byLabel("dummy"));
    }

    @Test
    public void testHexSideType() {
        Assert.assertEquals(HexSideType.EASY.getLabel(), "E");
        Assert.assertEquals(HexSideType.WALL.getLabel(), "W");
        Assert.assertEquals(HexSideType.NORMAL.getLabel(), "N");
        Assert.assertEquals(HexSideType.CLIMB.getLabel(), "C");
        Assert.assertEquals(HexSideType.DIFFICULT.getLabel(), "D");
        Assert.assertTrue((new HashMap<String, HexSideType>() {{
            put(HexSideType.EASY.getLabel(), HexSideType.EASY);
            put(HexSideType.WALL.getLabel(), HexSideType.WALL);
            put(HexSideType.NORMAL.getLabel(), HexSideType.NORMAL);
            put(HexSideType.CLIMB.getLabel(), HexSideType.CLIMB);
            put(HexSideType.DIFFICULT.getLabel(), HexSideType.DIFFICULT);
        }}).equals(HexSideType.byLabels()));
        Assert.assertEquals(HexSideType.byLabel(HexSideType.WALL.getLabel()), HexSideType.WALL);
        Assert.assertNull(HexSideType.byLabel("dummy"));
    }

    @Test
    public void testHexType() {
        Assert.assertEquals(HexType.OUTDOOR_CLEAR.getLabel(), "OC");
        Assert.assertEquals(HexType.OUTDOOR_ROUGH.getLabel(), "OR");
        Assert.assertEquals(HexType.OUTDOOR_DIFFICULT.getLabel(), "OD");
        Assert.assertEquals(HexType.OUTDOOR_CLEAR_FLAMMABLE.getLabel(), "OCF");
        Assert.assertEquals(HexType.OUTDOOR_ROUGH_FLAMMABLE.getLabel(), "ORF");
        Assert.assertEquals(HexType.OUTDOOR_DIFFICULT_FLAMMABLE.getLabel(), "ODF");
        Assert.assertEquals(HexType.WATER.getLabel(), "WA");
        Assert.assertEquals(HexType.LAVA.getLabel(), "LA");
        Assert.assertEquals(HexType.IMPASSABLE.getLabel(), "IM");
        Assert.assertEquals(HexType.CAVE_CLEAR.getLabel(), "CC");
        Assert.assertEquals(HexType.CAVE_ROUGH.getLabel(), "CR");
        Assert.assertEquals(HexType.CAVE_DIFFICULT.getLabel(), "CD");
        Assert.assertEquals(HexType.CAVE_CLEAR_FLAMMABLE.getLabel(), "CCF");
        Assert.assertEquals(HexType.CAVE_ROUGH_FLAMMABLE.getLabel(), "CRF");
        Assert.assertEquals(HexType.CAVE_DIFFICULT_FLAMMABLE.getLabel(), "CDF");
        Assert.assertTrue((new HashMap<String, HexType>() {{
            put(HexType.OUTDOOR_CLEAR.getLabel(), HexType.OUTDOOR_CLEAR);
            put(HexType.OUTDOOR_ROUGH.getLabel(), HexType.OUTDOOR_ROUGH);
            put(HexType.OUTDOOR_DIFFICULT.getLabel(), HexType.OUTDOOR_DIFFICULT);
            put(HexType.OUTDOOR_CLEAR_FLAMMABLE.getLabel(), HexType.OUTDOOR_CLEAR_FLAMMABLE);
            put(HexType.OUTDOOR_ROUGH_FLAMMABLE.getLabel(), HexType.OUTDOOR_ROUGH_FLAMMABLE);
            put(HexType.OUTDOOR_DIFFICULT_FLAMMABLE.getLabel(), HexType.OUTDOOR_DIFFICULT_FLAMMABLE);
            put(HexType.WATER.getLabel(), HexType.WATER);
            put(HexType.LAVA.getLabel(), HexType.LAVA);
            put(HexType.IMPASSABLE.getLabel(), HexType.IMPASSABLE);
            put(HexType.CAVE_CLEAR.getLabel(), HexType.CAVE_CLEAR);
            put(HexType.CAVE_ROUGH.getLabel(), HexType.CAVE_ROUGH);
            put(HexType.CAVE_DIFFICULT.getLabel(), HexType.CAVE_DIFFICULT);
            put(HexType.CAVE_CLEAR_FLAMMABLE.getLabel(), HexType.CAVE_CLEAR_FLAMMABLE);
            put(HexType.CAVE_ROUGH_FLAMMABLE.getLabel(), HexType.CAVE_ROUGH_FLAMMABLE);
            put(HexType.CAVE_DIFFICULT_FLAMMABLE.getLabel(), HexType.CAVE_DIFFICULT_FLAMMABLE);
        }}).equals(HexType.byLabels()));
        Assert.assertEquals(HexType.byLabel(HexType.IMPASSABLE.getLabel()), HexType.IMPASSABLE);
        Assert.assertNull(HexType.byLabel("dummy"));
    }

    @Test
    public void testLikeVoteOption() {
        Assert.assertEquals(LikeVoteOption.LIKE.getLabel(), "L");
        Assert.assertEquals(LikeVoteOption.DISLIKE.getLabel(), "D");
        Assert.assertEquals(LikeVoteOption.NONE.getLabel(), "N");
        Assert.assertTrue((new HashMap<String, LikeVoteOption>() {{
            put(LikeVoteOption.LIKE.getLabel(), LikeVoteOption.LIKE);
            put(LikeVoteOption.DISLIKE.getLabel(), LikeVoteOption.DISLIKE);
            put(LikeVoteOption.NONE.getLabel(), LikeVoteOption.NONE);
        }}).equals(LikeVoteOption.byLabels()));
        Assert.assertEquals(LikeVoteOption.byLabel(LikeVoteOption.DISLIKE.getLabel()), LikeVoteOption.DISLIKE);
        Assert.assertNull(LikeVoteOption.byLabel("dummy"));
    }

    @Test
    public void testMagicArtStatus() {
        Assert.assertEquals(MagicArtStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(MagicArtStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(MagicArtStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, MagicArtStatus>() {{
            put(MagicArtStatus.LIVE.getLabel(), MagicArtStatus.LIVE);
            put(MagicArtStatus.PENDING.getLabel(), MagicArtStatus.PENDING);
            put(MagicArtStatus.PROPOSED.getLabel(), MagicArtStatus.PROPOSED);
        }}).equals(MagicArtStatus.byLabels()));
        Assert.assertEquals(MagicArtStatus.byLabel(MagicArtStatus.PENDING.getLabel()), MagicArtStatus.PENDING);
        Assert.assertNull(MagicArtStatus.byLabel("dummy"));
    }

    @Test
    public void testMessageModelCategory() {
        Assert.assertEquals(MessageModelCategory.MESSAGE_AUTHOR.getLabel(), "msga");
        Assert.assertEquals(MessageModelCategory.MESSAGE_REPORTER.getLabel(), "msgr");
        Assert.assertTrue((new HashMap<String, MessageModelCategory>() {{
            put(MessageModelCategory.MESSAGE_AUTHOR.getLabel(), MessageModelCategory.MESSAGE_AUTHOR);
            put(MessageModelCategory.MESSAGE_REPORTER.getLabel(), MessageModelCategory.MESSAGE_REPORTER);
        }}).equals(MessageModelCategory.byLabels()));
        Assert.assertEquals(MessageModelCategory.byLabel(MessageModelCategory.MESSAGE_AUTHOR.getLabel()), MessageModelCategory.MESSAGE_AUTHOR);
        Assert.assertNull(MessageModelCategory.byLabel("dummy"));
    }

    @Test
    public void testMessageModelStatus() {
        Assert.assertEquals(MessageModelStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(MessageModelStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(MessageModelStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, MessageModelStatus>() {{
            put(MessageModelStatus.LIVE.getLabel(), MessageModelStatus.LIVE);
            put(MessageModelStatus.PENDING.getLabel(), MessageModelStatus.PENDING);
            put(MessageModelStatus.PROPOSED.getLabel(), MessageModelStatus.PROPOSED);
        }}).equals(MessageModelStatus.byLabels()));
        Assert.assertEquals(MessageModelStatus.byLabel(MessageModelStatus.PENDING.getLabel()), MessageModelStatus.PENDING);
        Assert.assertNull(MessageModelStatus.byLabel("dummy"));
    }

    @Test
    public void testOrderInstruction() {
        Assert.assertEquals(OrderInstruction.DEFEND.getLabel(), "D");
        Assert.assertEquals(OrderInstruction.REGROUP.getLabel(), "G");
        Assert.assertEquals(OrderInstruction.ATTACK.getLabel(), "A");
        Assert.assertEquals(OrderInstruction.RETREAT.getLabel(), "R");
        Assert.assertTrue((new HashMap<String, OrderInstruction>() {{
            put(OrderInstruction.DEFEND.getLabel(), OrderInstruction.DEFEND);
            put(OrderInstruction.REGROUP.getLabel(), OrderInstruction.REGROUP);
            put(OrderInstruction.ATTACK.getLabel(), OrderInstruction.ATTACK);
            put(OrderInstruction.RETREAT.getLabel(), OrderInstruction.RETREAT);
        }}).equals(OrderInstruction.byLabels()));
        Assert.assertEquals(OrderInstruction.byLabel(OrderInstruction.RETREAT.getLabel()), OrderInstruction.RETREAT);
        Assert.assertNull(OrderInstruction.byLabel("dummy"));
    }

    @Test
    public void testPlayerIdentityStatus() {
        Assert.assertEquals(PlayerIdentityStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(PlayerIdentityStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(PlayerIdentityStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, PlayerIdentityStatus>() {{
            put(PlayerIdentityStatus.LIVE.getLabel(), PlayerIdentityStatus.LIVE);
            put(PlayerIdentityStatus.PENDING.getLabel(), PlayerIdentityStatus.PENDING);
            put(PlayerIdentityStatus.PROPOSED.getLabel(), PlayerIdentityStatus.PROPOSED);
        }}).equals(PlayerIdentityStatus.byLabels()));
        Assert.assertEquals(PlayerIdentityStatus.byLabel(PlayerIdentityStatus.PENDING.getLabel()), PlayerIdentityStatus.PENDING);
        Assert.assertNull(PlayerIdentityStatus.byLabel("dummy"));
    }

    @Test
    public void testReportStatus() {
        Assert.assertEquals(ReportStatus.PROCESSED.getLabel(), "ok");
        Assert.assertEquals(ReportStatus.CANCELED.getLabel(), "ko");
        Assert.assertEquals(ReportStatus.IN_PROGRESS.getLabel(), "inp");
        Assert.assertTrue((new HashMap<String, ReportStatus>() {{
            put(ReportStatus.PROCESSED.getLabel(), ReportStatus.PROCESSED);
            put(ReportStatus.CANCELED.getLabel(), ReportStatus.CANCELED);
            put(ReportStatus.IN_PROGRESS.getLabel(), ReportStatus.IN_PROGRESS);
        }}).equals(ReportStatus.byLabels()));
        Assert.assertEquals(ReportStatus.byLabel(ReportStatus.CANCELED.getLabel()), ReportStatus.CANCELED);
        Assert.assertNull(ReportStatus.byLabel("dummy"));
    }

    @Test
    public void testScenarioStatus() {
        Assert.assertEquals(ScenarioStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(ScenarioStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(ScenarioStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, ScenarioStatus>() {{
            put(ScenarioStatus.LIVE.getLabel(), ScenarioStatus.LIVE);
            put(ScenarioStatus.PENDING.getLabel(), ScenarioStatus.PENDING);
            put(ScenarioStatus.PROPOSED.getLabel(), ScenarioStatus.PROPOSED);
        }}).equals(ScenarioStatus.byLabels()));
        Assert.assertEquals(ScenarioStatus.byLabel(ScenarioStatus.PENDING.getLabel()), ScenarioStatus.PENDING);
        Assert.assertNull(ScenarioStatus.byLabel("dummy"));
    }

    @Test
    public void testStacking() {
        Assert.assertEquals(Stacking.TOP.getLabel(), "T");
        Assert.assertEquals(Stacking.BOTTOM.getLabel(), "B");
        Assert.assertTrue((new HashMap<String, Stacking>() {{
            put(Stacking.TOP.getLabel(), Stacking.TOP);
            put(Stacking.BOTTOM.getLabel(), Stacking.BOTTOM);
        }}).equals(Stacking.byLabels()));
        Assert.assertEquals(Stacking.byLabel(Stacking.TOP.getLabel()), Stacking.TOP);
        Assert.assertNull(Stacking.byLabel("dummy"));
    }

    @Test
    public void testThemeCategory() {
        Assert.assertEquals(ThemeCategory.GAME.getLabel(), "game");
        Assert.assertEquals(ThemeCategory.LEGEND.getLabel(), "legends");
        Assert.assertEquals(ThemeCategory.EXAMPLES.getLabel(), "examples");
        Assert.assertTrue((new HashMap<String, ThemeCategory>() {{
            put(ThemeCategory.GAME.getLabel(), ThemeCategory.GAME);
            put(ThemeCategory.LEGEND.getLabel(), ThemeCategory.LEGEND);
            put(ThemeCategory.EXAMPLES.getLabel(), ThemeCategory.EXAMPLES);
        }}).equals(ThemeCategory.byLabels()));
        Assert.assertEquals(ThemeCategory.byLabel(ThemeCategory.LEGEND.getLabel()), ThemeCategory.LEGEND);
        Assert.assertNull(ThemeCategory.byLabel("dummy"));
    }

    @Test
    public void testThemeStatus() {
        Assert.assertEquals(ThemeStatus.LIVE.getLabel(), "live");
        Assert.assertEquals(ThemeStatus.PENDING.getLabel(), "pnd");
        Assert.assertEquals(ThemeStatus.PROPOSED.getLabel(), "prp");
        Assert.assertTrue((new HashMap<String, ThemeStatus>() {{
            put(ThemeStatus.LIVE.getLabel(), ThemeStatus.LIVE);
            put(ThemeStatus.PENDING.getLabel(), ThemeStatus.PENDING);
            put(ThemeStatus.PROPOSED.getLabel(), ThemeStatus.PROPOSED);
        }}).equals(ThemeStatus.byLabels()));
        Assert.assertEquals(ThemeStatus.byLabel(ThemeStatus.PENDING.getLabel()), ThemeStatus.PENDING);
        Assert.assertNull(ThemeStatus.byLabel("dummy"));
    }

    @Test
    public void testTiredness() {
        Assert.assertEquals(Tiredness.FRESH.getLabel(), "F");
        Assert.assertEquals(Tiredness.TIRED.getLabel(), "T");
        Assert.assertEquals(Tiredness.EXHAUSTED.getLabel(), "E");
        Assert.assertTrue((new HashMap<String, Tiredness>() {{
            put(Tiredness.FRESH.getLabel(), Tiredness.FRESH);
            put(Tiredness.TIRED.getLabel(), Tiredness.TIRED);
            put(Tiredness.EXHAUSTED.getLabel(), Tiredness.EXHAUSTED);
        }}).equals(Tiredness.byLabels()));
        Assert.assertEquals(Tiredness.byLabel(Tiredness.EXHAUSTED.getLabel()), Tiredness.EXHAUSTED);
        Assert.assertNull(Tiredness.byLabel("dummy"));
    }

    @Test
    public void testUnitCategory() {
        Assert.assertEquals(UnitCategory.FORMATION.getLabel(), "F");
        Assert.assertEquals(UnitCategory.TROOP.getLabel(), "T");
        Assert.assertEquals(UnitCategory.CHARACTER.getLabel(), "C");
        Assert.assertTrue((new HashMap<String, UnitCategory>() {{
            put(UnitCategory.FORMATION.getLabel(), UnitCategory.FORMATION);
            put(UnitCategory.TROOP.getLabel(), UnitCategory.TROOP);
            put(UnitCategory.CHARACTER.getLabel(), UnitCategory.CHARACTER);
        }}).equals(UnitCategory.byLabels()));
        Assert.assertEquals(UnitCategory.byLabel(UnitCategory.CHARACTER.getLabel()), UnitCategory.CHARACTER);
        Assert.assertNull(UnitCategory.byLabel("dummy"));
    }

    @Test
    public void testWeatherType() {
        Assert.assertEquals(WeatherType.CLEAR.getLabel(), "C");
        Assert.assertEquals(WeatherType.HOT.getLabel(), "H");
        Assert.assertEquals(WeatherType.RAIN.getLabel(), "R");
        Assert.assertEquals(WeatherType.CLOUDY.getLabel(), "N");
        Assert.assertEquals(WeatherType.OVERCAST.getLabel(), "O");
        Assert.assertEquals(WeatherType.STORM.getLabel(), "S");
        Assert.assertTrue((new HashMap<String, WeatherType>() {{
            put(WeatherType.CLEAR.getLabel(), WeatherType.CLEAR);
            put(WeatherType.HOT.getLabel(), WeatherType.HOT);
            put(WeatherType.RAIN.getLabel(), WeatherType.RAIN);
            put(WeatherType.CLOUDY.getLabel(), WeatherType.CLOUDY);
            put(WeatherType.OVERCAST.getLabel(), WeatherType.OVERCAST);
            put(WeatherType.STORM.getLabel(), WeatherType.STORM);
        }}).equals(WeatherType.byLabels()));
        Assert.assertEquals(WeatherType.byLabel(WeatherType.OVERCAST.getLabel()), WeatherType.OVERCAST);
        Assert.assertNull(WeatherType.byLabel("dummy"));
    }

}
