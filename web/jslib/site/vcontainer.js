'use strict'

import {
    Checkbox, A,
    Div, Img, isComponent, TBody, TD, TH, Thead, TR, Label, Table, getUniqueId, Radio, Span, P
} from "./components.js";
import {
    Vitamin, VSearch
} from "./vitamins.js";

export class VContainer extends Vitamin(Div) {

    constructor({ref, enabled=true, separated=false, columns}, builder) {
        super(ref);
        this.enabled = enabled;
        this._fields = [];
        this.addClass("page-container");
        if (!columns || columns===1) {
            this._columns = [this];
            this.addClass("container-1column");
        } else {
            this._columns = [];
            this.addClass("container-row");
            for (let index=0; index<columns; index++) {
                let column = new Div().addClass(`container-${columns}columns`).addClass(`container-column${index}`);
                if (separated && index>0) column.addClass("subsequent-column");
                this._columns.push(column);
                this.add(column);
            }
        }
        builder&&builder(this);
    }

    addField({field, column, ...params}, builder) {
        field = field ? field : builder(params);
        this._columns[column===undefined ? this._fields.length%this._columns.length: column].add(field);
        this._fields.push(field);
        return this;
    }

    addContainer({column, ...params}, builder) {
        this.addField({field:new VContainer({...params}, builder), column});
        return this;
    }

}

export class VSplitterPanel extends Vitamin(Div) {

    constructor({ref, enabled=true}, builder) {
        super({ref});
        this.enabled = enabled;
        this._leftPane = new Div().addClass("splitter-left-pane");
        this._leftPaneContent = new Div().addClass("splitter-left-pane-content");
        this._separator = new Div().addClass("splitter-separator");
        this._rightPane = new Div().addClass("splitter-right-pane");
        this._rightPaneContent = new Div().addClass("splitter-right-pane-content");
        this.addClass("splitter-panel")
            .add(this._leftPane.add(this._leftPaneContent))
            .add(this._separator)
            .add(this._rightPane.add(this._rightPaneContent));
        this._separator.onEvent("mousedown", event=>{
            //console.log("mouse down: " + e.clientX);
            this._startPoint = {event,
                offsetLeft:  this._separator.offsetLeft,
                offsetTop:   this._separator.offsetTop,
                firstWidth:  this._leftPane.offsetWidth,
                secondWidth: this._rightPane.offsetWidth
            };
            document.onmousemove = event=> {
                let delta = {
                    x: event.clientX - this._startPoint.event.clientX,
                    y: event.clientY - this._startPoint.event.clientY
                };
                // Prevent negative-sized elements
                delta.x = Math.min(Math.max(delta.x, -this._startPoint.firstWidth), this._startPoint.secondWidth);
                this._leftPane.addStyle("width", (this._startPoint.firstWidth + delta.x) + "px");
                this._rightPane.addStyle("width", (this._startPoint.secondWidth - delta.x) + "px");
            };
            document.onmouseup = () => {
                //console.log("mouse up");
                document.onmousemove = document.onmouseup = null;
            }
        });
        builder&&builder(this);
        this._enlargeObserver = new MutationObserver(mutations=>{
            let changed = false;
            for (let mutation of mutations) {
                if (mutation.attributeName === "style") changed = true;
            }
            if (changed) this._resize();
        });
        this._enlargeObserver.observe(this.root, {attributes:true});
        window.addEventListener("resize", event=>{
            this._resize();
        });
    }

    onActivate() {
        super.onActivate();
        console.log("resize")
        this._resize();
    }

    _resize() {
        let separatorWidth = this._separator.offsetWidth;
        let totalWidth = this.offsetWidth-separatorWidth;
        let firstWidth =  this._leftPane.offsetWidth;
        let secondWidth = this._rightPane.offsetWidth;
        let previousTotalWidth = firstWidth + secondWidth;
        this._leftPane.addStyle("width", (firstWidth/previousTotalWidth*totalWidth) + "px");
        this._rightPane.addStyle("width", (secondWidth/previousTotalWidth*totalWidth) + "px");
    }

    addOnLeft(vitamin) {
        this._leftPaneContent.add(vitamin);
        return this;
    }

    removeFromLeft(vitamin) {
        this._leftPaneContent.remove(vitamin);
        return this;
    }

    addOnRight(vitamin) {
        this._rightPaneContent.add(vitamin);
        return this;
    }

    removeFromRight(vitamin) {
        this._rightPaneContent.remove(vitamin);
        return this;
    }
}

export class VWall extends Vitamin(Div) {

