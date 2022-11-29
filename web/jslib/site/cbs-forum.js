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

var paragrpahText = `
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit
`;
/*
function getForums() {
    return [
        {
            title: "Discussing Retailers",
            threads: 9,
            replies: 107,
            message: `Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers
    GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 1",
            lastMessageAuthor: "Moray Johnson"
        },
        {
            title: "Board Game Design",
            threads: 22,
            replies: 295,
            message: `A gathering place to discuss game design
            What areas of history would make a great hidden movement game? Extra points for non-military!`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 2",
            lastMessageAuthor: "John Breckenridge"
        },
        {
            title: "Design Contests",
            threads: 857,
            replies: 56,
            message: `Announce and participate in game design competitions
        2022 Solitaire Print and Play Contest`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 3",
            lastMessageAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Art and Graphic Design",
            threads: 44,
            replies: 25,
            message: `Show off your work, and ask for advice
        Which logo design?`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 4",
            lastMessageAuthor: "agoJohn Carimando"
        },
        {
            title: "Design Theory",
            hreads: 1,
            replies: 18,
            message: `Principles of game design not specific to one game
    Co-op games: a calm discussion on "pass or fail"`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 5",
            lastMessageAuthor: "agoOblivion Doll"
        },
        {
            title: "Design Queries and Problems",
            threads: 25,
            replies: 25,
            message: `Ask specific questions about a design in the works
    Indirect storytelling for a game.`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 6",
            lastMessageAuthor: "agoHayden Robinson"
        },
        {
            title: "Works in Progress",
            threads: 74,
            replies: 114,
            message: `Share updates about your projects
        [WIP]Make Sail[2022 Solitaire Print&Play Game Design Contest][Components Available]`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 7",
            lastMessageAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Seeking Playtesters",
            threads: 26,
            replies: 11,
            message: `Find folks willing to test out your creation
    Looking for Playtesters: S'Morse Code`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 8",
            lastMessageAuthor: "agoCourtney Falk"
        },
        {
            title: "Discussing Retailers",
            threads: 9,
            replies: 107,
            message: `Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers
    GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 9",
            lastMessageAuthor: "Moray Johnson"
        },
        {
            title: "Board Game Design",
            threads: 22,
            replies: 295,
            message: `A gathering place to discuss game design
            What areas of history would make a great hidden movement game? Extra points for non-military!`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 10",
            lastMessageAuthor: "John Breckenridge"
        },
        {
            title: "Design Contests",
            threads: 857,
            replies: 56,
            message: `Announce and participate in game design competitions
        2022 Solitaire Print and Play Contest`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 11",
            lastMessageAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Art and Graphic Design",
            threads: 44,
            replies: 25,
            message: `Show off your work, and ask for advice
        Which logo design?`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 12",
            lastMessageAuthor: "agoJohn Carimando"
        },
        {
            title: "Design Theory",
            hreads: 1,
            replies: 18,
            message: `Principles of game design not specific to one game
    Co-op games: a calm discussion on "pass or fail"`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 13",
            lastMessageAuthor: "agoOblivion Doll"
        },
        {
            title: "Design Queries and Problems",
            threads: 25,
            replies: 25,
            message: `Ask specific questions about a design in the works
    Indirect storytelling for a game.`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 14",
            lastMessageAuthor: "agoHayden Robinson"
        },
        {
            title: "Works in Progress",
            threads: 74,
            replies: 114,
            message: `Share updates about your projects
        [WIP]Make Sail[2022 Solitaire Print&Play Game Design Contest][Components Available]`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 15",
            lastMessageAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Seeking Playtesters",
            threads: 26,
            replies: 11,
            message: `Find folks willing to test out your creation
    Looking for Playtesters: S'Morse Code`,
            lastMessageDate: new Date(),
            lastMessageThread: "Post 16",
            lastMessageAuthor: "agoCourtney Falk"
        }
    ];
}
*/

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
    loadPage:(pageIndex, update)=>{
        update({
            title: "Ma petite discussion",
            pageCount: 3,
            currentPage: pageIndex,
            messageCount: 25,
            firstMessage: pageIndex*10+1,
            lastMessage: pageIndex*10+10,
            messages: getMessages(pageIndex)
        });
    },
    send: post=>{
        console.log("Post sent", post);
    }
});

function parseThreads(text) {
    return JSON.parse(text);
}

export function loadForums(success) {
    sendGet("/api/forum/live",
        (text, status)=>{
            let forumsSpec = JSON.parse(text);
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
            showMessage("Error", "Cannot Load Faction: "+text);
        }
    );
}