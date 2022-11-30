'use strict';

import {
    VForum, VForums, VForumThread
} from "../vitamin/vforum.js";
import {
    sendGet
} from "../vitamin/components.js";
import {
    showMessage
} from "../vitamin/vpage.js";

function getMessages(pageIndex) {
    let names = ['Dominique', 'Pierre', 'Thomas'];
    let levels = ['Warrior', 'Knight', 'King'];
    let messages = [];
    for (let index=pageIndex*10; index<25 && index<pageIndex*10+10; index++) {
        messages.push({
            avatarImage: `../images/site/avatars/avatar${index%3+1}.png`,
            avatarIdentity: names[index%3],
            avatarLevel: levels[index%3],
            avatarMessageCount: (index%3+1)*17,
            //message: `The ${index}th message of ${names[index%3]}`,
            message: paragrpahText,
            likes: index*2+1,
            liked: index%5 === 0,
            date: new Date()
        });
    }
    return messages;
}

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
                        lastMessageDate: new Date(),
                        lastMessageThread: "Post 1",
                        lastMessageAuthor: "Moray Johnson"
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
                        lastMessageDate: new Date(),
                        lastMessageAuthor: "Moray Johnson"
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
                        likeCount: message.likeCount,
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
    send: post=>{
        console.log("Post sent", post);
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