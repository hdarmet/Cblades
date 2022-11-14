import {
    VText,
    VMagnifiedImage,
    VSlot,
    historize, VLoginHandler, download
} from "../vitamin/vitamins.js";
import {
    VHeader,
    VFooter,
    VMainMenu
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
    vArticleEditor, vArticleEditorPage
} from "./cbs-articles.js";
import {
    vScenarioEditor, vScenarioEditorPage
} from "./cbs-scenario.js";
import {
    CBSGallery,
    CBSSummary
} from "./cbs-container.js";
import {
    vThemeEditorPage, vThemeEditor
} from "./cbs-theme.js";
import {
    loadBoards, vBoardsGallery, vBoardEditorPage, vBoardEditor
} from "./cbs-board.js";
import {
    VForum,
    VForums,
    VForumThread
} from "../vitamin/vforum.js";
import {
    CBSGame, CBSGameProposal, CBSGameScenario, CBSJoinGameWall, CBSProposeGameWall,
    CBSYourGamesWall
} from "./cbs-plays.js";
import {
    loadAnnouncement, vHome
} from "./cbs-home.js";

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
                window.vPageContent.showMagicGallery();
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

var rules = {
    "game-rules": {ref:"game-rules", name: "Game Rules", description: "Rules Of The Game", file: "Cursed Blades Rules" },
    "units-activation": {ref:"units-activation", name: "Units Activation Player Aid", description: "The Player Aid that helps to activate a Unit", file: "Fiche Activation des Unités" },
}

export function declareRule(ruleRef, ruleName, ruleDescription, ruleFile) {
    return {
        ref:ruleRef,
        img:`../images/site/rules/${ruleRef}.png`, width:"90%",
        title: ruleName, description:ruleDescription,
        button:"Download", action:event=>{
            download(`../docs/${ruleFile}.pdf`);
        }
    };
}

export var vRulesTitle = new VHeader({
    ref:"rules-title",
    left:"../images/site/left-rules.png", right:"../images/site/right-rules.png",
    title: "Rules And Player Aids"
}).addClass("rules-title");

export var vRulesGallery = new CBSGallery({ref:"rules", kind: "gallery-rules"});

vRulesGallery.show = function() {
    this.clearCards();
    for (let rule in rules) {
        this.addCard(declareRule(rules[rule].ref, rules[rule].name, rules[rule].description, rules[rule].file));
    }
    return this;
}

export var vBoardsTitle = new VHeader({
    ref:"maps-title",
    left:"../images/site/left-maps.png", right:"../images/site/right-maps.png",
    title: "Boards"
}).addClass("maps-title");

export var vMagicTitle = new VHeader({
    ref:"magic-title",
    left:"../images/site/left-magic.png", right:"../images/site/right-magic.png",
    title: "Magical Arts"
}).addClass("magic-title");

export function declareMagic(magicRef, magicName, magicDescription) {
    return {
        ref:"magic-"+magicName,
        img:`../images/site/magic/${magicRef}.png`,
        title:magicName, description:magicDescription,
        button:"Downloadable", action:event=>{
            vPageContent.showMagicCountersGallery(magics[magicRef]);
        }
    };
}

var magics = {
    arcanic: {
        ref: "arcanic", name: "Arcanic Art",
        description: "The Versatile Art of Arcany. The Versatile Art of Arcany. The Versatile Art of Arcany. The Versatile Art of Arcany. The Versatile Art of Arcany. The Versatile Art of Arcany.",
        counterSheets: 1,
        playerAid: "Fiche Art Arcanique"
    },
    pyromantic: {
        ref: "pyromantic", name: "Pyromantic Art",
        description: "The Destructive Art Of Pyromancy",
        counterSheets: 1,
        playerAid: "Fiche Art Pyromantique"
    },
    telluric: {
        ref: "telluric", name: "Tellurical Art",
        description: "The Fundamental Art Of Tellury"
    },
    biotic: {
        ref: "biotic", name: "Biotic Art",
        description: "The Fascinating Art Of Biology"
    },
    demonic: {
        ref: "demonic", name: "Demonological Art",
        description: "The Frightening Art Of Demonology"
    },
    necromantic: {
        ref: "necromantic", name: "Necromancy Art",
        description: "The Horrible Art Of Necromancy"
    },
    theologic: {
        ref: "theologic", name: "Theological Art",
        description: "The Saint Art Of Theology"
    },
}

