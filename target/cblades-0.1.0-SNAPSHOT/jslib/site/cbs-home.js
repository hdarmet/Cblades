'use strict'

import {
    VContainer, VSlideShow, VLog
} from "../vitamin/vcontainer.js";
import {
    VLoginHandler,
    Vitamin
} from "../vitamin/vitamins.js";
import {
    Div, Img, P, Span
} from "../vitamin/components.js";
import {
    sendGet
} from "../board/draw.js";
import {
    showMessage
} from "../vitamin/vpage.js";

export class CBSAnnoucement extends Vitamin(Div) {

    constructor({ref, img, description}) {
        super({ref});
        this.addClass("announcement")
            .addStyle("background-image", `url("${img}")`)
            .add(new Div().addClass("announcement-description")
                .setText(description)
            );
    }

}

export class CBSHome extends VContainer {

    constructor({ref, kind="home", myLogLoader, logLoader, connect}) {
        super({ref});
        this.addClass(kind);
        this._slideshow = new VSlideShow({ref:ref+"-slideshow"});
        this._events = new VContainer({ref:ref+"-content", columns:2});
        this.add(this._slideshow);
        this.add(this._events);
        this._myLogs = new VLog({
            ref: "my-logs", title: "Pour moi",
            logLoader: page => {
                if (VLoginHandler.connection) {
                    myLogLoader(page)
                }
            }
        });
        this._invitToConnect = new Div().add(
            new Img("../images/site/invite-connection.jpg")
        ).add(
            new Div("Connect or Register to Play On-line or contribute.")
        ).addClass("home-connect"
        ).onEvent("click",
            event=>connect&&connect()
        );
        this._logs = new VLog({ref:"logs", title:"Pour tous", logLoader});
        this._events.addField({field: this._logs});
        this._rightPart = new Div().addClass("home-right-column").add(this._myLogs).add(this._invitToConnect);
        this._invitToConnect.addClass(VLoginHandler.connection? "fade" : "not-fade");
        this._events.addField({field: this._rightPart});
        VLoginHandler.addLoginListener(this);
    }

    onConnection({user}) {
        if (user) {
            this._myLogs.initLoad();
            this._invitToConnect.removeClass("not-fade");
            this._invitToConnect.addClass("fade");
        }
        else {
            this._invitToConnect.removeClass("fade");
            this._invitToConnect.addClass("not-fade");
        }
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

}

export class CBSEvent extends Vitamin(Div) {

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

export let vHome = new CBSHome({ref:"home",
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
    },
    connect: ()=>VLoginHandler.login()
});

export function loadAnnouncement(success) {
    sendGet("/api/announcement/live",
        (text, status)=>{
            let announcements = JSON.parse(text).announcements;
            let slides = [];
            for (let announcement of announcements) {
                slides.push(new CBSAnnoucement({
                    ref: "announcement-"+announcement.id,
                    img: announcement.illustration,
                    description: announcement.description
                }));
            }
            vHome.setSlides(slides);
            success();
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Page: "+text);
        }
    );
}

export function loadEvents(success, page) {
    sendGet("/api/event/live?page="+page,
        (text, status)=>{
            let events = JSON.parse(text).events;
            let items = [];
            for (let event of events) {
                items.push(new CBSEvent({
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
            showMessage("Error", "Cannot Load Logs: "+text);
        }
    );
}

export function loadMyEvents(success, page) {
    sendGet("/api/event/account-live?page="+page,
        (text, status)=>{
            let events = JSON.parse(text).events;
            let items = [];
            for (let event of events) {
                items.push(new CBSEvent({
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
            showMessage("Error", "Cannot Load Logs: "+text);
        }
    );
}

