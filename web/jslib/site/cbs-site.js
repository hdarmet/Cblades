import {
    VText,
    historize, VLoginHandler
} from "../vitamin/vitamins.js";
import {
    VHeader,
    VFooter,
    VMainMenu, showMessage
} from "../vitamin/vpage.js";
import {
    VPageContent,
    VWallWithSearch
} from "../vitamin/vcontainer.js";
import {
    VFormContainer
} from "../vitamin/vforms.js";
import {
    CBSLegalNotice,
    CBSContact,
    CBSPartnerships,
    CBSSocialRow
} from "./cbs-page.js";
import {
    requestLog,
    sendGet
} from "../vitamin/components.js";
import {
    vNewArticlesWall,
    vThemesAboutGameWall,
    vThemesAboutLegendsWall,
    vThemesAboutGameExamplesWall,
    vArticlesAboutGameThemeWall,
    vArticlesAboutLegendsThemeWall,
    vArticlesAboutGameExamplesThemeWall,
    vNewspaperContent,
    publishArticle,
    vArticleEditor, vArticleEditorPage, loadRecentArticles, CBSArticle, loadProposedArticle
} from "./cbs-articles.js";
import {
    CBSScenario, loadProposedScenario,
    vScenarioEditor, vScenarioEditorPage
} from "./cbs-scenario.js";
import {
    vThemeEditorPage, vThemeEditor, CBSTheme, loadProposedTheme
} from "./cbs-theme.js";
import {
    loadBoards, vBoardsGallery, vBoardEditorPage, vBoardEditor, CBSBoard, loadProposedBoard
} from "./cbs-board.js";
import {
    CBSGame,
    CBSGameProposal,
    vProposeGameWall,
    vYourGamesWall,
    vJoinGameWall
} from "./cbs-plays.js";
import {
    loadAnnouncement, vHome
} from "./cbs-home.js";
import {
    loadFaction,
    loadFactions, vFactionCountersPageGallery, vFactionsGallery
} from "./cbs-factions.js";
import {
    loadMagicArt, loadMagicArts, vMagicArtCountersPageGallery, vMagicArtsGallery
} from "./cbs-magic.js";
import {
    loadRuleSet, vMarkersGallery,
    vRulesGallery
} from "./cbs-ruleset.js";
import {
    vForums,
    vForum,
    vForumThread
} from "./cbs-forum.js";

export var vMenu = new VMainMenu({ref:"menu"})
    .addMenu({ref:"home", label:"Accueil", action:()=>{
            window.vPageContent.showHome();
    }})
    .addDropdownMenu({ref:"material-menu", label:"Pour jouer"}, $=>{$
        .addMenu({ref:"dwnld-rules-menu", label:"Les règles et les aides de jeu", action:()=>{
                window.vPageContent.showRulesGallery();
            }
        })
        .addMenu({ref:"dwnld-map-menu", label:"Les cartes", action:()=>{
                window.vPageContent.showMapsGallery();
            }
        })
        .addMenu({ref:"dwnld-armies-menu", label:"Les factions", action:()=>{
                window.vPageContent.showFactionsGallery();
            }
        })
        .addMenu({ref:"dwnld-magic-menu", label:"La magie", action:()=>{
                window.vPageContent.showMagicArtsGallery();
            }
        })
        .addMenu({ref:"dwnld-markers-menu", label:"Les marqueurs", action:()=>{
                window.vPageContent.showMarkersGallery();
            }
        })
    })
    .addDropdownMenu({ref:"articles-menu", label:"Pour approfondir"}, $=>{$
        .addMenu({ref:"new-articles-menu", label:"Nouveaux articles", action:()=>{
                window.vPageContent.showNewArticlesWall();
            }
        })
        .addMenu({ref:"about-game-menu", label:"Sur le Jeu", action:()=>{
                window.vPageContent.showThemesAboutGameWall();
            }
        })
        .addMenu({ref:"lore-articles-menu", label:"Histoires et légendes", action:()=>{
                window.vPageContent.showThemesAboutLegendsWall();
            }
        })
        .addMenu({ref:"rule-articles-menu", label:"Exemples de jeu", action:()=>{
                window.vPageContent.showThemesAboutGameExamplesWall();
            }
        })
    })
    .addDropdownMenu({ref:"contribution-menu", label:"Pour contribuer"}, $=>{$
        .addMenu({ref:"propose-theme-menu", label:"Proposer un thème", action:()=>{
                window.vPageContent.showProposeTheme(null);
            }
        })
        .addMenu({ref:"propose-article-menu", label:"Proposer un article", action:()=>{
                window.vPageContent.showProposeArticle();
            }
        })
        .addMenu({ref:"propose-map-menu", label:"Proposer une carte", action:()=>{
                window.vPageContent.showProposeBoard();
            }
        })
        .addMenu({ref:"propose-scenario", label:"Proposer un scénario", action:()=>{
                vPageContent.showProposeScenario();
            }
        })
        .addMenu({ref:"your-proposals", label:"Vos contributions", action:()=>{
                vPageContent.showYourProposals();
            }
        })
    })
    .addMenu({ref:"login", kind:"right-menu", label:VLoginHandler.connection?"Logout":"Login",
        action:()=>{
        if (VLoginHandler.connection) {
            VLoginHandler.logout();
        }
        else {
            VLoginHandler.login();
        }
    }})
    .addDropdownMenu({ref:"play-menu", kind:"right-menu", label:"Jouer en ligne"}, $=>{$
        .addMenu({ref:"my-games", label:"Mes parties", action:()=>{
                vPageContent.showYourGames();
            }
        })
        .addMenu({ref:"propose-game", label:"Proposer une partie", action:()=>{
                vPageContent.showProposeAGame();
            }
        })
        .addMenu({ref:"join-game", label:"Relever un défi", action:()=>{
                vPageContent.showJoinAGame();
            }
        })
        .addMenu({ref:"forum-menu", label:"Forum", action:()=>{
                vPageContent.showForums();
            }
        })
    });