    constructor({ref, kind="wall-vertical"}, builder) {
        super({ref});
        kind&&this.addClass(kind);
        this._lastElement =new Div();
        this.add(this._lastElement);
        this._notes = [];
        builder&&builder(this);
    }

    setLoadNotes(action) {
        this._loadNotes = action;
        return this;
    }

    resizeGridItem(note){
        let rowHeight = parseInt(window.getComputedStyle(this.root).getPropertyValue('grid-auto-rows'));
        let rowGap = parseInt(window.getComputedStyle(this.root).getPropertyValue('grid-row-gap'));
        let rowSpan = Math.ceil((note.root.getBoundingClientRect().height+rowGap)/(rowHeight+rowGap));
        note._envelope.root.style.gridRowEnd = "span "+rowSpan;
    }

    onActivate() {
        super.onActivate();
        this.resizeAllGridItems();
        this._resizeAll = ()=>this.resizeAllGridItems();
        window.addEventListener("resize", this._resizeAll);
        this._detectVisibility = ()=>this.detectVisibility();
        window.addEventListener("scroll", this._detectVisibility);
        Img.addLoaderListener(this);
        this.detectVisibility();
    }

    onDesactivate() {
        super.onDesactivate();
        window.removeEventListener("resize", this._resizeAll);
        window.removeEventListener("scroll", this._detectVisibility);
        Img.removeLoaderListener(this);
    }

    onImageLoaded(img) {
        this.resizeAllGridItems();
    }

    resizeAllGridItems() {
        for(let note of this._notes){
            this.resizeGridItem(note);
        }
    }

    addNote(note) {
        note._envelope = new Div();
        note._envelope.add(note);
        this.insert(note._envelope, this._lastElement);
        this._notes.push(note);
        note._added();
        return this;
    }

    clearNotes() {
        for (let note of this._notes) {
            this.remove(note._envelope);
        }
        this._notes = [];
    }

    detectVisibility() {
        let clientRect = this._lastElement.root.getBoundingClientRect();
        let bottomOfScreen = window.scrollY + window.innerHeight;
        let topOfScreen = window.scrollY;
        if ((bottomOfScreen > clientRect.y) && (topOfScreen < clientRect.y+clientRect.height)) {
            this._loadNotes && this._loadNotes();
        }
    }

}

export class VWallWithSearch extends VContainer {

    constructor({ref, kind="wall-vertical", searchAction}, builder) {
        super({ref});
        this.addClass(kind);
        this._search = new VSearch({ref:ref+"_search", searchAction});
        this.add(this._search);
        this._wall = new VWall({ref:ref+"-content", kind:kind+"-content"}, builder);
        this.add(this._wall);
    }

    addNote(note) {
        this._wall.addNote(note);
        return this;
    }

    clearNotes() {
        this._wall.clearNotes();
        return this;
    }

    setLoadNotes(action) {
        this._wall.setLoadNotes(action);
        return this;
    }
}

export class VTable extends Vitamin(Div) {

    constructor({ref, initPage, changePage, select}) {
        super({ref});
        this.addClass("table-frame");
        this._content = new Div().addClass("table-content");
        this.add(this._content);
        this._changePage = changePage;
        this._select = select;
        initPage&&initPage(this);
    }

    setPagination({first, last, current}) {
        if (first !== last) {
            if (!this._pagination) {
                this._pagination = new Div().addClass("pagination");
                this.add(this._pagination);
            }
            else {
                this._pagination.clear();
            }
            let previous = new Label("&laquo; Previous");
            if (current === first) {
                previous.addClass("disabled");
            }
            else {
                previous.onMouseClick(event=>{
                    this._changePage(current-1);
                })
            }
            this._pagination.add(previous);
            for (let page = first; page <= last; page++) {
                let designed = page;
                let pageNumber = new Label(page).onMouseClick(event=>{
                    this._changePage(designed);
                });
                if (current === page) pageNumber.addClass("active");
                this._pagination.add(pageNumber);
            }
            let next = new Label("Next &raquo;");
            if (current === last) {
                next.addClass("disabled");
            }
            else {
                next.addClass("enabled");
                next.onMouseClick(event=>{
                    this._changePage(current+1);
                })
            }
            this._pagination.add(next);
        }
    }

