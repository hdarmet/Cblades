'use strict'

import {
    VContainer, VSlideShow, VLog
} from "../vitamin/vcontainer.js";
import {
    Vitamin
} from "../vitamin/vitamins.js";
import {
    Div, Img, P, Span
} from "../vitamin/components.js";
import {
    sendGet
} from "../draw.js";
import {
    VWarning
} from "../vitamin/vpage.js";

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
        this._logs.initLoad();
        this._myLogs.initLoad();
        return this;
    }

    setLogs(events) {
        this._logs.addLogs(events);
        return this;
    }

    setMyLogs(events) {
        this._myLogs.addLogs(events);
        return this;
    }

    showMessage(title, text) {
        new VWarning().show({title, message: text});
        return this;
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

function logLoader() {
    for (let index=0; index<20; index++ ) {
        this._lastElement = new VEvent({
            ref:"e1", date:new Date(),
            title:"Iste natus error sit voluptatem",
            img: "../images/site/left-legends.png",
            text: "piciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae",
        });
        this._content.add(this._lastElement);
    }
}

function myLogLoader() {
    for (let index=0; index<20; index++ ) {
        this._lastElement = new VEvent({
            ref:"e1", date:new Date(),
            title:"Iste natus error sit voluptatem",
            img: "../images/site/left-legends.png",
            text: "piciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae",
        });
        this._content.add(this._lastElement);
    }
}

export let vHome = new VHome({ref:"home",
    logLoader: page=>{
        loadEvents(
        items=>{
            vHome.setLogs(items);
        }, page)
    },
    myLogLoader: page=>{
        loadMyEvents(
        items=>{
            vHome.setMyLogs(items);
        }, page)
    }
});

export function loadAnnouncement(success) {
    sendGet("/api/announcement/live",
        (text, status)=>{
            let announcements = JSON.parse(text).announcements;
            let slides = [];
            for (let announcement of announcements) {
                slides.push(new VAnnoucement({
                    ref: "announcement-"+announcement.id,
                    img: announcement.illustration,
                    description: announcement.description
                }));
            }
            vHome.setSlides(slides);
            success();
        },
        (text, status)=>{
            vHome.showMessage("Error", "Cannot Load Page: "+text);
        }
    );
}

export function loadEvents(success, page) {
    sendGet("/api/event/live?page="+page,
        (text, status)=>{
            let events = JSON.parse(text).events;
            let items = [];
            for (let event of events) {
                items.push(new VEvent({
                    ref: "announcement-"+event.id,
                    img: event.illustration,
                    date: new Date(event.date),
                    title: event.title,
                    text: event.description
                }));
            }
            success(items);
        },
        (text, status)=> {
            vHome.showMessage("Error", "Cannot Load Logs: "+text);
        }
    );
}

export function loadMyEvents(success, page) {
    sendGet("/api/event/account-live?page="+page,
        (text, status)=>{
            let events = JSON.parse(text).events;
            let items = [];
            for (let event of events) {
                items.push(new VEvent({
                    ref: "announcement-"+event.id,
                    img: event.illustration,
                    date: new Date(event.date),
                    title: event.title,
                    text: event.description
                }));
            }
            success(items);
        },
        (text, status)=> {
            vHome.showMessage("Error", "Cannot Load Logs: "+text);
        }
    );
}