vMenu.onConnection = function({user}) {
    vMenu.get("login").label = user ? "logout" : "login";
}
VLoginHandler.addLoginListener(vMenu);

export var vHeader = new VHeader({
    ref:"header",
    left:"../images/site/left-title.png", right:"../images/site/right-title.png",
    title: "Cursed Blades"
}).addClass("page-header").addVitamin(vMenu);

export var vFooter = new VFooter({
    ref:"footer",
    summary: new VFormContainer({ref:"footer-summary", separated:true, columns:3}, $=>{$
        .addField({field: new VText({ref:"footer-summary-contact", text:"Contact"}).addStyle("margin", "5px")})
        .addField({field: new VText({ref:"footer-summary-legal", text:"Legal"}).addStyle("margin", "5px")})
        .addField({field: new VText({ref:"footer-summary-partnership", text:"Partnership"}).addStyle("margin", "5px")})
    }),
    content: new VFormContainer({ref:"footer-content", separated:true, columns:3}, $=>{$
        .addField({field: new CBSContact({
            address: "Cursed Blades<br>22 Sword Street<br>92120 Lance",
            phone: "(+33)6 8744 0442",
            email: "cursed-blades@gmail.com",
            writeToUs: "Write to us"
        })})
        // CVLegalNotice
        .addField({field: new CBSLegalNotice({
            legalNotice: {
                label: "Legal Notice",
                title: ()=>window.notices["legal-notice"].title,
                content: ()=>window.notices["legal-notice"].text
            },
            privateLifePolicy: {
                label: "Private Life Policy",
                title: ()=>window.notices["private-life-policy-notice"].title,
                content: ()=>window.notices["private-life-policy-notice"].text
            },
            cookiesManagement: {
                label: "Cookies Management",
                title: ()=>window.notices["cookie-management-notice"].title,
                content: ()=>window.notices["cookie-management-notice"].text
            },
            usagePolicy: {
                label: "Usage Policy",
                title: ()=>window.notices["usage-policy-notice"].title,
                content: ()=>window.notices["usage-policy-notice"].text
            },
            contributions: {
                label: "Your Contributions",
                title: ()=>window.notices["your-contributions-notice"].title,
                content: ()=>window.notices["your-contributions-notice"].text
            }
        })})
        .addField({field: new VFormContainer({ref:"footer-content", columns:1}, $=>{$
            .addField({field:new CBSPartnerships({
                patreon: {
                    label: "Our Patreon Page",
                    url: "www.google.fr"
                },
                youtube: {
                    label: "Our Youtube Channel",
                    url: "www.youtube.com"
                }
            })})
            .addField({field: new CBSSocialRow({
                facebook: {
                    url: "www.facebook.fr"
                },
                twitter: {
                    url: "www.twitter.com"
                },
                google: {
                    url: "www.google.com"
                }
                })})
            })})
    })
});