export var vMagicGallery = new CBSGallery({ref:"magic", kind: "gallery-magic"});

vMagicGallery.show = function() {
    this.clearCards();
    for (let magic in magics) {
        this.addCard(declareMagic(magics[magic].ref, magics[magic].name, magics[magic].description, magics[magic].playerAid));
    }
    return this;
}

export function declareMagicPlayerAid(magicRef, playerAid) {
    return {
        ref:"playerAid",
        img:`../images/site/magic/${magicRef}/player-aid.png`, width:"90%",
        title:"Player Aid",
        playerAid: `../site/docs/${playerAid}.pdf`,
        button:"Download", action:event=>{
            download(`../docs/${playerAid}.pdf`);
        }
    };
}

export function declareMagicCounter(magicRef, counterRef, counterName) {
    return {
        ref:counterRef,
        image: new VMagnifiedImage({
            ref:`img-${magicRef}-${counterRef}`,
            img:`../images/site/magic/${magicRef}/${counterRef}-icon.png`,
            zoomImg:`../images/site/magic/${magicRef}/${counterRef}.png`,
            width:"90%"
        }),
        title:counterName,
        button:"Download", action:event=>{
            download(`../images/site/magic/${magicRef}/${counterRef}.png`);
        }
    };
}

export var vMagicCountersGallery = new CBSGallery({ref:"magic-counters", kind: "gallery-magic-counters"});

vMagicCountersGallery.setMagicArt = function(art) {
    this._art = art;
}

vMagicCountersGallery.show = function() {
    vMagicCountersGallery.clearCards();
    vMagicCountersGallery.addCard(declareMagicPlayerAid(
        this._art.ref, this._art.playerAid
    ))
    for (let counterIndex=1; counterIndex<=this._art.counterSheets; counterIndex++) {
        vMagicCountersGallery.addCard(declareMagicCounter(
            this._art.ref,
            `counters${counterIndex}`,
            `Counter Sheet # ${counterIndex} Front`
        ))
        .addCard(declareMagicCounter(
            this._art.ref,
            `counters${counterIndex}b`,
            `Counter Sheet # ${counterIndex} Back`
        ))
    }
    return this;
}

export var vMagicSummary = new VSlot({ref: "counter-page-summary-slot"});

export var vMagicCountersPageGallery = new VFormContainer({ref: "magic-counters-page-content"})
    .addClass("gallery-magic-counters-page")
    .add(vMagicSummary)
    .add(vMagicCountersGallery);

vMagicCountersPageGallery.show = function() {
    vMagicSummary.set({
        content: new CBSSummary({
            ref: "magic-summary",
            img: `../images/site/magic/${vMagicCountersGallery._art.ref}.png`,
            alt: vMagicCountersGallery._art.name,
            title: vMagicCountersGallery._art.name,
            description: vMagicCountersGallery._art.description
        })
    });
    vMagicCountersGallery.show();
}

export var vFactionsTitle = new VHeader({
    ref:"army-title",
    left:"../images/site/left-factions.png", right:"../images/site/right-factions.png",
    title: "Factions"
}).addClass("factions-title");

export function declareFaction(factionRef, factionName, factionDescription) {
    return {
        ref:"army-"+factionName,
        img:`../images/site/factions/${factionRef}.png`,
        title:factionName, description:factionDescription,
        button:"Counters Sheets", action:event=>{
            vPageContent.showFactionCountersGallery(factions[factionRef]);
        }
    };
}

var factions = {
    amarys: {
        ref: "amarys", name: "Amarys",
        description: "The majestuous Sun-kingdom of Amarys",
        counterSheets: 2
    },
    roughneck: {
        ref: "roughneck", name: "Roughneck",
        description: `The brave roughneck are the best human soldiers. The brave roughneck are the 
        best human soldiers. The brave roughneck are the best human soldiers. The brave roughneck are the best human 
        soldiers`,
        counterSheets: 3
    },
    orcs: {
        ref: "orcs", name: "Orcs",
        description: "The savage orcs",
        counterSheets: 3
    },
    elves: {
        ref: "elves", name: "Elves",
        description: "The brilliant elves",
        counterSheets: 3
    },
    dwarves: {
        ref: "dwarves", name: "Dwarves",
        description: "The tenacious dwarves",
        counterSheets: 3
    },
    skavens: {
        ref: "skavens", name: "Skavens",
        description: "The vicious skavens",
        counterSheets: 3
    },
}

