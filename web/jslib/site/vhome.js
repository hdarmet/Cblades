'use strict'

import {
    VContainer, VSlideShow, VWall
} from "./vcontainer.js";
import {
    Vitamin
} from "./vitamins.js";
import {
    Div, Img, P, Span
} from "./components.js";

export class VAnnoucement extends Vitamin(Div) {

    constructor({ref, img, description}) {
        super({ref});
        this.addClass("announcement")
            .addStyle("background-image", `url("${img}")`)
            .add(new Div().addClass("announcement-description")
                .setText(description)
            );
    }
}

export class VHome extends VContainer {

    constructor({ref, kind="home", myLogLoader, logLoader}) {
        super({ref});
        this.addClass(kind);
        this._slideshow = new VSlideShow({ref:ref+"-slideshow"});
        this._events = new VContainer({ref:ref+"-content", columns:2});
        this.add(this._slideshow);
        this.add(this._events);
        this._myLogs = new VLog({ref:"my-logs", title:"Pour moi", logLoader:myLogLoader});
        this._logs = new VLog({ref:"logs", title:"Pour tous", logLoader});
        this._events.addField({field: this._logs});
        this._events.addField({field: this._myLogs});
    }

    setSlides(slides) {
        this._slideshow.setSlides(slides);
    }

}

export class VEvent extends Vitamin(Div) {

    constructor({ref, img, date, title, text}) {
        super({ref});
        this.addClass("event");
        this.add(new Span(date.toLocaleDateString()).addClass("event-date"));
        this.add(new Span(title).addClass("event-title"));
        if (img) {
            this.add(new Img(img).addClass("event-img"))
        }
        this.add(new P(text).addClass("event-text"));
    }
}

export class VLog extends Vitamin(Div) {

    constructor({ref, title="", logLoader}) {
        super(ref);
        this._title=new P(title).addClass("log-title");
        this.add(this._title);
        this._content = new Div();
        this.add(this._content).addClass("log-container");
        this._loadLogs = logLoader;
        this._loadLogs();
    }

    onActivate() {
        this._detectVisibility = ()=>this.detectVisibility();
        window.addEventListener("scroll", this._detectVisibility);
        this._content.root.addEventListener("scroll", this._detectVisibility);
        this.detectVisibility();
    }

    onDesactivate() {
        window.removeEventListener("scroll", this._detectVisibility);
        this._content.root.removeEventListener("scroll", this._detectVisibility);
    }

    detectVisibility() {
        let clientRect = this._lastElement.root.getBoundingClientRect();
        let bottomOfScreen = window.scrollY + window.innerHeight;
        let topOfScreen = window.scrollY;
        if ((bottomOfScreen > clientRect.y) && (topOfScreen < clientRect.y+clientRect.height)) {
            this._loadLogs && this._loadLogs();
        }
    }
}