export var vRulesTitle = new VHeader({
    ref:"rules-title",
    left:"../images/site/left-rules.png", right:"../images/site/right-rules.png",
    title: "Rules And Player Aids"
}).addClass("rules-title");

export var vBoardsTitle = new VHeader({
    ref:"maps-title",
    left:"../images/site/left-maps.png", right:"../images/site/right-maps.png",
    title: "Boards"
}).addClass("maps-title");

export var vMagicArtsTitle = new VHeader({
    ref:"magic-title",
    left:"../images/site/left-magic.png", right:"../images/site/right-magic.png",
    title: "Magical Arts"
}).addClass("magic-title");

export var vFactionsTitle = new VHeader({
    ref:"army-title",
    left:"../images/site/left-factions.png", right:"../images/site/right-factions.png",
    title: "Factions"
}).addClass("factions-title");

export var vMarkersTitle = new VHeader({
    ref:"markers-title",
    left:"../images/site/left-markers.png", right:"../images/site/right-markers.png",
    title: "Markers"
}).addClass("markers-title");

export var vContributeTitle = new VHeader({
    ref:"contribute-title",
    left:"../images/site/left-contribute.png", right:"../images/site/right-contribute.png"
}).addClass("contribute-title");

export var vYourProposalsTitle = new VHeader({
    ref:"your-proposals-title",
    left:"../images/site/left-contribute.png", right:"../images/site/right-contribute.png",
    title: "Your Proposals"
}).addClass("contribute-title");

export var vYourProposalsWall = new VWallWithSearch({
    ref:"your-proposals",
    kind: "your-proposals",
    requestNotes: function (page, search) {
        vYourProposalsWall.updateTimestamp = page ? vYourProposalsWall.updateTimestamp||0 : 0;
        loadContributions(vYourProposalsWall.updateTimestamp, search, response=>{
            vYourProposalsWall.loadNotes(response);
        });
    },
    receiveNotes: function(response) {
        for (let item of response) {
            if (!vYourProposalsWall.updateTimestamp || vYourProposalsWall.updateTimestamp>item.updateTimestamp) {
                vYourProposalsWall.updateTimestamp = item.updateTimestamp;
            }
            if (item.type === "theme") {
                this.addNote(new CBSTheme({
                    theme: item,
                    action: item => {
                        loadProposedTheme(item.specification, theme=> {
                            vPageContent.showProposeTheme(theme);
                        })
                    }
                }));
            }
            else if (item.type === "board") {
                this.addNote(new CBSBoard({
                    board:item,
                    action: item => {
                        loadProposedBoard(item.specification, board=>{
                            vPageContent.showProposeBoard(board);
                        })
                    }
                }));
            }
            else if (item.type === "article") {
                this.addNote(new CBSArticle({
                    article:item,
                    action: item => {
                        loadProposedArticle(item.specification, article=> {
                            vPageContent.showProposeArticle(article);
                        })
                    }
                }));
            }
            else if (item.type === "scenario") {
                    this.addNote(new CBSScenario({
                    scenario:item,
                    action: item => {
                        loadProposedScenario(item.specification, scenario=>{
                            vPageContent.showProposeScenario(scenario);
                        })
                    }
                }));
            }
        }
    },
    searchAction: ()=>{
        vYourProposalsWall.clearNotes()
    }
});

export function loadContributions(age, search, update) {
    sendGet("/api/contributions/personal?age=" + age + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load Contributions success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Load Contributions failure: " + text + ": " + status);
            showMessage("Unable to load Contributions", text);
        }
    );
}

export var vForumTitle = new VHeader({
    ref:"forum-title",
    title: "Forum",
    left:"../images/site/left-forum.png", right:"../images/site/right-forum.png"
}).addClass("forum-page-title");

