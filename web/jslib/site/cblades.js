import {
    VContainer,
    VHeader,
    VFooter,
    VText,
    VMainMenu,
    VMagnifiedImage,
    VSlot,
    VMessageHandler
} from "./vitamins.js";
import {
    VFileLoader, VFormContainer
} from "./vforms.js";
import {
    CVLegalNotice,
    CVContact,
    CVPartnerships,
    CVSocialRow,
    VCLogin
} from "./cvitamin.js";
import {
    Div
} from "./components.js";
import {
    VGallery,
    VSummary,
    VArticle,
    VNewspaper,
    VTheme,
    VScenario,
    VMap,
    VWallWithSearch,
    VThemeEditor,
    VArticleEditor,
    VMapEditor,
    VScenarioEditor,
} from "./vbooks.js";

var text = `
<h1>The Main Title</h1>
<p>Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit</p>
<h2>The Second Title</h2>
<p>Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit</p>
<h2>The Third Title</h2>
<p>
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
</p>`;

export var connection = null;

export var vMenu = new VMainMenu({ref:"menu"})
    .addDropdownMenu({ref:"material-menu", label:"Pour jouer"}, $=>{$
        .addMenu({ref:"dwnld-rules-menu", label:"Les règles et les aides de jeu", action:()=>{
                vPageContent.showRulesGallery();
            }
        })
        .addMenu({ref:"dwnld-map-menu", label:"Les cartes", action:()=>{
                vPageContent.showMapsGallery();
            }
        })
        .addMenu({ref:"dwnld-armies-menu", label:"Les factions", action:()=>{
                vPageContent.showFactionsGallery();
            }
        })
        .addMenu({ref:"dwnld-magic-menu", label:"La magie", action:()=>{
                vPageContent.showMagicGallery();
            }
        })
        .addMenu({ref:"dwnld-markers-menu", label:"Les marqueurs", action:()=>{
                vPageContent.showMarkersGallery();
            }
        })
    })
    .addDropdownMenu({ref:"articles-menu", label:"Pour approfondir"}, $=>{$
        .addMenu({ref:"new-articles-menu", label:"Nouveaux articles", action:()=>{
                vPageContent.showNewArticlesWall();
            }
        })
        .addMenu({ref:"about-game-menu", label:"Sur le Jeu", action:()=>{
                vPageContent.showThemesAboutGameWall();
            }
        })
        .addMenu({ref:"lore-articles-menu", label:"Histoires et légendes", action:()=>{
                vPageContent.showThemesAboutGameWall();
            }
        })
        .addMenu({ref:"rule-articles-menu", label:"Exemples de jeu", action:()=>{
                vPageContent.showThemesAboutGameWall();
            }
        })
    })
    .addDropdownMenu({ref:"contribution-menu", label:"Pour contribuer"}, $=>{$
        .addMenu({ref:"propose-theme-menu", label:"Proposer un thème", action:()=>{
                vPageContent.showProposeTheme(null);
            }
        })
        .addMenu({ref:"propose-article-menu", label:"Proposer un article", action:()=>{
                vPageContent.showProposeArticle();
            }
        })
        .addMenu({ref:"propose-map-menu", label:"Proposer une carte", action:()=>{
                vPageContent.showProposeMap();
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
    .addMenu({ref:"login", kind:"right-menu", label:connection?"Logout":"Login", action:()=>{
        if (connection) {
            connection = null;
            vMenu.get("login").label = "Login";
        }
        else {
            connection = {
                login: vLogin.connection
            }
            vLogin.show();
        }
    }})
    .addDropdownMenu({ref:"play-menu", kind:"right-menu", label:"Jouer en ligne"}, $=>{$
        .addMenu({ref:"forum-menu", label:"Forum", action:()=>{
                vPageContent.showProposeTheme(null);
            }
        })
        .addMenu({ref:"propose-article-menu", label:"Proposer un article", action:()=>{
                vPageContent.showProposeArticle();
            }
        })
    });

/*
    .addDropdownMenu({ref:"admin", title:"Admin", enabled:false}, $=>{$
        .addMenu({ref:"map", title:"Map", action:()=> {
                vmenu.get("file").removeMenu("save");
                vmenu.insertMenu({
                    ref:"avant-propos", title:"Avant Propos...", action:()=>{
                        console.log("Avant propos");
                        vregistration.show();
                    }
                }, "a-propos")
            }
        })
        .addMenu({ref:"units", title:"Units", action:()=> {
                vmenu.get("file").addMenu({ref:"save", title:"Save", enabled:false, action:()=>{
                        vmenu.get("load").enabled = true;
                        vmenu.get("save").enabled = false;
                        vmenu.get("admin").enabled = false;
                    }
                });
            }
        })
    })
    .addMenu({ref:"a-propos", title:"A Propos...", action:()=>{
            vmodal.show();
        }});
*/

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
        .addField({field: new CVContact({
            address: "Cursed Blades<br>22 Sword Street<br>92120 Lance",
            phone: "(+33)6 8744 0442",
            email: "cursed-blades@gmail.com",
            writeToUs: "Write to us"
        })})
        // CVLegalNotice
        .addField({field: new CVLegalNotice({
            legalNotice: {
                label: "Legal Notice",
                title: "Legal Notice",
                content: text
            },
            privateLifePolicy: {
                label: "Private Life Policy",
                title: "Private Life Policy",
                content: text
            },
            cookiesManagement: {
                label: "Cookies Management",
                title: "Cookies Management",
                content: text
            },
            usagePolicy: {
                label: "Usage Policy",
                title: "Usage Policy",
                content: text
            },
            contributions: {
                label: "Your Contributions",
                title: "Do you want to contribute ?",
                content: text
            }
        })})
        .addField({field: new VFormContainer({ref:"footer-content", columns:1}, $=>{$
            .addField({field:new CVPartnerships({
                patreon: {
                    label: "Our Patreon Page",
                    url: "www.google.fr"
                },
                youtube: {
                    label: "Our Youtube Channel",
                    url: "www.youtube.com"
                }
            })})
            .addField({field: new CVSocialRow({
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

export var vLogin = new  VCLogin({
    connect: ()=>{
        vMenu.get("login").label = "logout";
        return true;
    }
});

export function download(url) {
    const a = document.createElement('a')
    a.href = url
    a.download = url.split('/').pop()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

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

export var vRulesGallery = new VGallery({ref:"rules", kind: "gallery-rules"});

vRulesGallery.show = function() {
    this.clearCards();
    for (let rule in rules) {
        this.addCard(declareRule(rules[rule].ref, rules[rule].name, rules[rule].description, rules[rule].file));
    }
    return this;
}

var maps = {
    "map-1": {ref:"map-1", name: "map1", description: "Landscape crossed by a path" },
    "map-2": {ref:"map-2", name: "map2", description: "Landscape crossed by a path" },
    "map-3": {ref:"map-3", name: "map3", description: "Landscape crossed by a path" },
    "map-4": {ref:"map-4", name: "map4", description: "Landscape crossed by a path" },
    "map-5": {ref:"map-5", name: "map5", description: "Landscape crossed by a path" },
    "map-6": {ref:"map-6", name: "map6", description: "Landscape crossed by a path" },
    "map-7": {ref:"map-7", name: "map7", description: "Landscape crossed by a path" },
    "map-8": {ref:"map-8", name: "map8", description: "Landscape crossed by a path" },
    "map-9": {ref:"map-9", name: "map9", description: "Landscape crossed by a path" },
    "map-10": {ref:"map-10", name: "map10", description: "Landscape crossed by a path" },
    "map-11": {ref:"map-11", name: "map11", description: "Landscape crossed by a path" },
    "map-12": {ref:"map-12", name: "map12", description: "Landscape crossed by a path" },
    "map-13": {ref:"map-13", name: "map13", description: "Landscape crossed by a path" },
    "map-14": {ref:"map-14", name: "map14", description: "Landscape crossed by a path" },
    "map-15": {ref:"map-15", name: "map15", description: "Landscape crossed by a path" },
    "map-16": {ref:"map-16", name: "map16", description: "Landscape crossed by a path" },
    "map-17": {ref:"map-17", name: "map17", description: "Landscape crossed by a path" },
    "map-18": {ref:"map-18", name: "map18", description: "Landscape crossed by a path" },
    "map-19": {ref:"map-19", name: "map19", description: "Landscape crossed by a path" },
    "map-20": {ref:"map-20", name: "map20", description: "Landscape crossed by a path" },
    "map-21": {ref:"map-21", name: "map21", description: "Landscape crossed by a path" }
}

export function declareMap(mapRef, mapName, mapDescription) {
    return {
        ref:mapRef,
        image: new VMagnifiedImage({
            ref:`img-${mapRef}`,
            img:`../images/maps/${mapRef}-icon.png`,
            zoomImg:`../images/maps/${mapRef}.png`,
            width:"90%"
        }),
        title:mapName, description:mapDescription,
        button:"Download", action:event=>{
            download(`../images/maps/${mapRef}.png`);
        }
    };
}

export var vMapsTitle = new VHeader({
    ref:"maps-title",
    left:"../images/site/left-maps.png", right:"../images/site/right-maps.png",
    title: "Maps"
}).addClass("maps-title");

export var vMapsGallery = new VGallery({ref:"maps", kind: "gallery-maps"});

vMapsGallery.show = function() {
    this.clearCards();
    for (let map in maps) {
        this.addCard(declareMap(maps[map].ref, maps[map].name, maps[map].description));
    }
    return this;
}

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

export var vMagicGallery = new VGallery({ref:"magic", kind: "gallery-magic"});

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

export var vMagicCountersGallery = new VGallery({ref:"magic-counters", kind: "gallery-magic-counters"});

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
        content: new VSummary({
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

export var vFactionsGallery = new VGallery({ref:"factions", kind: "gallery-factions"});

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

export var vFactionCountersGallery = new VGallery({ref:"factions-counter", kind: "gallery-faction-counters"});

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
        content: new VSummary({
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

export var vMarkersGallery = new VGallery({ref:"markers", kind: "gallery-markers"});

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

export var vNewArticlesTitle = new VHeader({
    ref:"new-articles-title",
    left:"../images/site/left-new-articles.png", right:"../images/site/right-new-articles.png",
    title: "New Articles"
}).addClass("new-articles-title");

export var vNewArticlesWall = new VWallWithSearch({
    ref:"new-articles",
    kind: "new-articles",
    searchAction: text=>alert("search:"+text)
}, $=>{$
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par1", imgPos:"left", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:[paragrpahText, paragrpahText]},
            {ref: "art1-par2", imgPos:"right", img:`../images/site/factions/orcs.png`, title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", imgPos:"left", img:`../images/site/factions/elves.png`, title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", imgPos:"right", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:paragrpahText+paragrpahText},
            {ref: "art1-par2", imgPos:"left", img:`../images/site/factions/orcs.png`, title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", imgPos:"left", img:`../images/site/factions/elves.png`, title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", imgPos:"right", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par2", imgPos:"left", img:`../images/site/factions/orcs.png`, title:"Et ça continue...", description:paragrpahText},
            {ref: "art1-par3", imgPos:"right", img:`../images/site/factions/elves.png`, title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
});

vNewArticlesWall.setLoadNotes(function() {
    this.addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", imgPos:"left", img:`../images/site/factions/elves.png`, title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", imgPos:"right", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:paragrpahText+paragrpahText},
            {ref: "art1-par2", imgPos:"left", img:`../images/site/factions/orcs.png`, title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", imgPos:"left", img:`../images/site/factions/elves.png`, title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", imgPos:"right", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par2", imgPos:"left", img:`../images/site/factions/orcs.png`, title:"Et ça continue...", description:paragrpahText},
            {ref: "art1-par3", imgPos:"right", img:`../images/site/factions/elves.png`, title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }));
});

export var vArticlesAboutGameTitle = new VHeader({
    ref:"articles-about-game-title",
    left:"../images/site/left-articles-about-game.png", right:"../images/site/right-articles-about-game.png",
    title: "About the game"
}).addClass("articles-about-game-title");

export var vThemesAboutGameWall = new VWallWithSearch({
    ref:"themes-about-game",
    kind: "themes-about-game",
    searchAction: text=>alert("search:"+text)
}, $=>{$
    .addNote(new VTheme({
        ref: "theme1", title: "Rules", img: `../images/site/themes/rules.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme2", title: "Strategies And Tactics", img: `../images/site/themes/strategy.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme3", title: "Units", img: `../images/site/themes/units.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme4", title: "Magic", img: `../images/site/themes/magic.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme5", title: "Scenario", img: `../images/site/themes/scenario.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme6", title: "Campains", img: `../images/site/themes/campains.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme7", title: "History", img: `../images/site/themes/history.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
    .addNote(new VTheme({
        ref: "theme8", title: "Siege", img: `../images/site/themes/siege.png`,
        description: paragrpahText,
        action:theme=>{
            vPageContent.showArticlesAboutGameWall();
        }
    }))
});

export var vArticlesAboutGameWall = new VWallWithSearch({
    ref:"articles-about-game",
    kind: "articles-about-game",
    searchAction: text=>alert("search:"+text)
}, $=>{$
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:[paragrpahText, paragrpahText]},
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", img:`../images/site/factions/elves.png`, imgPos:"left", title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, title:"Ca commence...", description:paragrpahText+paragrpahText},
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"right", title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", img:`../images/site/factions/elves.png`, imgPos:"left", title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, imgPos:"right", title:"Ca commence...", description:paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"left", title:"Et ça continue...", description:paragrpahText},
            {ref: "art1-par3", img:`../images/site/factions/elves.png`, imgPos:"right", title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
});

vArticlesAboutGameWall.setLoadNotes(function() {
    this.addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", img:`../images/site/factions/elves.png`, imgPos:"left", title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, imgPos:"right", title:"Ca commence...", description:paragrpahText+paragrpahText},
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"left", title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par3", img:`../images/site/factions/elves.png`, imgPos:"left", title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, imgPos:"right", title:"Ca commence...", description:paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }))
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", votes:{ref:"art1-vote", likes:3, dislikes:1}, paragraphs: [
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"left", title:"Et ça continue...", description:paragrpahText},
            {ref: "art1-par3", img:`../images/site/factions/elves.png`, imgPos:"right", title:"Et ça continue encore...", description:paragrpahText+paragrpahText+paragrpahText},
        ],
        action:article=>{
            vPageContent.showNewspaper(article);
        }
    }));
});

export var vNewspaperTitle = new VHeader({
    ref:"newspaper-title",
    left:"../images/site/left-legends.png", right:"../images/site/right-legends.png"
}).addClass("newspaper-title");

export var vNewspaperContent = new VNewspaper({
    ref:"newspaper-content"
});

export var vContributeTitle = new VHeader({
    ref:"contribute-title",
    left:"../images/site/left-contribute.png", right:"../images/site/right-contribute.png"
}).addClass("contribute-title");

export var vThemeEditor = new VThemeEditor({
    ref:"theme-editor",
    accept(file) {
        if (!VFileLoader.isImage(file)) {
            VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (450 x 150) pixels."});
            return false;
        }
        return true;
    },
    verify(image) {
        if (image.imageWidth!==450 || image.imageHeight!==150) {
            VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (450 x 150) pixels."});
            return false;
        }
        return true;
    }
});

export var vThemeEditorDescription = new Div().setText(paragrpahText).addClass("description");
export var vThemeEditorPage = new VFormContainer({ref:"theme-editor-page"})
    .addClass("theme-editor-page")
    .add(vThemeEditorDescription)
    .add(vThemeEditor);
vThemeEditorPage.canLeave = function(leave) {
    return vThemeEditor.canLeave(leave);
}
vThemeEditorPage.setTheme = function(theme) {
    vThemeEditor.theme = theme;
    return this;
}

export var vArticleEditor = new VArticleEditor({
    ref:"article-editor",
    accept(file) {
        if (!VFileLoader.isImage(file)) {
            VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (600 x 350) pixels."});
            return false;
        }
        return true;
    },
    verify(image) {
        if (image.imageWidth!==600 || image.imageHeight!==350) {
            VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (650 x 350) pixels."});
            return false;
        }
        return true;
    }
});

export var vArticleEditorDescription = new Div().setText(paragrpahText).addClass("description");
export var vArticleEditorPage = new VFormContainer({ref:"theme-editor-page"})
    .addClass("theme-editor-page")
    .add(vArticleEditorDescription)
    .add(vArticleEditor);
vArticleEditorPage.canLeave = function(leave) {
    return vArticleEditor.canLeave(leave);
}
vArticleEditorPage.setArticle = function(article) {
    vArticleEditor.article = article;
    return this;
}

export var vMapEditor = new VMapEditor({
    ref:"map-editor",
    accept(file) {
        if (!VFileLoader.isImage(file)) {
            VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
            return false;
        }
        return true;
    },
    verify(image) {
        if (image.imageWidth!==2046 || image.imageHeight!==3150) {
            VMessageHandler.emit({title: "Error", message:"The image must be a PNG or JPEG file of size (2046 x 3150) pixels."});
            return false;
        }
        return true;
    },
    onEdit() {
        vMapEditor.openInNewTab("./cb-map-editor.html");
    }
});

export var vMapEditorDescription = new Div().setText(paragrpahText).addClass("description");
export var vMapEditorPage = new VFormContainer({ref:"map-editor-page"})
    .addClass("map-editor-page")
    .add(vMapEditorDescription)
    .add(vMapEditor);
vMapEditorPage.canLeave = function(leave) {
    return vMapEditor.canLeave(leave);
}
vMapEditorPage.setMap = function(map) {
    vMapEditor.map = map;
    return this;
}

export var vScenarioEditor = new VScenarioEditor({
    ref:"scenario-editor",
    onEdit() {
        vScenarioEditor.openInNewTab("./cba-scenario-editor.html");
    }
});

export var vScenarioEditorDescription = new Div().setText(paragrpahText).addClass("description");
export var vScenarioEditorPage = new VFormContainer({ref:"scenario-editor-page"})
    .addClass("scenario-editor-page")
    .add(vScenarioEditorDescription)
    .add(vScenarioEditor);
vScenarioEditorPage.canLeave = function(leave) {
    return vScenarioEditor.canLeave(leave);
}
vScenarioEditorPage.setScenario = function(scenario) {
    vScenarioEditor.scenario = scenario;
    return this;
}

export var vYourProposalsTitle = new VHeader({
    ref:"your-proposals-title",
    left:"../images/site/left-contribute.png", right:"../images/site/right-contribute.png",
    title: "Your Proposals"
}).addClass("contribute-title");

export var vYourProposalsWall = new VWallWithSearch({
    ref:"your-proposals",
    kind: "your-proposals",
    searchAction: text=>alert("search:"+text)
}, $=>{$
    .addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", paragraphs: [
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, imgPos:"left", title:"Ca commence...", description:[paragrpahText, paragrpahText]},
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"right", title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showProposeArticle(article);
        }
    }))
    .addNote(new VScenario({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        action:scenario=>{
            vPageContent.showProposeScenario(scenario);
        }
    }))
    .addNote(new VTheme({
        ref: "theme1", title: "Rules", img: `../images/site/themes/rules.png`,
        description: paragrpahText,
        action: theme => {
            vPageContent.showProposeTheme(theme);
        }
    }))
    .addNote(new VMap({
        ref: "map1", title: "The Map", img: `../images/maps/map-7.png`,
        description: paragrpahText,
        action: map => {
            vPageContent.showProposeMap(map);
        }
    }))
});

vYourProposalsWall.setLoadNotes(function() {
    this.addNote(new VArticle({
        ref: "art1", title: "An Interesting Story", paragraphs: [
            {ref: "art1-par1", img:`../images/site/factions/roughneck.png`, imgPos:"right", title:"Ca commence...", description:[paragrpahText, paragrpahText]},
            {ref: "art1-par2", img:`../images/site/factions/orcs.png`, imgPos:"left", title:"Et ça continue...", description:paragrpahText}
        ],
        action:article=>{
            vPageContent.showProposeArticle(article);
        }
    }))
    .addNote(new VScenario({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        action:scenario=>{
            vPageContent.showProposeScenario(scenario);
        }
    }))
    .addNote(new VTheme({
        ref: "theme1", title: "Rules", img: `../images/site/themes/rules.png`,
        description: paragrpahText,
        action: theme => {
            vPageContent.showProposeTheme(theme);
        }
    }))
});

class VPageContent extends VContainer {

    constructor() {
        super({ref: "page-content"});
    }

    _changeTitle(title) {
        if (this._title) this.remove(this._title);
        this._title = title;
        if (this._title) this.add(this._title);
    }

    _changeContent(gallery) {
        if (this._page) this.remove(this._page);
        this._page = gallery;
        if (this._page) {
            this._page.show && this._page.show();
            this.add(this._page);
        }
    }

    _changePage(title, content, byHistory, historize) {
        if (!this._page || !this._page.canLeave || this._page.canLeave(()=>{
            if (byHistory) {
                history._preventDefault = true;
                history.back();
            }
            else {
                historize();
            }
            this._changeTitle(title);
            this._changeContent(content);
        })) {
            if (!byHistory) {
                historize();
            }
            this._changeTitle(title);
            this._changeContent(content);
            return true;
        }
        return false
    }

    _showRulesGallery(byHistory, historize) {
        return this._changePage(vRulesTitle, vRulesGallery, byHistory, historize);
    }

    showRulesGallery() {
        this._showRulesGallery(false, ()=>
            historize("rules-gallery", "vPageContent._showRulesGallery(true);")
        );
    }

    _showMapsGallery(byHistory, historize) {
        return this._changePage(vMapsTitle, vMapsGallery, byHistory, historize);
    }

    showMapsGallery() {
        this._showMapsGallery(false, ()=>
            historize("maps-gallery", "vPageContent._showMapsGallery(true);")
        );
    }

    _showFactionsGallery(byHistory, historize) {
        return this._changePage(vFactionsTitle, vFactionsGallery, byHistory, historize);
    }

    showFactionsGallery() {
        this._showFactionsGallery(false, ()=>
            historize("factions-gallery", "vPageContent._showFactionsGallery(true);")
        );
    }

    _showFactionCountersGallery(faction, byHistory, historize) {
        vFactionCountersGallery.setFaction(faction);
        return this._changePage(vFactionsTitle, vFactionCountersPageGallery, byHistory, historize);
    }

    showFactionCountersGallery(faction) {
        this._showFactionCountersGallery(faction, false, ()=>
            historize("faction-counters-gallery", "vPageContent._showFactionCountersGallery(event.state.faction, true);")
        );
    }

    _showMagicGallery(byHistory, historize) {
        return this._changePage(vMagicTitle, vMagicGallery, byHistory, historize);
    }

    showMagicGallery() {
        this._showMagicGallery(false, ()=>
            historize("magic-gallery", "vPageContent._showMagicGallery(true);")
        );
    }

    _showMagicCountersGallery(art, byHistory, historize) {
        vMagicCountersGallery.setMagicArt(art);
        return this._changePage(vMagicTitle, vMagicCountersPageGallery, byHistory, historize);
    }

    showMagicCountersGallery(art) {
        this._showMagicCountersGallery(art, false, ()=>
            historize("magic-counters-gallery", "vPageContent._showMagicCountersGallery(event.state.art, true);")
        );
    }

    _showMarkersGallery(byHistory, historize) {
        return this._changePage(vMarkersTitle, vMarkersGallery, byHistory, historize);
    }

    showMarkersGallery() {
        this._showMarkersGallery(false, ()=>
            historize("markers-gallery", "vPageContent._showMarkersGallery(true);")
        );
    }

    _showNewArticlesWall(byHistory, historize) {
        return this._changePage(vNewArticlesTitle, vNewArticlesWall, byHistory, historize);
    }

    showNewArticlesWall() {
        this._showNewArticlesWall(false, ()=>
            historize("new-articles", "vPageContent._showNewArticlesWall(true);")
        );
    }

    _showThemesAboutGameWall(byHistory, historize) {
        return this._changePage(vArticlesAboutGameTitle, vThemesAboutGameWall, byHistory, historize);
    }

    showThemesAboutGameWall() {
        this._showThemesAboutGameWall(false, ()=>
            historize("themes-about-game", "vPageContent._showThemesAboutGameWall(true);")
        );
    }

    _showArticlesAboutGameWall(byHistory, historize) {
        return this._changePage(vArticlesAboutGameTitle, vArticlesAboutGameWall, byHistory, historize);
    }

    showArticlesAboutGameWall() {
        this._showArticlesAboutGameWall(false, ()=>
            historize("articles-about-game", "vPageContent._showArticlesAboutGameWall(true);")
        );
    }

    _showNewspaper(article, byHistory, historize) {
        vNewspaperTitle.setTitle(article.title);
        vNewspaperContent.setArticle({
            title: article.title,
            paragraphs: article.paragraphs,
            votes: {
                ...article.votes,
                actionLikes: likes => {
                    likes.setText("" + (parseInt(likes.getText()) + 1));
                },
                actionDislikes: dislikes => {
                    dislikes.setText("" + (parseInt(dislikes.getText()) + 1));
                }
            }
        });
        return this._changePage(vNewspaperTitle, vNewspaperContent, byHistory, historize);
    }

    showNewspaper(article) {
        let specification = article.specification;
        this._showNewspaper(specification, false, ()=>
            historize("newspaper", `vPageContent._showNewspaper(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeTheme(themeSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose A Theme");
        vThemeEditorPage.setTheme(themeSpec);
        return this._changePage(vContributeTitle, vThemeEditorPage, byHistory, historize);
    }

    showProposeTheme(theme = null) {
        let specification = theme ? theme.specification:{
            ref: "theme1", title: "Bla bla bla", img: `../images/site/themes/rules.png`,
            description: "bla bla bla"
        };
        this._showProposeTheme(specification,false, ()=>
            historize("propose-theme", `vPageContent._showProposeTheme(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeArticle(articleSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose An Article");
        vArticleEditorPage.setArticle(articleSpec);
        return this._changePage(vContributeTitle, vArticleEditorPage, byHistory, historize);
    }

    showProposeArticle(article = null) {
        let specification = article ? article.specification: {
            ref: "article", title: "Bla bla bla",
            paragraphs: [
                {
                    ref: "paragraph1", title: "Bla bla bla",
                    imgPos: "left", img: `../images/site/factions/orcs.png`,
                    description: "bla bla bla"
                }, {
                    ref: "paragraph2", title: "Bla bla bla",
                    imgPos: "right", img: `../images/site/factions/roughneck.png`,
                    description: "bla bla bla"
                }
            ]
        };
        this._showProposeArticle(specification,false, ()=>
            historize("propose-article", `vPageContent._showProposeArticle(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeMap(mapSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose A Map");
        vMapEditorPage.setMap(mapSpec);
        return this._changePage(vContributeTitle, vMapEditorPage, byHistory, historize);
    }

    showProposeMap(map = null) {
        let specification = map ? map.specification: {
            ref: "map",
            title: "bla bla",
            description: "bla bla"
        };
        this._showProposeMap(specification, false, ()=>
            historize("propose-map", `vPageContent._showProposeMap(${JSON.stringify(specification)}, true);`)
        );
    }

    _showProposeScenario(scenarioSpec, byHistory, historize) {
        vContributeTitle.setTitle("Propose A Scenario");
        vScenarioEditorPage.setScenario(scenarioSpec);
        return this._changePage(vContributeTitle, vScenarioEditorPage, byHistory, historize);
    }

    showProposeScenario(scenario = null) {
        let specification = scenario ? scenario.specification: {
            ref: "scen1", title: "Bla bla bla",
            img: `../images/scenarii/scenario1.png`,
            story: "bla bla bla",
            victory: "bla bla bla",
            specialRules: "bla bla bla"
        };
        this._showProposeScenario(specification,false, ()=>
            historize("propose-scenario", `vPageContent._showProposeScenario(${JSON.stringify(specification)},true);`)
        );
    }

    _showYourProposals(byHistory, historize) {
        vContributeTitle.setTitle("Your Proposals");
        return this._changePage(vYourProposalsTitle, vYourProposalsWall, byHistory, historize);
    }

    showYourProposals() {
        this._showYourProposals(false, ()=>
            historize("your-proposals", "vPageContent._showYourProposals(true);")
        );
    }
}

export var vPageContent = new VPageContent();

Function.prototype.clone = function() {
    return this;
}


export function historize(title, revert) {
    history.pushState({
        title, revert
    }, title);
}

window.onpopstate = function (event) {
    if (history._preventDefault) {
        delete history._preventDefault;
    }
    else {
        if (event.state) {
            console.log("PS:", event.state);
            if (event.state.revert) {
                if (!eval(event.state.revert)) {
                    history._preventDefault = true;
                    console.log("forward !");
                    history.forward();
                }
            }
        }
    }
    return true;
}

let inheritMap = new Map();
Array.from(document.styleSheets).forEach(function (styleSheet) {
    try {
        Array.from(styleSheet.cssRules).forEach(function (cssRule) {
            if (cssRule.selectorText.trim().match(/\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*/)) {
                inheritMap.set(cssRule.selectorText.trim().substring(1), cssRule);
            }
        });
    } catch (exception) {}
});
Array.from(document.styleSheets).forEach(function (styleSheet) {
    function cssExtend(cssRule) {
        //console.log(cssRule.cssText);
        if (cssRule.style) {
            let extensions = cssRule.style.getPropertyValue("--extends");
            if (extensions) {
                extensions = extensions.trim().split(",");
                cssRule.style.removeProperty("--extends");
                for (let extension of extensions) {
                    if (extension) {
                        extension = extension.trim();
                        let inherited = inheritMap.get(extension);
                        if (inherited) {
                            cssExtend(inherited);
                            for (let property of inherited.style) {
                                if (cssRule.style.getPropertyValue(property)==="") {
                                    cssRule.style.setProperty(property, inherited.style.getPropertyValue(property));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    try {
        Array.from(styleSheet.cssRules).forEach(function (cssRule) {
            //console.log(cssRule.selectorText);
            cssExtend(cssRule);
        });
    } catch (exception) {console.log(exception)}
});

