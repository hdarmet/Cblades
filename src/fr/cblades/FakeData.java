package fr.cblades;

import fr.cblades.domain.*;
import org.summer.annotation.Launch;
import org.summer.data.DataSunbeam;

import javax.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class FakeData {

    @Launch(order = 10)
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
                .setAvatar("../images/site/avatars/my-avatar.png").setStatus(AccountStatus.ACTIVE)
                .setRating(201).setMessageCount(100);
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
            Account marie = new Account()
                .setFirstName("Marie").setLastName("Duchemin").setEmail("mduduche@gmail.com")
                .setAccess(new Login().setLogin("marie").setPassword(Login.encrypt("P@ssW0rd.")))
                .setAvatar("../images/site/avatars/avatar1.png").setStatus(AccountStatus.ACTIVE)
                .setRating(101).setMessageCount(120);
            data.persist(em, marie);
            Account paul = new Account()
                .setFirstName("Paul").setLastName("Pain").setEmail("ppain@gmail.com")
                .setAccess(new Login().setLogin("popol").setPassword(Login.encrypt("P@ssW0rd.")))
                .setAvatar("../images/site/avatars/avatar2.png").setStatus(AccountStatus.ACTIVE)
                .setRating(1001).setMessageCount(120);
            data.persist(em, paul);
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
                .setCategory(ThemeCategory.EXAMPLES)
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
                .setCategory(ThemeCategory.EXAMPLES)
                .setIllustration("../images/site/themes/scenario.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("Campaigns")
                .setCategory(ThemeCategory.LEGEND)
                .setIllustration("../images/site/themes/campaigns.png")
                .setStatus(ThemeStatus.LIVE);
            data.persist(em, theme);
            theme = new Theme()
                .setDescription(SHORT_PARAGRAPH_TEXT)
                .setTitle("History")
                .setCategory(ThemeCategory.LEGEND)
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
        data.inTransaction(em-> {
            for (int index=0; index<12; index++) {
                Article article = new Article()
                    .setTitle("My Article one and " + index)
                    .setRecent(true)
                    .setAuthor(Account.find(em, "temrad"))
                    .addTheme(Theme.getByTitle(em, "Campaigns"))
                    .addTheme(Theme.getByTitle(em, "History"))
                    .setStatus(ArticleStatus.LIVE)
                    .addParagraph(new Paragraph()
                        .setOrdinal(0)
                        .setTitle("First paragraph")
                        .setText(PARAGRAPH_TEXT)
                        .setIllustration("../images/site/factions/amarys.png")
                        .setIllustration(IllustrationPosition.LEFT)
                    ).addParagraph(new Paragraph()
                        .setOrdinal(1)
                        .setTitle("Second paragraph")
                        .setText(PARAGRAPH_TEXT)
                        .setIllustration("../images/site/factions/demons.png")
                        .setIllustration(IllustrationPosition.LEFT)
                    ).setPoll(new LikePoll().setLikes(3).setDislikes(1));
                article.setFirstParagraph(article.getParagraph(0));
                article.buildDocument();
                data.persist(em, article);
                article = new Article()
                    .setTitle("My Article two and " + index)
                    .setRecent(true)
                    .setAuthor(Account.find(em, "temrad"))
                    .addTheme(Theme.getByTitle(em, "Strategies And Tactics"))
                    .addTheme(Theme.getByTitle(em, "Rules"))
                    .setStatus(ArticleStatus.LIVE)
                    .addParagraph(new Paragraph()
                        .setOrdinal(0)
                        .setTitle("First paragraph")
                        .setText(PARAGRAPH_TEXT)
                        .setIllustration("../images/site/factions/hill.png")
                        .setIllustration(IllustrationPosition.LEFT)
                    ).setPoll(new LikePoll().setLikes(10).setDislikes(2));
                article.setFirstParagraph(article.getParagraph(0));
                article.buildDocument();
                data.persist(em, article);
            }
        });
        data.inTransaction(em-> {
            Scenario scenario = new Scenario()
                .setStory(PARAGRAPH_TEXT)
                .setSetUp(PARAGRAPH_TEXT)
                .setVictoryConditions(PARAGRAPH_TEXT)
                .setSpecialRules(PARAGRAPH_TEXT)
                .setTitle("Fierce fighting")
                .setIllustration("../images/scenarii/scenario1.png")
                .setStatus(ScenarioStatus.LIVE)
                .setGame(new Game()
                    .setMap(new fr.cblades.domain.Map())
                );
            scenario.getGame().setName(scenario.getTitle());
            data.persist(em, scenario);
        });
        data.inTransaction(em-> {
            Faction faction = new Faction()
                .setName("Amarys")
                .setDescription("The majestuous Sun-kingdom of Amarys. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/factions/amarys.png")
                .addSheet(new Sheet()
                    .setName("Counter sheet 1")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/amarys/counters1.png")
                    .setIcon("../images/site/factions/amarys/counters1-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 1b")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/amarys/counters1b.png")
                    .setIcon("../images/site/factions/amarys/counters1b-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 2")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/amarys/counters2.png")
                    .setIcon("../images/site/factions/amarys/counters2-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 2b")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/amarys/counters2b.png")
                    .setIcon("../images/site/factions/amarys/counters2b-icon.png")
                )
                .setStatus(FactionStatus.LIVE);
            faction.buildDocument();
            data.persist(em, faction);
            faction = new Faction()
                .setName("Roughneck")
                .setDescription("The brave roughneck are the best human soldiers. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/factions/roughneck.png")
                .addSheet(new Sheet()
                    .setName("Counter sheet 1")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/roughneck/counters1.png")
                    .setIcon("../images/site/factions/roughneck/counters1-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 1b")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/roughneck/counters1b.png")
                    .setIcon("../images/site/factions/roughneck/counters1b-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 2")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/roughneck/counters2.png")
                    .setIcon("../images/site/factions/roughneck/counters2-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 2b")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/factions/roughneck/counters2b.png")
                    .setIcon("../images/site/factions/roughneck/counters2b-icon.png")
                )
                .setStatus(FactionStatus.LIVE);
            faction.buildDocument();
            data.persist(em, faction);
            faction = new Faction()
                .setName("Orcs")
                .setDescription("The savage orcs. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/factions/orcs.png")
                .setStatus(FactionStatus.LIVE);
            faction.buildDocument();
            data.persist(em, faction);
            faction = new Faction()
                .setName("Elves")
                .setDescription("The brilliant elves. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/factions/elves.png")
                .setStatus(FactionStatus.LIVE);
            faction.buildDocument();
            data.persist(em, faction);
            faction = new Faction()
                .setName("Dwarves")
                .setDescription("The tenacious dwarves. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/factions/dwarves.png")
                .setStatus(FactionStatus.LIVE);
            faction.buildDocument();
            data.persist(em, faction);
            faction = new Faction()
                .setName("Skavens")
                .setDescription("The vicious skavens. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/factions/skavens.png")
                .setStatus(FactionStatus.LIVE);
            faction.buildDocument();
            data.persist(em, faction);
        });
        data.inTransaction(em-> {
            MagicArt magic = new MagicArt()
                .setName("Arcanic Art")
                .setDescription("The Versatile Art of Arcany. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/arcanic.png")
                .addSheet(new Sheet()
                    .setName("Counter sheet 1")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/magic/arcanic/counters1.png")
                    .setIcon("../images/site/magic/arcanic/counters1-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 1b")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/magic/arcanic/counters1b.png")
                    .setIcon("../images/site/magic/arcanic/counters1b-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Player Aid")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../docs/Fiche Art Arcanique.pdf")
                    .setIcon("../images/site/magic/arcanic/player-aid.png")
                )
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
            magic = new MagicArt()
                .setName("Pyromancy Art")
                .setDescription("The Destructive Art Of Pyromancy. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/pyromantic.png")
                .addSheet(new Sheet()
                    .setName("Counter sheet 1")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/magic/pyromantic/counters1.png")
                    .setIcon("../images/site/magic/pyromantic/counters1-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Counter sheet 1b")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../images/site/magic/pyromantic/counters1b.png")
                    .setIcon("../images/site/magic/pyromantic/counters1b-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Player Aid")
                    .setDescription(PARAGRAPH_TEXT)
                    .setPath("../docs/Fiche Art Pyromantique.pdf")
                    .setIcon("../images/site/magic/pyromantic/player-aid.png")
                )
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
            magic = new MagicArt()
                .setName("Tellurical Art")
                .setDescription("The Fundamental Art Of Tellury. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/telluric.png")
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
            magic = new MagicArt()
                .setName("Biotic Art")
                .setDescription("The Fascinating Art Of Biology. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/biotic.png")
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
            magic = new MagicArt()
                .setName("Demonological Art")
                .setDescription("The Frightening Art Of Demonology. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/demonic.png")
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
            magic = new MagicArt()
                .setName("Theological Art")
                .setDescription("The Saint Art Of Theology. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/theologic.png")
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
            magic = new MagicArt()
                .setName("Necromancy Art")
                .setDescription("The Horrible Art Of Necromancy. "+PARAGRAPH_TEXT)
                .setIllustration("../images/site/magic/necromantic.png")
                .setStatus(MagicArtStatus.LIVE);
            magic.buildDocument();
            data.persist(em, magic);
        });
        data.inTransaction(em-> {
            RuleSet.findByCategory(em,"rules")
                .addSheet(new Sheet()
                    .setName("Game Rules")
                    .setDescription("Rules Of The Game. "+TINY_PARAGRAPH_TEXT)
                    .setPath("../docs/Cursed Blades Rules.pdf")
                    .setIcon("../images/site/rules/game-rules.png")
                )
                .addSheet(new Sheet()
                    .setName("Units Activation Player Aid")
                    .setDescription("The Player Aid that helps to activate a Unit. "+PARAGRAPH_TEXT)
                    .setPath("../docs/Fiche Activation des Unités.pdf")
                    .setIcon("../images/site/rules/units-activation.png")
                );
            RuleSet.findByCategory(em,"markers")
                .addSheet(new Sheet()
                    .setName("Markers 1")
                    .setDescription("First sheet of markers. "+PARAGRAPH_TEXT)
                    .setPath("../images/site/markers/counters1.png")
                    .setIcon("../images/site/markers/counters1-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Markers 1b")
                    .setDescription("Reverse first sheet of markers. "+PARAGRAPH_TEXT)
                    .setPath("../images/site/markers/counters1b.png")
                    .setIcon("../images/site/markers/counters1b-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Markers 2")
                    .setDescription("Second sheet of markers. "+PARAGRAPH_TEXT)
                    .setPath("../images/site/markers/counters2.png")
                    .setIcon("../images/site/markers/counters2-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Markers 2b")
                    .setDescription("Reverse third sheet of markers. "+PARAGRAPH_TEXT)
                    .setPath("../images/site/markers/counters1b.png")
                    .setIcon("../images/site/markers/counters1b-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Markers 3")
                    .setDescription("Third sheet of markers. "+PARAGRAPH_TEXT)
                    .setPath("../images/site/markers/counters3.png")
                    .setIcon("../images/site/markers/counters3-icon.png")
                )
                .addSheet(new Sheet()
                    .setName("Markers 3b")
                    .setDescription("Reverse third sheet of markers. "+PARAGRAPH_TEXT)
                    .setPath("../images/site/markers/counters3b.png")
                    .setIcon("../images/site/markers/counters3b-icon.png")
                );
        });
        data.inTransaction(em->{
            List<Account> accounts = data.getResultList(em,
                "select a from Account a left outer join fetch a.access w"
            );
            Forum forum = new Forum()
                .setTitle("Discussing Retailers")
                .setDescription("Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)")
                .setMessageCount(109)
                .setThreadCount(9)
                .setStatus(ForumStatus.LIVE);
            data.persist(em, forum);
            createThreadsForForum(data, em, forum, 5, 12, accounts);
            forum = new Forum()
                .setTitle("Board Game Design")
                .setDescription("A gathering place to discuss game design What areas of history would make a great hidden movement game? Extra points for non-military!")
                .setMessageCount(295)
                .setThreadCount(22)
                .setStatus(ForumStatus.LIVE);
            data.persist(em, forum);
            createThreadsForForum(data, em, forum, 25, 0, accounts);
            forum = new Forum()
                .setTitle("Design Contests")
                .setDescription("Announce and participate in game design competitions")
                .setMessageCount(857)
                .setThreadCount(56)
                .setStatus(ForumStatus.LIVE);
            data.persist(em, forum);
            forum = new Forum()
                .setTitle("Art and Graphic Design")
                .setDescription("Show off your work, and ask for advice Which logo design?")
                .setMessageCount(44)
                .setThreadCount(25)
                .setStatus(ForumStatus.LIVE);
            data.persist(em, forum);
            forum = new Forum()
                .setTitle("Design Theory")
                .setDescription("Principles of game design not specific to one game Co-op games: a calm discussion on \"pass or fail\"")
                .setThreadCount(1)
                .setMessageCount(18)
                .setStatus(ForumStatus.LIVE);
            data.persist(em, forum);
            forum = new Forum()
                .setTitle("Design Queries and Problems")
                .setDescription("Ask specific questions about a design in the works. Indirect storytelling for a game.")
                .setThreadCount(25)
                .setMessageCount(25)
                .setStatus(ForumStatus.LIVE);
            data.persist(em, forum);
        });
    }

    static void createThreadsForForum(
        DataSunbeam data,
        EntityManager em,
        Forum forum,
        int threadCount,
        int messageCount,
        List<Account> accounts
    ) {
        for (int index=0; index<threadCount; index++) {
            ForumThread thread = new ForumThread()
                .setTitle("Thread "+index)
                .setDescription(PARAGRAPH_TEXT)
                .setLikeCount(index*5)
                .setMessageCount(index)
                .setStatus(ForumThreadStatus.LIVE)
                .setForum(forum);
            data.persist(em, thread);
            int accountIndex = 0;
            for (int messageIndex=0; messageIndex<messageCount; messageIndex++) {
                ForumMessage message = new ForumMessage()
                    .setPublishedDate(new Date())
                    .setLikeCount(123)
                    .setText(PARAGRAPH_TEXT)
                    .setForumThread(thread)
                    .setAuthor(accounts.get((accountIndex++)%accounts.size()));
                data.persist(em, message);
            }
        }
    }

    static String TINY_PARAGRAPH_TEXT = "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit";

    static String SHORT_PARAGRAPH_TEXT = TINY_PARAGRAPH_TEXT + TINY_PARAGRAPH_TEXT;

    static String PARAGRAPH_TEXT = SHORT_PARAGRAPH_TEXT + SHORT_PARAGRAPH_TEXT;

    static String LONG_PARAGRAPH_TEXT = PARAGRAPH_TEXT + PARAGRAPH_TEXT;
}