export var vGamesTitle = new VHeader({
    ref:"games-title",
    left:"../images/site/left-games.png", right:"../images/site/right-games.png",
}).addClass("games-title");

export var vNewArticlesTitle = new VHeader({
    ref:"new-articles-title",
    left:"../images/site/left-new-articles.png", right:"../images/site/right-new-articles.png",
    title: "New Articles"
}).addClass("new-articles-title");

export var vArticlesAboutGameTitle = new VHeader({
    ref:"articles-about-game-title",
    left:"../images/site/left-articles-about-game.png", right:"../images/site/right-articles-about-game.png",
    title: "About the game"
}).addClass("articles-about-game-title");

export var vArticlesAboutLegendsTitle = new VHeader({
    ref:"articles-about-legends-title",
    left:"../images/site/left-legends.png", right:"../images/site/right-legends.png",
    title: "Cursed Legends"
}).addClass("articles-about-legends-title");

export var vArticlesAboutGameExamplesTitle = new VHeader({
    ref:"articles-about-game-example-title",
    left:"../images/site/left-games.png", right:"../images/site/right-games.png",
    title: "Game Examples"
}).addClass("articles-about-game-examples-title");

export var vNewArticlesNewspaperTitle = new VHeader({
    ref:"new-articles-newspaper-title",
    left:"../images/site/left-new-articles.png", right:"../images/site/right-new-articles.png"
}).addClass("newspaper-title");

export var vArticlesAboutGameNewspaperTitle = new VHeader({
    ref:"articles-about-legends-newspaper-title",
    left:"../images/site/left-articles-about-game.png", right:"../images/site/right-articles-about-game.png"
}).addClass("newspaper-title");

export var vArticlesAboutLegendsNewspaperTitle = new VHeader({
    ref:"articles-about-legends-newspaper-title",
    left:"../images/site/left-legends.png", right:"../images/site/right-legends.png"
}).addClass("newspaper-title");

export var vArticlesAboutGameExamplesNewspaperTitle = new VHeader({
    ref:"game-example-articles-newspaper-title",
    left:"../images/site/left-games.png", right:"../images/site/right-games.png"
}).addClass("newspaper-title");

class CBSPageContent extends VPageContent {

    constructor() {
        super({ref: "page-content"});
        this.showHome();
    }

    _showHome(byHistory, historize) {
        loadAnnouncement(
            ()=>{
                this.changePage(null, vHome, byHistory, historize);
            }
        );
        return true;
    }

    showHome() {
        this._showHome(false, ()=>
            historize("home", "window.vPageContent._showHome(true);")
        );
    }

    _showRulesGallery(byHistory, historize) {
        loadRuleSet( "rules", vRulesGallery,
            ()=>{
                return this.changePage(vRulesTitle, vRulesGallery, byHistory, historize);
            }
        );
    }

    showRulesGallery() {
        this._showRulesGallery(false, ()=>
            historize("rules-gallery", "window.vPageContent._showRulesGallery(true);")
        );
    }

    _showMapsGallery(byHistory, historize) {
        loadBoards(
            ()=>{
                this.changePage(vBoardsTitle, vBoardsGallery, byHistory, historize);
            }
        );
    }

    showMapsGallery() {
        this._showMapsGallery(false, ()=>
            historize("maps-gallery", "window.vPageContent._showMapsGallery(true);")
        );
    }

    _showFactionsGallery(byHistory, historize) {
        loadFactions(
            ()=>{
                this.changePage(vFactionsTitle, vFactionsGallery, byHistory, historize);
            }
        );
    }

    showFactionsGallery() {
        this._showFactionsGallery(false, ()=>
            historize("factions-gallery", "window.vPageContent._showFactionsGallery(true);")
        );
    }

    _showFactionCountersGallery(faction, byHistory, historize) {
        loadFaction(faction, faction=> {
            this.changePage(vFactionsTitle, vFactionCountersPageGallery, byHistory, historize);
        });
    }

    showFactionCountersGallery(faction) {
        this._showFactionCountersGallery(faction, false, ()=>
            historize("faction-counters-gallery", "window.vPageContent._showFactionCountersGallery(event.state.faction, true);")
        );
    }

