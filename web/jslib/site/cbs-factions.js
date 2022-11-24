import {
    download,
    VMagnifiedImage, VSlot
} from "../vitamin/vitamins.js";
import {
    sendGet
} from "../vitamin/components.js";
import {
    VFormContainer
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBSGallery, CBSSummary
} from "./cbs-container.js";

function parseFaction(text) {
    return JSON.parse(text);
}

export var vFactionsGallery = new CBSGallery({ref:"factions", kind: "gallery-factions"});

export var vFactionCountersGallery = new CBSGallery({ref:"factions-counter", kind: "gallery-faction-counters"});

export var vFactionSummary = new VSlot({ref: "counter-page-summary-slot"});

export var vFactionCountersPageGallery = new VFormContainer({ref: "faction-counters-page-content"})
    .addClass("gallery-faction-counters-page")
    .add(vFactionSummary)
    .add(vFactionCountersGallery);

export function loadFactions(success) {
    sendGet("/api/faction/live",
        (text, status)=>{
            vFactionsGallery.clearCards();
            let factions = JSON.parse(text);
            for (let faction of factions) {
                vFactionsGallery.addCard({
                    ref: "faction-"+faction.id,
                    img:  faction.illustration,
                    title: faction.name,
                    description: faction.description,
                    button: "Counters Sheets",
                    action: event=>{
                        vPageContent.showFactionCountersGallery(faction);
                    }
                });
            }
            success();
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Factions: "+text);
        }
    );
}

export function loadFaction(faction, success) {
    sendGet("/api/faction/published/"+faction.id,
        (text, status)=>{
            let faction = parseFaction(text);
            vFactionSummary.set({
                content: new CBSSummary({
                    ref: "faction-summary",
                    img: faction.illustration,
                    alt: faction.name,
                    title: faction.name,
                    description: faction.description
                })
            });
            vFactionCountersGallery.clearCards();
            for (let sheet of faction.sheets) {
                vFactionCountersGallery.addCard({
                    ref: "sheet-"+sheet.id,
                    image: new VMagnifiedImage({
                        ref: "sheet-"+sheet.id,
                        img: sheet.icon,
                        zoomImg: sheet.path,
                        width: "90%"
                    }),
                    title: sheet.name,
                    button: "Download",
                    action: event => {
                        download(sheet.path);
                    }
                });
            }
            success(faction);
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Faction: "+text);
        }
    );
}