export var vFactionsGallery = new CBSGallery({ref:"factions", kind: "gallery-factions"});

vFactionsGallery.show = function() {
    this.clearCards();
    for (let faction in factions) {
        this.addCard(declareFaction(factions[faction].ref, factions[faction].name, factions[faction].description));
    }
    return this;
}

export function declareFactionCounter(factionRef, counterRef, counterName) {
    return {
        ref:counterRef,
        image: new VMagnifiedImage({
            ref:`img-${factionRef}-${counterRef}`,
            img:`../images/site/factions/${factionRef}/${counterRef}-icon.png`,
            zoomImg:`../images/site/factions/${factionRef}/${counterRef}.png`,
            width:"90%"
        }),
        title:counterName,
        button:"Download", action:event=>{
            download(`../images/site/factions/${factionRef}/${counterRef}.png`);
        }
    };
}

export var vFactionCountersGallery = new CBSGallery({ref:"factions-counter", kind: "gallery-faction-counters"});

vFactionCountersGallery.setFaction = function(faction) {
    this._faction = faction;
}

vFactionCountersGallery.show = function() {
    vFactionCountersGallery.clearCards();
    for (let counterIndex=1; counterIndex<=this._faction.counterSheets; counterIndex++) {
        vFactionCountersGallery.addCard(declareFactionCounter(
            this._faction.ref,
            `counters${counterIndex}`,
            `Counter Sheet # ${counterIndex} Front`
        ))
        .addCard(declareFactionCounter(
                this._faction.ref,
                `counters${counterIndex}b`,
                `Counter Sheet # ${counterIndex} Back`
        ))
    }
    return this;
}

export var vFactionSummary = new VSlot({ref: "counter-page-summary-slot"});

export var vFactionCountersPageGallery = new VFormContainer({ref: "faction-counters-page-content"})
    .addClass("gallery-faction-counters-page")
    .add(vFactionSummary)
    .add(vFactionCountersGallery);

vFactionCountersPageGallery.show = function() {
    vFactionSummary.set({
        content: new CBSSummary({
            ref: "faction-summary",
            img: `../images/site/factions/${vFactionCountersGallery._faction.ref}.png`,
            alt: vFactionCountersGallery._faction.name,
            title: vFactionCountersGallery._faction.name,
            description: vFactionCountersGallery._faction.description
        })
    });
    vFactionCountersGallery.show();
}

var markers = {
    "markers-1": {ref:"markers-1", sheet: "counters1", name: "markers1", description: "First sheet of markers" },
    "markers-2": {ref:"markers-2", sheet: "counters2", name: "markers2", description: "Second sheet of markers" },
    "markers-3": {ref:"markers-3", sheet: "counters3", name: "markers3", description: "Third sheet of markers" }
}

export function declareMarkers(markersRef, markersSheet, markersName, markersDescription) {
    return {
        ref:markersRef,
        image: new VMagnifiedImage({
            ref:`img-${markersRef}`,
            img:`../images/site/markers/${markersSheet}-icon.png`,
            zoomImg:`../images/site/markers/${markersSheet}.png`,
            width:"90%"
        }),
        title:markersName, description:markersDescription,
        button:"Download", action:event=>{
            download(`../images/site/markers/${markersSheet}.png`);
        }
    };
}

export var vMarkersTitle = new VHeader({
    ref:"markers-title",
    left:"../images/site/left-markers.png", right:"../images/site/right-markers.png",
    title: "Markers"
}).addClass("markers-title");

export var vMarkersGallery = new CBSGallery({ref:"markers", kind: "gallery-markers"});

vMarkersGallery.show = function() {
    this.clearCards();
    for (let marker in markers) {
        this.addCard(declareMarkers(markers[marker].ref, markers[marker].sheet, markers[marker].name, markers[marker].description));
        this.addCard(declareMarkers(markers[marker].ref, markers[marker].sheet+"b", markers[marker].name, markers[marker].description));
    }
    return this;
}

