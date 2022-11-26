import {
    download, VMagnifiedImage
} from "../vitamin/vitamins.js";
import {
    sendGet
} from "../vitamin/components.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBSGallery
} from "./cbs-container.js";

function parseRuleSet(text) {
    return JSON.parse(text);
}

export var vRulesGallery = new CBSGallery({ref:"rules", kind: "gallery-rules"});

export var vMarkersGallery = new CBSGallery({ref:"markers", kind: "gallery-markers"});

export function loadRuleSet(category, gallery, success) {
    sendGet("/api/ruleset/published/"+category,
        (text, status)=>{
            gallery.clearCards();
            let ruleSet = parseRuleSet(text);
            for (let sheet of ruleSet.sheets) {
                gallery.addCard({
                    ref:category+"-"+sheet.id,
                    image: new VMagnifiedImage({
                        ref: "sheet-"+sheet.id,
                        img: sheet.icon,
                        zoomImg: sheet.path,
                        width: "90%"
                    }),
                    title: sheet.name,
                    description:sheet.description,
                    button:"Download", action:event=>{
                        download(sheet.path);
                    }
                });
            }
            success();
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Ruleset: "+text);
        }
    );
}
