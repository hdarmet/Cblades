'use strict';

import {
    VForum, VForums, VForumThread
} from "../vitamin/vforum.js";
import {
    requestLog,
    sendGet, sendPost
} from "../vitamin/components.js";
import {
    showMessage
} from "../vitamin/vpage.js";

export var vForums = new VForums({
    loadForums:update=>{
        loadForums(
            forumsSpec=>{
                let forums=[];
                for (let forum of forumsSpec) {
                    forums.add({
                        id: forum.id,
                        title: forum.title,
                        threads: forum.threadCount,
                        replies: forum.messageCount,
                        message: forum.description,
                        lastMessageDate: forum.lastMessage ? new Date(forum.lastMessage.publishedDate) : null,
                        lastMessageThread: forum.lastMessage && forum.lastMessage.thread ? forum.lastMessage.thread.title : null,
                        lastMessageAuthor: forum.lastMessage && forum.lastMessage.author ? forum.lastMessage.author.firstName + " " + forum.lastMessage.author.lastName : ""
                    });
                }
                update({
                    forums
                });
            }
        );
    },
    selectForum:forum=>{
        window.vPageContent.showForumThreads(forum);
    }
});

export var vForum = new VForum({
    loadThreads:(pageNo, forum, update)=>{
        loadThreads(
            pageNo, forum,
            threadsSpec=>{
                let threads=[];
                for (let thread of threadsSpec.threads) {
                    threads.add({
                        id: thread.id,
                        title: thread.title,
                        description: thread.description,
                        messageCount: thread.messageCount,
                        likeCount: thread.likeCount,
                        lastMessageDate: thread.lastMessage ? new Date(thread.lastMessage.publishedDate) : null,
                        lastMessageAuthor: thread.lastMessage && thread.lastMessage.author ? thread.lastMessage.author.firstName + " " + thread.lastMessage.author.lastName : ""
                    });
                }
                update({
                    title: forum.title,
                    pageCount: Math.ceil(threadsSpec.count / threadsSpec.pageSize),
                    currentPage: threadsSpec.page,
                    threadCount: threadsSpec.count,
                    firstThread: threadsSpec.page * threadsSpec.pageSize + 1,
                    lastThread: threadsSpec.page * threadsSpec.pageSize + threadsSpec.threads.length,
                    threads
                });
            }
        );
    },
    selectThread:thread=>{
        window.vPageContent.showForumThread(thread);
    },
    proposeThread:thread=>{
        saveProposedThread({
                forum: thread.forum.id,
                title: thread.title,
                description: thread.description
            },
            text => {
                vForum.closeThreadEditor();
                showMessage("Thread transmitted for validation");
            },
            text => {
                showMessage("Fail to propose Thread", text);
            }
        );
    }
});

export var vForumThread = new VForumThread({
    loadMessages:(pageNo, thread, update)=>{
        loadMessages(
            pageNo, thread,
            messagesSpec=>{
                let messages=[];
                for (let message of messagesSpec.messages) {
                    messages.add({
                        id: message.id,
                        text: message.text,
                        likeCount: message.poll.likes,
                        avatarImage: message.author.avatar,
                        avatarIdentity: message.author.firstName+" "+message.author.lastName,
                        avatarLevel: message.author.rating,
                        avatarMessageCount: message.author.messageCount,
                        liked: false,
                        date: new Date(message.publishedDate)
                    });
                }
                update({
                    title: thread.title,
                    pageCount: Math.ceil(messagesSpec.count / messagesSpec.pageSize),
                    currentPage: messagesSpec.page,
                    threadCount: messagesSpec.count,
                    firstThread: messagesSpec.page * messagesSpec.pageSize + 1,
                    lastThread: messagesSpec.page * messagesSpec.pageSize + messagesSpec.messages.length,
                    messages
                });
            }
        );
    },
    vote: (message, option, update)=>sendVote(
        message, option, votation=>{
            update({
                likeCount: votation.likes,
                liked: votation.option=="like"
            })
        }
    ),
    send: ({text, thread})=>{
        postMessage({
                text,
                thread: thread.id
            },
            text => {
                vForumThread.setPage(0);
                vForumThread.clearPostEditor();
            },
            text => {
                showMessage("Fail to Post Message", text);
            }
        );
    },
    sendReport:message=>{
        sendReport({
                target: message.message.id,
                reason: message.reason,
                text: message.text
            },
            text => {
                vForumThread.closeReportMessageModal();
                showMessage("Report sent", "Thank you for your kelp.");
            },
            text => {
                showMessage("Fail to send report", text);
            }
        );
    }
});

function parseForums(text) {
    return JSON.parse(text);
}

function parseThreads(text) {
    return JSON.parse(text);
}

function parseMessages(text) {
    return JSON.parse(text);
}

export function loadForums(success) {
    sendGet("/api/forum/live",
        (text, status)=>{
            let forumsSpec = parseForums(text);
            success(forumsSpec);
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Forums: "+text);
        }
    );
}

export function loadThreads(pageNo, forum, success) {
    sendGet("/api/forum/threads/"+forum.id+"?page="+pageNo,
        (text, status)=>{
            let threads = parseThreads(text);
            success(threads);
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Threads: "+text);
        }
    );
}

export function loadMessages(pageNo, thread, success) {
    sendGet("/api/forum/messages/"+thread.id+"?page="+pageNo,
        (text, status)=>{
            let messages = parseMessages(text);
            success(messages);
        },
        (text, status)=>{
            showMessage("Error", "Cannot Load Messages: "+text);
        }
    );
}

export function postMessage(message, success, failure) {
    sendPost("/api/forum/post",
        message,
        (text, status) => {
            requestLog("Message post success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Message post failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function sendVote(message, option, update) {
    sendPost("/api/forum/vote/" + message.id,
        { option },
        (text, status) => {
            requestLog("Vote success: " + text + ": " + status);
            let response = JSON.parse(text);
            update(response);
        },
        (text, status) => {
            requestLog("Vote failure: " + text + ": " + status);
            showMessage("Unable to vote", text);
        }
    );
}

export function saveProposedThread(thread, success, failure) {
    sendPost(thread.id===undefined ? "/api/forum/thread/propose" : "/api/forum/thread/amend/" + thread.id,
        thread,
        (text, status) => {
            requestLog("Thread proposal success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Thread proposal failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}

export function sendReport(report, success, failure) {
    sendPost("/api/forum/message/report/",
        report,
        (text, status) => {
            requestLog("Message report success: " + text + ": " + status);
            success(text, status);
        },
        (text, status) => {
            requestLog("Message report failure: " + text + ": " + status);
            failure(text, status);
        }
    );
}