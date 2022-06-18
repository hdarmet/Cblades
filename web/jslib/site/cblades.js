import {
    VGallery, VContainer, VHeader, VFooter, VText, VMainMenu, VMagnifiedImage, VSummary, VSlot
} from "./vitamins.js";
import {
    CVLegalNotice, CVContact, CVPartnerships, CVSocialRow
} from "./cvitamin.js";

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

export var vMenu = new VMainMenu({ref:"menu"})
    .addDropdownMenu({ref:"material-menu", title:"Pour jouer"}, $=>{$
        .addMenu({ref:"dwnld-rules-menu", title:"Télécharger les règles et les aides de jeu", action:()=>{

            }
        })
        .addMenu({ref:"dwnld-map-menu", title:"Télécharger les cartes", action:()=>{
                vPageContent.showMapsGallery();
            }
        })
        .addMenu({ref:"dwnld-armies-menu", title:"Télécharger les factions", action:()=>{
                vPageContent.showFactionsGallery();
            }
        })
        .addMenu({ref:"dwnld-markers-menu", title:"Télécharger les marqueurs", action:()=>{

            }
        })
    })
    .addDropdownMenu({ref:"articles-menu", title:"Pour approfondir"}, $=>{$
        .addMenu({ref:"new-articles-menu", title:"Nouveaux articles", action:()=>{

            }
        })
        .addMenu({ref:"lore-articles-menu", title:"Histoires et légendes", action:()=>{

            }
        })
        .addMenu({ref:"rule-articles-menu", title:"Exemples de jeu", action:()=>{
                vPageContent.showMapsGallery();
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
    summary: new VContainer({ref:"footer-summary", separated:true, columns:3}, $=>{$
        .addField({field: new VText({ref:"footer-summary-contact", text:"Contact"}).addStyle("margin", "5px")})
        .addField({field: new VText({ref:"footer-summary-legal", text:"Legal"}).addStyle("margin", "5px")})
        .addField({field: new VText({ref:"footer-summary-partnership", text:"Partnership"}).addStyle("margin", "5px")})
    }),
    content: new VContainer({ref:"footer-content", separated:true, columns:3}, $=>{$
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
        .addField({field: new VContainer({ref:"footer-content", columns:1}, $=>{$
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

export function download(url) {
    const a = document.createElement('a')
    a.href = url
    a.download = url.split('/').pop()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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


export function declareCounter(factionRef, counterRef, counterName) {
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

export var vCountersGallery = new VGallery({ref:"counter", kind: "gallery-counter"});

vCountersGallery.setFaction = function(faction) {
    this._faction = faction;
}

vCountersGallery.show = function() {
    vCountersGallery.clearCards();
    for (let counterIndex=1; counterIndex<=this._faction.counterSheets; counterIndex++) {
        vCountersGallery.addCard(declareCounter(
            this._faction.ref,
            `counters${counterIndex}`,
            `Counter Sheet # ${counterIndex} Front`
        ))
        .addCard(declareCounter(
            this._faction.ref,
            `counters${counterIndex}b`,
            `Counter Sheet # ${counterIndex} Back`
        ))
    }
    return this;
}

export var vFactionSummary = new VSlot({ref: "counter-page-summary-slot"});

export var vCounterPageGallery = new VContainer({ref: "counter-page-content"})
    .addClass("gallery-counter-page")
    .add(vFactionSummary)
    .add(vCountersGallery);

vCounterPageGallery.show = function() {
    vFactionSummary.set({
        content: new VSummary({
            ref: "faction-summary",
            img: `../images/site/factions/${vCountersGallery._faction.ref}.png`,
            alt: vCountersGallery._faction.name,
            title: vCountersGallery._faction.name,
            description: vCountersGallery._faction.description
        })
    });
    vCountersGallery.show();
}

export var vFactionsTitle = new VHeader({
    ref:"maps-title",
    left:"../images/site/left-factions.png", right:"../images/site/right-factions.png",
    title: "Factions"
}).addClass("factions-title");

export function declareFaction(factionRef, factionName, factionDescription) {
    return {
        ref:"army-"+factionName,
        img:`../images/site/factions/${factionRef}.png`,
        title:factionName, description:factionDescription,
        button:"Counters Sheets", action:event=>{
            vPageContent.showCountersGallery(factions[factionRef]);
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

class VPageContent extends VContainer {

    constructor() {
        super({ref: "page-content"});
    }

    _changeTitle(title) {
        if (this._title) this.remove(this._title);
        this._title = title;
        if (this._title) this.add(this._title);
    }

    _changeGallery(gallery) {
        if (this._page) this.remove(this._page);
        this._page = gallery;
        if (this._page) {
            this._page.show && this._page.show();
            this.add(this._page);
        }
    }

    _showMapsGallery() {
        this._changeTitle(vMapsTitle);
        this._changeGallery(vMapsGallery);
    }

    showMapsGallery() {
        history.pushState({
            revert: "vPageContent._showMapsGallery();"
        }, "maps-gallery");
        this._showMapsGallery();
    }

    _showFactionsGallery() {
        this._changeTitle(vFactionsTitle);
        this._changeGallery(vFactionsGallery);
    }

    showFactionsGallery() {
        history.pushState({
            revert: "vPageContent._showFactionsGallery();"
        }, "factions-gallery");
        this._showFactionsGallery();
    }

    _showCountersGallery(faction) {
        this._changeTitle(null);
        vCountersGallery.setFaction(faction);
        this._changeGallery(vCounterPageGallery);
    }

    showCountersGallery(faction) {
        history.pushState({
            revert: "vPageContent._showCountersGallery(event.state.faction);",
            faction
        }, "counters-gallery");
        this._showCountersGallery(faction);
    }
}

export var vPageContent = new VPageContent();

Function.prototype.clone = function() {
    return this;
}

window.onpopstate = function (event) {
    console.log(event);
    event.state && event.state.revert && eval(event.state.revert);
}
