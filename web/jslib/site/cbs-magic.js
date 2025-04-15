import {
    download,
    VMagnifiedImage, VSlot
} from "../vitamin/vitamins.js";
import {
    sendGet
} from "../board/draw.js";
import {
    VFormContainer
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBSGallery, CBSSummary
} from "./cbs-container.js";

function parseMagicArt(text) {
    return JSON.parse(text);
}

export var vMagicArtsGallery = new CBSGallery({ref:"magics", kind: "gallery-magics"});

export var vMagicArtCountersGallery = new CBSGallery({ref:"magics-counter", kind: "gallery-magic-counters"});

export var vMagicArtSummary = new VSlot({ref: "counter-page-summary-slot"});

export var vMagicArtCountersPageGallery = new VFormContainer({ref: "magic-counters-page-content"})
    .addClass("gallery-magic-counters-page")
    .add(vMagicArtSummary)
    .add(vMagicArtCountersGallery);

export function loadMagicArts(success) {
    sendGet("/api/magicart/live",
        (text, status)=>{
            vMagicArtsGallery.clearCards();
            let magicArts = JSON.parse(text);
            for (let magicArt of magicArts) {
                vMagicArtsGallery.addCard({
                    ref: "magic-"+magicArt.id,
                    img:  magicArt.illustration,
                    title: magicArt.name,
                    description: magicArt.description,
                    button: "Counters Sheets",
                    action: event=>{
                        vPageContent.showMagicArtCountersGallery(magicArt);
                    }
                });
            }
            success();
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Magic Arts: "+text);
        }
    );
}

export function loadMagicArt(magicArt, success) {
    sendGet("/api/magicart/published/"+magicArt.id,
        (text, status)=>{
            let magicArt = parseMagicArt(text);
            vMagicArtSummary.set({
                content: new CBSSummary({
                    ref: "magic-summary",
                    img: magicArt.illustration,
                    alt: magicArt.name,
                    title: magicArt.name,
                    description: magicArt.description
                })
            });
            vMagicArtCountersGallery.clearCards();
            for (let sheet of magicArt.sheets) {
                vMagicArtCountersGallery.addCard({
                    ref: "sheet-"+sheet.id,
                    image: new VMagnifiedImage({
                        ref: "sheet-"+sheet.id,
                        img: sheet.icon,
                        zoomImg: sheet.path,
                        width: "90%"
                    }),
                    title: sheet.name,
                    description: sheet.description,
                    button: "Download",
                    action: event => {
                        download(sheet.path);
                    }
                });
            }
            success(magicArt);
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Magic Art: "+text);
        }
    );
}