var paragrpahText = `
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
`;

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
    searchAction: text=>alert("search:"+text)
}/*, $=>{$
    .addNote(new CBSArticle({
        id: 19,
        ref: "art1", title: "An Interesting Story", paragraphs: [
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, imgPos:"left", title:"Ca commence...", description:[paragrpahText, paragrpahText]},
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"right", title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            window.vPageContent.showProposeArticle(article);
        }
    }))
    .addNote(new CBSScenario({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        action:scenario=>{
            window.vPageContent.showProposeScenario(scenario);
        }
    }))
    .addNote(new CBSTheme({
        ref: "theme1", title: "Rules", img: `../images/site/themes/rules.png`,
        description: paragrpahText,
        action: theme => {
            window.vPageContent.showProposeTheme(theme);
        }
    }))
    .addNote(new CBSBoard({
        ref: "map1", title: "The Map", img: `../images/maps/map-7.png`,
        description: paragrpahText,
        action: map => {
            window.vPageContent.showProposeBoard(map);
        }
    }))
}*/);


export var vForumTitle = new VHeader({
    ref:"forum-title",
    title: "Forum",
    left:"../images/site/left-forum.png", right:"../images/site/right-forum.png"
}).addClass("forum-title");

function getForums() {
    return [
        {
            title: "Discussing Retailers",
            threads: 9,
            replies: 107,
            comment: `Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers
    GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 1",
            lastCommentAuthor: "Moray Johnson"
        },
        {
            title: "Board Game Design",
            threads: 22,
            replies: 295,
            comment: `A gathering place to discuss game design
            What areas of history would make a great hidden movement game? Extra points for non-military!`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 2",
            lastCommentAuthor: "John Breckenridge"
        },
        {
            title: "Design Contests",
            threads: 857,
            replies: 56,
            comment: `Announce and participate in game design competitions
        2022 Solitaire Print and Play Contest`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 3",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Art and Graphic Design",
            threads: 44,
            replies: 25,
            comment: `Show off your work, and ask for advice
        Which logo design?`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 4",
            lastCommentAuthor: "agoJohn Carimando"
        },
        {
            title: "Design Theory",
            hreads: 1,
            replies: 18,
            comment: `Principles of game design not specific to one game
    Co-op games: a calm discussion on "pass or fail"`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 5",
            lastCommentAuthor: "agoOblivion Doll"
        },
        {
            title: "Design Queries and Problems",
            threads: 25,
            replies: 25,
            comment: `Ask specific questions about a design in the works
    Indirect storytelling for a game.`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 6",
            lastCommentAuthor: "agoHayden Robinson"
        },
        {
            title: "Works in Progress",
            threads: 74,
            replies: 114,
            comment: `Share updates about your projects
        [WIP]Make Sail[2022 Solitaire Print&Play Game Design Contest][Components Available]`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 7",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Seeking Playtesters",
            threads: 26,
            replies: 11,
            comment: `Find folks willing to test out your creation
    Looking for Playtesters: S'Morse Code`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 8",
            lastCommentAuthor: "agoCourtney Falk"
        },
        {
            title: "Discussing Retailers",
            threads: 9,
            replies: 107,
            comment: `Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers
    GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 9",
            lastCommentAuthor: "Moray Johnson"
        },
        {
            title: "Board Game Design",
            threads: 22,
            replies: 295,
            comment: `A gathering place to discuss game design
            What areas of history would make a great hidden movement game? Extra points for non-military!`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 10",
            lastCommentAuthor: "John Breckenridge"
        },
        {
            title: "Design Contests",
            threads: 857,
            replies: 56,
            comment: `Announce and participate in game design competitions
        2022 Solitaire Print and Play Contest`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 11",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Art and Graphic Design",
            threads: 44,
            replies: 25,
            comment: `Show off your work, and ask for advice
        Which logo design?`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 12",
            lastCommentAuthor: "agoJohn Carimando"
        },
        {
            title: "Design Theory",
            hreads: 1,
            replies: 18,
            comment: `Principles of game design not specific to one game
    Co-op games: a calm discussion on "pass or fail"`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 13",
            lastCommentAuthor: "agoOblivion Doll"
        },
        {
            title: "Design Queries and Problems",
            threads: 25,
            replies: 25,
            comment: `Ask specific questions about a design in the works
    Indirect storytelling for a game.`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 14",
            lastCommentAuthor: "agoHayden Robinson"
        },
        {
            title: "Works in Progress",
            threads: 74,
            replies: 114,
            comment: `Share updates about your projects
        [WIP]Make Sail[2022 Solitaire Print&Play Game Design Contest][Components Available]`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 15",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Seeking Playtesters",
            threads: 26,
            replies: 11,
            comment: `Find folks willing to test out your creation
    Looking for Playtesters: S'Morse Code`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 16",
            lastCommentAuthor: "agoCourtney Falk"
        }
    ];
}