    showMagicArtCountersGallery(faction) {
        this._showMagicArtCountersGallery(faction, false, ()=>
            historize("magic-counters-gallery", "window.vPageContent._showMagicArtCountersGallery(event.state.faction, true);")
        );
    }

    _showMagicArtsGallery(byHistory, historize) {
        loadMagicArts(
            ()=>{
                this.changePage(vMagicArtsTitle, vMagicArtsGallery, byHistory, historize);
            }
        );
    }

    showMagicArtsGallery() {
        this._showMagicArtsGallery(false, ()=>
            historize("magics-gallery", "window.vPageContent._showMagicArtsGallery(true);")
        );
    }

    _showMagicArtCountersGallery(faction, byHistory, historize) {
        loadMagicArt(faction, faction=> {
            this.changePage(vMagicArtsTitle, vMagicArtCountersPageGallery, byHistory, historize);
        });
    }

    _showMarkersGallery(byHistory, historize) {
        loadRuleSet( "markers", vMarkersGallery,
            ()=>{
                return this.changePage(vMarkersTitle, vMarkersGallery, byHistory, historize);
            }
        );
    }

    showMarkersGallery() {
        this._showMarkersGallery(false, ()=>
            historize("markers-gallery", "window.vPageContent._showMarkersGallery(true);")
        );
    }

    _showNewArticlesWall(byHistory, historize) {
        vNewArticlesWall.clearNotes();
        return this.changePage(vNewArticlesTitle, vNewArticlesWall, byHistory, historize);
    }

    showNewArticlesWall() {
        this._showNewArticlesWall(false, ()=>
            historize("new-articles", "window.vPageContent._showNewArticlesWall(true);")
        );
    }

    _showThemesAboutGameWall(byHistory, historize) {
        vThemesAboutGameWall.clearNotes();
        return this.changePage(vArticlesAboutGameTitle, vThemesAboutGameWall, byHistory, historize);
    }

    showThemesAboutGameWall() {
        this._showThemesAboutGameWall(false, ()=>
            historize("themes-about-game", "window.vPageContent._showThemesAboutGameWall(true);")
        );
    }

    _showThemesAboutLegendsWall(byHistory, historize) {
        vThemesAboutLegendsWall.clearNotes();
        return this.changePage(vArticlesAboutLegendsTitle, vThemesAboutLegendsWall, byHistory, historize);
    }

    showThemesAboutLegendsWall() {
        this._showThemesAboutLegendsWall(false, ()=>
            historize("themes-about-game", "window.vPageContent._showThemesAboutLegendsWall(true);")
        );
    }

    _showThemesAboutGameExamplesWall(byHistory, historize) {
        vThemesAboutGameExamplesWall.clearNotes();
        return this.changePage(vArticlesAboutGameExamplesTitle, vThemesAboutGameExamplesWall, byHistory, historize);
    }

    showThemesAboutGameExamplesWall() {
        this._showThemesAboutGameExamplesWall(false, ()=>
            historize("themes-about-game", "window.vPageContent._showThemesAboutGameExamplesWall(true);")
        );
    }

    _showArticlesAboutGameThemeWall(theme, byHistory, historize) {
        vArticlesAboutGameThemeWall.setTheme(theme);
        return this.changePage(vArticlesAboutGameTitle, vArticlesAboutGameThemeWall, byHistory, historize);
    }

    showArticlesAboutGameThemeWall(theme) {
        this._showArticlesAboutGameThemeWall(theme.id,false, ()=>
            historize("articles-about-game", "window.vPageContent._showArticlesAboutGameThemeWall("+theme.id+", true);")
        );
    }

    _showArticlesAboutLegendsThemeWall(theme, byHistory, historize) {
        vArticlesAboutLegendsThemeWall.setTheme(theme);
        return this.changePage(vArticlesAboutLegendsTitle, vArticlesAboutLegendsThemeWall, byHistory, historize);
    }

    showArticlesAboutLegendsThemeWall(theme) {
        this._showArticlesAboutLegendsThemeWall(theme.id,false, ()=>
            historize("articles-about-legends", "window.vPageContent._showArticlesAboutLegendsThemeWall("+theme.id+", true);")
        );
    }