    setContent({summary, selectable, columns, data}) {
        this._content.clear();
        if (summary) {
            if (isComponent(summary)) {
                this._content.add(summary);
            }
            else {
                this._content.add(new Div().addClass("table-display").setText(summary));
            }
        }
        this._table = new Table();
        this._content.add(this._table);
        if (columns) {
            this._columns = new TR();
            this._table.add(new Thead().add(this._columns));
            if (selectable) this._columns.add(new TH(""));
            let col=0;
            for (let column of columns) {
                if (isComponent(column)) {
                    this._columns.add(new TH("").addClass("column-"+col++).add(column));
                }
                else {
                    this._columns.add(new TH(column).addClass("column-"+col++));
                }
            }
        }
        this._body = new TBody();
        this._table.add(this._body);
        for (let line of data) {
            let row = new TR();
            if (this._select) row.onMouseClick(event=>this._select(row));
            this._body.add(row);
            let col=0;
            if (selectable) {
                let selection = new Checkbox();
                row.add(new TD().add(selection));
            }
            for (let cell of line) {
                if (isComponent(cell)) {
                    row.add(new TD("").add(cell).addClass("column-"+col++));
                }
                else {
                    row.add(new TD(cell).addClass("column-"+col++));
                }
            }
        }
    }

}

export class VTabSet extends Vitamin(Div) {

    constructor({ref, kind="tabs", tabs}) {
        super({ref});
        this.addClass(kind);
        this._tabs = new Div().addClass(kind+"-bar");
        this._tabsContent = new Div().addClass(kind+"-content");
        let index=0;
        let name = "tabs"+getUniqueId();
        for (let tab of tabs) {
            let tabId = getUniqueId();
            let radio = new Radio(name).setId(tabId).setChecked(index===0)
                .onEvent("change", event=> {
                    if (radio.getChecked()) {
                        this._tabsContent.clear();
                        this._tabsContent.add(tab.content);
                    }
                }
            );
            this._tabs.add(radio);
            if (isComponent(tab.tab)) {
                this._tabs.add(tab.tab.onMouseClick(event=>{
                    radio.setChecked(true);
                }));
            }
            else {
                this._tabs.add(new Label(tab.tab).setFor(tabId));
            }
            if (radio.getChecked()) {
                this._tabsContent.add(tab.content);
            }
            index++;
        }
        this.add(this._tabs).add(this._tabsContent);
    }

    get tabBar() {
        return this._tabs;
    }
}

export class VSlideShow extends Vitamin(Div) {

    constructor({ref, kind="slideshow"}) {
        super({ref});
        this.addClass(kind);
        this._content = new Div().addClass("slide-container");
        this._dots = new Div().addClass("slide-dots");
        this.add(this._content);
        this.add(this._dots);
        this.switchSlides();
    }

    setSlides(slides) {
        this._slides = slides;
        this._content.clear();
        this._dots.clear();
        let counter=0;
        for (let slide of slides) {
            let index=counter;
            this._content.add(new Div().addClass("slides").addClass("fade-slide").add(slide));
            this._dots.add(new Span("").addClass("slide-dot").onMouseClick(event=>{
                this.setSlide(index)
            }));
            counter++;
        }
        this.add(new A("\u276e").addClass("slide-prev").onMouseClick(event=>{
            this.moveSlide(-1)
        }))
        .add(new A("\u276f").addClass("slide-next").onMouseClick(event=>{
            this.moveSlide(1)
        }))
        this._slideIndex = 0;
        this._showSlides(this._slideIndex);
        return this;
    }

    _suspendSwitching() {
        if (this._token) {
            clearInterval(this._token)
        }
        setTimeout(()=>{
            this.switchSlides();
        }, 10000);
    }

    moveSlide(steps) {
        this._suspendSwitching();
        this._showSlides(this._slideIndex + steps);
    }

    setSlide(index) {
        this._suspendSwitching();
        this._showSlides(index);
    }

    _showSlides(index) {
        this._slideIndex = index;
        if (this._slideIndex >= this._slides.length) {
            this._slideIndex = 0
        }
        if (this._slideIndex < 0) {
            this._slideIndex = this._slides.length-1
        }
        let content = this._content.children;
        let dots = this._dots.children;
        for (let i = 0; i < content.length; i++) {
            content[i].removeClass("slide-visible");
                //style.display = "none";
        }
        for (let i = 0; i < dots.length; i++) {
            dots[i].removeClass("slide-active")
        }
        content[this._slideIndex].addClass("slide-visible");
        dots[this._slideIndex].addClass("slide-active");
    }

    switchSlides() {
        this._token = setInterval(()=>{
            this._showSlides(this._slideIndex+1)
        }, 7000); // Change image every 2 seconds
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
        super.onActivate();
        this._detectVisibility = ()=>this.detectVisibility();
        window.addEventListener("scroll", this._detectVisibility);
        this._content.root.addEventListener("scroll", this._detectVisibility);
        this.detectVisibility();
    }

    onDesactivate() {
        super.onDesactivate();
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

export class VPageContent extends VContainer {

    constructor({ref}) {
        super({ref});
        this._showHome(true);
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

}



