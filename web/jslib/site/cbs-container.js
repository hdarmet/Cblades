'use strict';

import {
    VImage, Vitamin
} from "../vitamin/vitamins.js";
import {
    Div, Img, P, Span
} from "../vitamin/components.js";
import {
    VButton
} from "../vitamin/vforms.js";

export class CBSSummary extends Vitamin(Div) {

    constructor({ref, img, width, title, description}) {
        super({ref});
        this.addClass("gallery-summary");
        this._divImage = new Div();
        this._image = new Img(img).setWidth(width).addClass("gallery-summary-image");
        this._divImage.add(this._image);
        this.add(this._divImage);
        this._content = new Div().addClass("gallery-summary-container");
        this.add(this._content);
        this._title = new P(title).addClass("gallery-summary-title");
        this._content.add(this._title);
        if (Array.isArray(description)) {
            this._descriptions = [];
            for (let description of description) {
                let line = new P(description).addClass("gallery-summary-line");
                this._descriptions.push(line);
                this._content.add(line);
            }
        }
        else {
            this._description = new P(description).addClass("gallery-summary-line");
            this._content.add(this._description);
        }
    }

}

export class CBSCard extends Vitamin(Div) {

    constructor({ref, img, image, width, title, description, button, action}) {
        super({ref});
        this.addClass("gallery-card");
        if (image) {
            this._image = image;
        }
        else {
            this._image = new VImage({ref:ref+"-image", img, kind:"gallery-card-image", width});
        }
        this.add(this._image);
        this._content = new Div().addClass("gallery-card-container");
        this.add(this._content);
        this._title = new P(title).addClass("gallery-card-title");
        this._content.add(this._title);
        if (Array.isArray(description)) {
            this._descriptions = [];
            for (let description of description) {
                let line = new P(description).addClass("gallery-card-line");
                this._descriptions.push(line);
                this._content.add(line);
            }
        }
        else {
            this._description = new P(description).addClass("gallery-card-line");
            this._content.add(this._description);
        }
        if (button) {
            this._button = new VButton({
                ref: ref + "-button",
                label: button,
                type: VButton.TYPES.ACCEPT,
                onClick: action
            });
            this._content.add(new Span().add(this._button).addClass("gallery-card-button"));
        }
    }

}

export class CBSGallery extends Vitamin(Div) {

    constructor({ref, card=CBSCard, kind="gallery-vertical"}, builder) {
        super({ref});
        this._cardClass = card;
        this.addClass("gallery-row");
        kind&&this.addClass(kind);
        this._cards = [];
        builder&&builder(this);
    }

    addCard({card, ...params}) {
        let aCard = card ? card : new this._cardClass({...params});
        aCard._envelope = new Div().addClass("gallery-column");
        aCard._envelope.add(aCard);
        this.add(aCard._envelope);
        this._cards.push(aCard);
        return this;
    }

    clearCards() {
        for (let card of this._cards) {
            this.remove(card._envelope);
        }
        this._cards = [];
    }

}