    _showArticlesAboutGameExamplesThemeWall(theme, byHistory, historize) {
        vArticlesAboutGameExamplesThemeWall.setTheme(theme);
        return this.changePage(vArticlesAboutGameExamplesTitle, vArticlesAboutGameExamplesThemeWall, byHistory, historize);
    }

    showArticlesAboutGameExamplesThemeWall(theme) {
        this._showArticlesAboutGameExamplesThemeWall(theme.id,false, ()=>
            historize("articles-about-game-examples", "window.vPageContent._showArticlesAboutGameExamplesThemeWall("+theme.id+", true);")
        );
    }

    _showNewArticlesNewspaper(article, byHistory, historize) {
        vNewArticlesNewspaperTitle.setTitle(article.title);
        vNewspaperContent.setArticle(publishArticle(vNewspaperContent, article));
        return this.changePage(vNewArticlesNewspaperTitle, vNewspaperContent, byHistory, historize);
    }

    showNewArticlesNewspaper(article) {
        let specification = article.specification;
        this._showNewArticlesNewspaper(specification, false, ()=>
            historize("new-articles-newspaper", `window.vPageContent._showNewArticlesNewspaper(${JSON.stringify(specification)}, true);`)
        );
    }

    _showArticlesAboutGameNewspaper(article, byHistory, historize) {
        vArticlesAboutGameNewspaperTitle.setTitle(article.title);
        vNewspaperContent.setArticle(publishArticle(vNewspaperContent, article));
        return this.changePage(vArticlesAboutGameNewspaperTitle, vNewspaperContent, byHistory, historize);
    }

    showArticlesAboutGameNewspaper(article) {
        let specification = article.specification;
        this._showArticlesAboutGameNewspaper(specification, false, ()=>
            historize("articles-about-game-newspaper", `window.vPageContent._showArticlesAboutGameNewspaper(${JSON.stringify(specification)}, true);`)
        );
    }

    _showArticlesAboutLegendsNewspaper(article, byHistory, historize) {
        vArticlesAboutLegendsNewspaperTitle.setTitle(article.title);
        vNewspaperContent.setArticle(publishArticle(vNewspaperContent, article));
        return this.changePage(vArticlesAboutLegendsNewspaperTitle, vNewspaperContent, byHistory, historize);
    }

    showArticlesAboutLegendsNewspaper(article) {
        let specification = article.specification;
        this._showArticlesAboutLegendsNewspaper(specification, false, ()=>
            historize("articles-about-legends-newspaper", `window.vPageContent._showArticlesAboutLegendsNewspaper(${JSON.stringify(specification)}, true);`)
        );
    }

    _showArticlesAboutGameExamplesNewspaper(article, byHistory, historize) {
        vArticlesAboutGameExamplesNewspaperTitle.setTitle(article.title);
        vNewspaperContent.setArticle(publishArticle(vNewspaperContent, article));
        return this.changePage(vArticlesAboutGameExamplesNewspaperTitle, vNewspaperContent, byHistory, historize);
    }