function getComments(pageIndex) {
    let names = ['Dominique', 'Pierre', 'Thomas'];
    let levels = ['Warrior', 'Knight', 'King'];
    let comments = [];
    for (let index=pageIndex*10; index<25 && index<pageIndex*10+10; index++) {
        comments.push({
            avatarImage: `../images/site/avatars/avatar${index%3+1}.png`,
            avatarIdentity: names[index%3],
            avatarLevel: levels[index%3],
            avatarCommentCount: (index%3+1)*17,
            //comment: `The ${index}th comment of ${names[index%3]}`,
            comment: paragrpahText,
            likes: index*2+1,
            liked: index%5 === 0,
            date: new Date()
        });
    }
    return comments;
}

export var vForums = new VForums({
    loadForums:(update)=>{
        update({
            forums: getForums()
        });
    },
    selectForum:forum=>{
        window.vPageContent.showForumThreads({
            // forum description
        });
    }
});

function getForum(pageIndex) {
    let threads = [];
    for (let index=pageIndex*10; index<25 && index<pageIndex*10+10; index++) {
        threads.push({
            title: "Discussing thread " + index,
            threads: 107,
            comments: 214,
            comment: paragrpahText,
            lastCommentDate: new Date(),
            lastCommentAuthor: "Moray Johnson"
        });
    }
    return threads;
}

export var vForum = new VForum({
    loadThreads:(pageIndex, update)=>{
        update({
            title: "Mon petit forum",
            pageCount: 3,
            currentPage: pageIndex,
            threadsCount: 25,
            firstThread: pageIndex*10+1,
            lastThread: pageIndex*10+10,
            threads: getForum(pageIndex)
        });
    },
    selectThread:thread=>{
        window.vPageContent.showForumThread({
            // thread description
        });
    }
});

export var vForumThread = new VForumThread({
    loadPage:(pageIndex, update)=>{
        update({
            title: "Ma petite discussion",
            pageCount: 3,
            currentPage: pageIndex,
            commentCount: 25,
            firstComment: pageIndex*10+1,
            lastComment: pageIndex*10+10,
            comments: getComments(pageIndex)
        });
    },
    send: post=>{
        console.log("Post sent", post);
    }
});

export var vGamesTitle = new VHeader({
    ref:"games-title",
    left:"../images/site/left-games.png", right:"../images/site/right-games.png",
}).addClass("games-title");

function getGame() {
    return new CBSGame({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        turnNumber: 12,
        participations: [
            {
                army: "Orc",
                player: "Big-Cheftain",
                status: "active"
            },
            {
                army: "Roughneck",
                player: "rearmor",
                status: "passive"
            }
        ],
        action:game=>{
            vYourGamesWall.openInNewTab("./cblades.html");
        }
    });
}

export var vYourGamesWall = new CBSYourGamesWall()
    .addNote(getGame())
    .addNote(getGame())
    .addNote(getGame())
    .addNote(getGame());

function getScenario() {
    return new CBSGameScenario({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        turnNumber: 12,
        participations: [
            {
                army: "Orc"
            },
            {
                army: "Roughneck",
            },
            {
                army: "Elves",
            }
        ]
    });
}

export var vProposeGameWall = new CBSProposeGameWall()
    .addNote(getScenario())
    .addNote(getScenario())
    .addNote(getScenario())
    .addNote(getScenario());

function getProposal() {
    return new CBSGameProposal({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        turnNumber: 12,
        participations: [
            {
                army: "Orc",
                player: "Big-Cheftain"
            },
            {
                army: "Roughneck",
            },
            {
                army: "Elves",
            }
        ]
    });
}

