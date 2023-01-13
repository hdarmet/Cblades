'use strict';

import {
    VContainer,
    VTable
} from "../vitamin/vcontainer.js";
import {
    Div, Img, isImageFile, P, requestLog, Select, sendGet, sendPost, Span
} from "../vitamin/components.js";
import {
    Undoable,
    Vitamin, VModal, VSearch
} from "../vitamin/vitamins.js";
import {
    mandatory, range,
    VButton,
    VButtons,
    VFileLoaderField,
    VInputField, VInputTextArea, VRef,
    VSelectField
} from "../vitamin/vforms.js";
import {
    showMessage
} from "../vitamin/vpage.js";
import {
    CBAConfirm
} from "./cba-administration.js";
import {
    CBAUserSelector, loadUsers
} from "./cba-user.js";
import {
    CBAEditComments
} from "./cba-comment.js";

export class CBAEditBanner extends Undoable(VModal) {

    constructor({ref, create, banner, saveBanner, deleteBanner}) {
        super({ref, title:"Banner Edition"});
        this._name = new VInputField({
            ref:"banner-name-input", label:"Name",
            validate: mandatory({validate: range({min:2, max:200})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this._path = new VFileLoaderField({
            ref: "banner-path", label: "Path",
            imageSrc: banner.path,
            validate: mandatory({}),
            accept: file => {
                if (!isImageFile(file)) {
                    this._path.message = "The image must be a PNG or JPEG file of size > (50 x 120) pixels.";
                    return false;
                }
                this._path.message = "";
                return true;
            },
            verify: image => {
                if (image.imageHeight !== 120 || image.imageWidth !== 50) {
                    this._path.message = "The image must be a PNG or JPEG file of size > (50 x 120) pixels.";
                    return false;
                }
                this._path.message = "";
                return true;
            },
            onChange: event=>{
                this._memorize();
            }
        });
        this._status = new VSelectField({
            ref: "banner-status", label: "Status",
            validate: mandatory({}),
            options: [
                {value: "live", text: "Live"},
                {value: "pnd", text: "Pending"},
                {value: "prp", text: "Proposed"}
            ],
            onChange: event=>{
                this._memorize();
            }
        });
        let pathContainer = new VContainer({columns:2})
            .addField({field:this._path, column:0})
            .addField({field:this._name, column:1})
            .addField({field:this._status, column:1});
        this.add(pathContainer);
        this._description = new VInputTextArea({
            ref:"banner-description-input", label:"Description",
            validate: mandatory({validate: range({min:2, max:4995})}),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._description);
        let userSelector = new CBAUserSelector({
            title:"Select Banner Author",
            loadPage:loadUsers, selectUser: user=>{
                this._author.setValue(user);
                userSelector.hide();
            }
        }).loadUsers();
        this._author = new VRef({
            ref: "author", label: "Author", nullable: true, selector: userSelector,
            lineCreator: account=> new Div().addClass("user-ref")
                .add(new Img(account.avatar).addClass("user-avatar"))
                .add(new Div().setText(account.login).addClass("user-login"))
                .add(new Div().setText(account.firstName).addClass("user-first-name"))
                .add(new Div().setText(account.lastName).addClass("user-last-name")
                ),
            onChange: event=>{
                this._memorize();
            }
        });
        this.add(this._author);
        this._buttons = new VButtons({
            ref: "buttons", buttons: [
                {
                    ref:"comments", type: VButton.TYPES.NEUTRAL, label:"Comments",
                    onClick:event=>{
                        this.onComments();
                    }
                },
                {
                    ref: "save-banner", type: "accept", label: "Save",
                    onClick: event => {
                        if (this.validate()) {
                            let banner = this.banner;
                            let newComment = banner.comments.newComment;
                            if (newComment) {
                                banner.comments.comments.push({
                                    date: new Date(),
                                    text: newComment,
                                    version: 0
                                });
                            }
                            banner.comments = banner.comments.comments;
                            saveBanner(banner);
                        }
                    }
                },
                {
                    ref: "close-banner", type: "neutral", label: "Close",
                    onClick: event => {
                        this.tryToLeave(() => {
                            this.hide();
                        });
                    }
                }
            ]
        });
        this._deleteButton = new VButton({
            ref: "delete-banner", type: "neutral", label: "Delete",
            onClick: event => {
                this.confirm = new CBAConfirm().show({
                    ref: "confirm-banner-deletion",
                    title: "Delete Banner",
                    message: "Do you really want to delete the Banner ?",
                    actionOk: event => deleteBanner(banner)
                });
            }
        }).addClass("right-button");
        this._buttons.add(this._deleteButton);
        this._deleteButton.enabled = !create;
        this.add(this._buttons);
        this.addClass("banner-modal");
        this.banner = banner;
    }

    validate() {
        return !this._name.validate()
            & !this._path.validate()
            & !this._description.validate()
            & !this._status.validate()
            & !this._author.validate();
    }

    tryToLeave(leave, notLeave) {
        super.tryToLeave(leave, notLeave,"Banner not saved. Do you want to Quit ?")
    }

    get banner() {
        return {
            id: this._banner.id,
            name: this._name.value,
            description: this._description.value,
            path: this._path.imageSrc,
            status: this._status.value,
            author: this._author.value,
            comments: structuredClone(this._comments)
        }
    }

    set banner(banner) {
        this._banner = banner;
        this._name.value = banner.name || "";
        this._path.imageSrc = banner.path || "";
        this._status.value = banner.status || "prp";
        this._description.value = banner.description || "";
        this._author.value = banner.author;
        this._comments = {
            comments: this._banner.comments || [],
            newComment: ""
        }
        this._clean();
        this._memorize();
    }

    _register() {
        return this.banner;
    }

    _recover(banner) {
        if (banner) {
            this._name.value = banner.name;
            this._path.imageSrc = banner.path;
            this._description.value = banner.description;
            this._status.value = banner.status;
            this._author.value = banner.author;
            this._comments = structuredClone(banner.comments)
        }
    }

    saved(banner) {
        this.banner = banner;
        this._deleteButton.enabled = true;
        showMessage("Banner saved.");
        this._clean();
        this._memorize();
        return true;
    }

    get pathFile()  {
        return this._path.files ? [
            {key: "path", file: this._path.files[0]}
        ] : undefined;
    }

    set comments(comments) {
        this._comments = comments;
        this._memorize();
    }

    onComments() {
        new CBAEditComments({
            "ref": "banner-comments",
            "kind": "banner-comments",
            comments: structuredClone(this._comments),
            acknowledge: comments=>this.comments = comments
        }).show();
    }

}

export class CBABannerList extends VTable {

    constructor({loadPage, saveBanner, saveBannerStatus, deleteBanner}) {
        super({
            ref: "banner-list",
            changePage: pageIndex => this.setPage(pageIndex),
            select: line => this.selectBanner(line)
        });
        this.addClass("banner-list");
        this._loadPage = loadPage;
        this._saveBanner = saveBanner;
        this._saveBannerStatus = saveBannerStatus;
        this._deleteBanner = deleteBanner;
    }

    set search(search) {
        this._search = search;
    }

    loadBanners() {
        this.setPage(0);
        return this;
    }

    refresh() {
        this.setPage(this._currentPage);
    }

    selectBanner(banner) {
        loadBanner(banner,
            banner=>{
                let bannerEditor = new CBAEditBanner({
                    title: "Edit Banner",
                    banner,
                    saveBanner: banner => this._saveBanner(banner,
                        bannerEditor.pathFile,
                        () => {
                            bannerEditor.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to update Banner", text);
                        }
                    ),
                    deleteBanner: event => this._deleteBanner(banner,
                        () => {
                            bannerEditor.hide();
                            bannerEditor.confirm.hide();
                            this.refresh();
                        },
                        text => {
                            bannerEditor.confirm.hide();
                            showMessage("Fail to delete Banner", text);
                        }
                    ),
                }).show();
            }
        );
    }

    setPage(pageIndex) {
        this._loadPage(pageIndex, this._search, pageData => {
            let lines = [];
            let saveBannerStatus = (banner, status) => {
                banner.status = status;
                this._saveBannerStatus(banner,
                    () => showMessage("Banner saved."),
                    text => showMessage("Unable to Save Banner.", text),
                );
            }
            for (let banner of pageData.banners) {
                let name = new Span(banner.name).addClass("banner-name");
                let path =new Img(banner.path).addClass("banner-path");
                let description = new P(banner.description).addClass("banner-description");
                let status = new Select().setOptions([
                    {value: "live", text: "Live"},
                    {value: "pnd", text: "Pending"},
                    {value: "prp", text: "Proposed"}
                ])
                    .addClass("form-input-select")
                    .setValue(banner.status)
                    .addClass("banner-status")
                    .onChange(evt => saveBannerStatus(banner, status.getValue()));
                lines.push({source:banner, cells:[name, path, description, status]});
            }
            let title = new Span(pageData.title)
                .addClass("banner-title")
            let pageSummary = new Span()
                .addClass("banner-pager")
                .setText(pageData.bannerCount ?
                    String.format(CBABannerList.SUMMARY, pageData.bannerCount, pageData.firstBanner, pageData.lastBanner) :
                    CBABannerList.EMPTY_SUMMARY);
            let summary = new Div()
                .addClass("table-display")
                .add(title)
                .add(pageSummary);
            this.setContent({
                summary,
                columns: ["Name", "Path", "Description", "Status"],
                lines
            });
            this._currentPage = pageData.currentPage;
            let first = pageData.pageCount <= 5 ? 0 : pageData.currentPage - 2;
            if (first < 0) first = 0;
            let last = pageData.pageCount <= 5 ? pageData.pageCount - 1 : pageData.currentPage + 2;
            if (last >= pageData.pageCount) last = pageData.pageCount - 1;
            this.setPagination({
                first, last, current: pageData.currentPage
            });
        });
    }

    static SUMMARY = "Showing {1} to {2} of {0} banner(s)";
    static EMPTY_SUMMARY = "There are no banner to show";
}

export class CBABannerListPage extends Vitamin(Div) {

    constructor({loadPage, saveBanner, saveBannerStatus, deleteBanner}) {
        super({ref: "banner-list-page"});
        this._search = new VSearch({
            ref: "banner-list-search", searchAction: search => {
                this.loadBanners();
            }
        });
        this._create = new VButton({
            ref: "event-create", type: "neutral", label: "Create Banner",
            onClick: event => {
                this._createBannerModal = new CBAEditBanner({
                    title: "Create Banner",
                    create: true,
                    banner: {
                        status: "prp"
                    },
                    saveBanner: banner => saveBanner(banner,
                        this._createBannerModal.pathFile,
                        () => {
                            this._createBannerModal.hide();
                            this.refresh();
                        },
                        text => {
                            showMessage("Fail to create Banner", text);
                        }
                    ),
                    deleteBanner: () => {
                        this._createBannerModal.hide();
                    }
                }).show()
            }
        }).addClass("right-button");
        this._search.add(this._create);
        this._table = new CBABannerList({loadPage, saveBanner, saveBannerStatus, deleteBanner});
        this.add(this._search).add(this._table);
    }

    get createBannerModal() {
        return this._createBannerModal;
    }

    loadBanners() {
        this._table.search = this._search.value;
        this._table.loadBanners();
        return this;
    }

    refresh() {
        this._table.refresh();
        return this;
    }

}

function parseBanner(text) {
    let forum = JSON.parse(text);
    for (let comment of forum.comments) {
        comment.date = new Date(comment.date);
    }
    return forum;
}

export function loadBanner(banner, success) {
    sendGet("/api/banner/load/"+banner.id,
        (text, status) => {
            requestLog("Load Banner success: " + text + ": " + status);
            success(parseBanner(text));
        },
        (text, status) => {
            requestLog("Load Banner failure: " + text + ": " + status);
            showMessage("Unable to load anner of Id "+banner.id, text);
        }
    );
}

export function loadBanners(pageIndex, search, update) {
    sendGet("/api/banner/all?page=" + pageIndex + (search ? "&search=" + encodeURIComponent(search) : ""),
        (text, status) => {
            requestLog("Load banners success: " + text + ": " + status);
            let response = JSON.parse(text);
            update({
                title: "Banner List",
                pageCount: Math.ceil(response.count / response.pageSize),
                currentPage: response.page,
                bannerCount: response.count,
                firstBanner: response.page * response.pageSize + 1,
                lastBanner: response.page * response.pageSize + response.banners.length,
                banners: response.banners
            });
        },
        (text, status) => {
            requestLog("Load Banner failure: " + text + ": " + status);
            showMessage("Unable to load Banners", text);
        }
    );
}

export function deleteBanner(banner, success, failure) {
    sendGet("/api/banner/delete/" + banner.id,
        (text, status) => {
            requestLog("Banner delete success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Banner delete failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function saveBanner(banner, path, success, failure) {
    sendPost(banner.id===undefined ? "/api/banner/create" : "/api/banner/update/" + banner.id,
        banner,
        (text, status) => {
            requestLog("Banner saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Banner saving failure: " + text + ": " + status);
            failure(text, status);
        },
        path
    );
}

export function saveBannerStatus(banner, success, failure) {
    sendPost("/api/banner/update-status/" + banner.id,
        banner,
        (text, status) => {
            requestLog("Banner status saving success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Banner status saving failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export var vBannerList = new CBABannerListPage({
    loadPage: loadBanners,
    deleteBanner,
    saveBanner,
    saveBannerStatus
});