    showArticlesAboutGameExamplesNewspaper(article) {
        let specification = article.specification;
        this._showArticlesAboutGameExamplesNewspaper(specification, false, ()=>
            historize("game-example-articles-newspaper", `window.vPageContent._showArticlesAboutGameExamplesNewspaper(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeTheme(themeSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose A Theme");
        vThemeEditor.theme = themeSpec;
        return this.changePage(vContributeTitle, vThemeEditorPage, byHistory, historize);
    }

    showProposeTheme(theme = null) {
        let specification = theme ? theme:{
            ref: "theme1", title: "", img: `../images/site/themes/rules.png`,
            description: ""
        };
        this._showProposeTheme(specification,false, ()=>
            historize("propose-theme", `window.vPageContent._showProposeTheme(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeArticle(articleSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose An Article");
        vArticleEditor.article = articleSpec;
        return this.changePage(vContributeTitle, vArticleEditorPage, byHistory, historize);
    }

    showProposeArticle(article = null) {
        let specification = article ? article:{
            ref: "article1", title: "Article Title"
        };
        this._showProposeArticle(specification,false, ()=>
            historize("propose-article", `window.vPageContent._showProposeArticle(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeBoard(boardSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose A Board");
        vBoardEditor.board = boardSpec;
        return this.changePage(vContributeTitle, vBoardEditorPage, byHistory, historize);
    }

    showProposeBoard(board = null) {
        let specification = board ? board: {
            ref: "board",
            title: "",
            description: ""
        };
        this._showProposeBoard(specification, false, ()=>
            historize("propose-board", `window.vPageContent._showProposeBoard(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeScenario(scenarioSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose A Scenario");
        vScenarioEditor.scenario = scenarioSpec;
        return this.changePage(vContributeTitle, vScenarioEditorPage, byHistory, historize);
    }

    showProposeScenario(scenario = null) {
        let specification = scenario ? scenario: {
            ref: "scenario1", title: "Scenario Title"
        };
        this._showProposeScenario(specification,false, ()=>
            historize("propose-scenario", `window.vPageContent._showProposeScenario(${JSON.stringify(specification)},true);`)
        );
    }

    _showYourProposals(byHistory, historize) {
        vContributeTitle.setTitle("Your Proposals");
        vYourProposalsWall.clearNotes();
        return this.changePage(vYourProposalsTitle, vYourProposalsWall, byHistory, historize);
    }

    showYourProposals() {
        this._showYourProposals(false, ()=>
            historize("your-proposals", "window.vPageContent._showYourProposals(true);")
        );
    }

    _showForums(byHistory, historize) {
        vForums.loadForums();
        return this.changePage(vForumTitle, vForums, byHistory, historize);
    }

    showForums() {
        this._showForums(false, ()=>
            historize("forums", "window.vPageContent._showForums(true);")
        );
    }

    _showForumThreads(forum, byHistory, historize) {
        vForum.setForum(forum);
        return this.changePage(vForumTitle, vForum, byHistory, historize);
    }

    showForumThreads(forum) {
        this._showForumThreads(forum, false, ()=>
            historize("forum-threads", `window.vPageContent._showForumThreads(${JSON.stringify(forum)}, true);`)
        );
    }

    _showForumThread(thread, byHistory, historize) {
        vForumThread.setThread(thread);
        return this.changePage(vForumTitle, vForumThread, byHistory, historize);
    }

    showForumThread(thread) {
        this._showForumThread(thread, false, ()=>
            historize("forum-thread", `window.vPageContent._showForumThread(${JSON.stringify(thread)}, true);`)
        );
    }

    _showYourGames(byHistory, historize) {
        vGamesTitle.setTitle("My Games");
        vYourGamesWall.clearNotes();
        return this.changePage(vGamesTitle, vYourGamesWall, byHistory, historize);
    }

    showYourGames() {
        this._showYourGames(false, ()=>
            historize("my-games", `window.vPageContent._showYourGames(true);`)
        );
    }

    _showProposeAGame(byHistory, historize) {
        vGamesTitle.setTitle("Propose A Game");
        vProposeGameWall.clearNotes();
        return this.changePage(vGamesTitle, vProposeGameWall, byHistory, historize);
    }

    showProposeAGame() {
        this._showProposeAGame(false, ()=>
            historize("propose-a-game", `window.vPageContent._showProposeAGame(true);`)
        );
    }

    _showJoinAGame(byHistory, historize) {
        vGamesTitle.setTitle("Join A Game");
        vJoinGameWall.clearNotes();
        return this.changePage(vGamesTitle, vJoinGameWall, byHistory, historize);
    }

    showJoinAGame() {
        this._showJoinAGame(false, ()=>
            historize("join-a-game", `window.vPageContent._showJoinAGame(true);`)
        );
    }

}

sendGet("/api/notice/published",
    (text, status) => {
        window.notices = {};
        let notices = JSON.parse(text);
        for (let notice of notices) {
            window.notices[notice.category] = notice;
        }
    },
    (text, status) => {
        window.alert("Error: "+text);
    }
)

sendGet("/api/presentation/published",
    (text, status) => {
        window.presentations = {};
        let presentations = JSON.parse(text);
        for (let presentation of presentations) {
            window.presentations[presentation.category] = presentation;
        }
        vBoardEditorPage.description = window.presentations["edit-board-presentation"].text;
        vThemeEditorPage.description = window.presentations["edit-theme-presentation"].text;
    },
    (text, status) => {
        window.alert("Error: "+text);
    }
)

window.vPageContent = new CBSPageContent();