export var vJoinGameWall = new CBSJoinGameWall()
    .addNote(getProposal())
    .addNote(getProposal())
    .addNote(getProposal())
    .addNote(getProposal());

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
        return this.changePage(vRulesTitle, vRulesGallery, byHistory, historize);
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
        return this.changePage(vFactionsTitle, vFactionsGallery, byHistory, historize);
    }

    showFactionsGallery() {
        this._showFactionsGallery(false, ()=>
            historize("factions-gallery", "window.vPageContent._showFactionsGallery(true);")
        );
    }

    _showFactionCountersGallery(faction, byHistory, historize) {
        vFactionCountersGallery.setFaction(faction);
        return this.changePage(vFactionsTitle, vFactionCountersPageGallery, byHistory, historize);
    }

    showFactionCountersGallery(faction) {
        this._showFactionCountersGallery(faction, false, ()=>
            historize("faction-counters-gallery", "window.vPageContent._showFactionCountersGallery(event.state.faction, true);")
        );
    }

    _showMagicGallery(byHistory, historize) {
        return this.changePage(vMagicTitle, vMagicGallery, byHistory, historize);
    }

    showMagicGallery() {
        this._showMagicGallery(false, ()=>
            historize("magic-gallery", "window.vPageContent._showMagicGallery(true);")
        );
    }

    _showMagicCountersGallery(art, byHistory, historize) {
        vMagicCountersGallery.setMagicArt(art);
        return this.changePage(vMagicTitle, vMagicCountersPageGallery, byHistory, historize);
    }

    showMagicCountersGallery(art) {
        this._showMagicCountersGallery(art, false, ()=>
            historize("magic-counters-gallery", "window.vPageContent._showMagicCountersGallery(event.state.art, true);")
        );
    }

    _showMarkersGallery(byHistory, historize) {
        return this.changePage(vMarkersTitle, vMarkersGallery, byHistory, historize);
    }

    showMarkersGallery() {
        this._showMarkersGallery(false, ()=>
            historize("markers-gallery", "window.vPageContent._showMarkersGallery(true);")
        );
    }

    _showNewArticlesWall(byHistory, historize) {
        return this.changePage(vNewArticlesTitle, vNewArticlesWall, byHistory, historize);
    }

    showNewArticlesWall() {
        this._showNewArticlesWall(false, ()=>
            historize("new-articles", "window.vPageContent._showNewArticlesWall(true);")
        );
    }

    _showThemesAboutGameWall(byHistory, historize) {
        return this.changePage(vArticlesAboutGameTitle, vThemesAboutGameWall, byHistory, historize);
    }

    showThemesAboutGameWall() {
        this._showThemesAboutGameWall(false, ()=>
            historize("themes-about-game", "window.vPageContent._showThemesAboutGameWall(true);")
        );
    }

    _showThemesAboutLegendsWall(byHistory, historize) {
        return this.changePage(vArticlesAboutLegendsTitle, vThemesAboutLegendsWall, byHistory, historize);
    }

    showThemesAboutLegendsWall() {
        this._showThemesAboutLegendsWall(false, ()=>
            historize("themes-about-game", "window.vPageContent._showThemesAboutLegendsWall(true);")
        );
    }

    _showThemesAboutGameExamplesWall(byHistory, historize) {
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
        let specification = theme ? theme.specification:{
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
        let specification = article ? article.specification:{
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
        let specification = board ? board.specification: {
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
        let specification = scenario ? scenario.specification: {
            ref: "scenario1", title: "Scenario Title"
        };
        this._showProposeScenario(specification,false, ()=>
            historize("propose-scenario", `window.vPageContent._showProposeScenario(${JSON.stringify(specification)},true);`)
        );
    }

    _showYourProposals(byHistory, historize) {
        vContributeTitle.setTitle("Your Proposals");
        return this.changePage(vYourProposalsTitle, vYourProposalsWall, byHistory, historize);
    }

    showYourProposals() {
        this._showYourProposals(false, ()=>
            historize("your-proposals", "window.vPageContent._showYourProposals(true);")
        );
    }

    _showForums(byHistory, historize) {
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
        return this.changePage(vGamesTitle, vYourGamesWall, byHistory, historize);
    }

    showYourGames() {
        this._showYourGames(false, ()=>
            historize("my-games", `window.vPageContent._showYourGames(true);`)
        );
    }

    _showProposeAGame(byHistory, historize) {
        vGamesTitle.setTitle("Propose A Game");
        return this.changePage(vGamesTitle, vProposeGameWall, byHistory, historize);
    }

    showProposeAGame() {
        this._showProposeAGame(false, ()=>
            historize("propose-a-game", `window.vPageContent._showProposeAGame(true);`)
        );
    }

    _showJoinAGame(byHistory, historize) {
        vGamesTitle.setTitle("Join A Game");
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
