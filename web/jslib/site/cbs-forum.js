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

function getForums() {
    return [
        {
            title: "Discussing Retailers",
            threads: 9,
            replies: 107,
            comment: `Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers
    GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 1",
            lastCommentAuthor: "Moray Johnson"
        },
        {
            title: "Board Game Design",
            threads: 22,
            replies: 295,
            comment: `A gathering place to discuss game design
            What areas of history would make a great hidden movement game? Extra points for non-military!`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 2",
            lastCommentAuthor: "John Breckenridge"
        },
        {
            title: "Design Contests",
            threads: 857,
            replies: 56,
            comment: `Announce and participate in game design competitions
        2022 Solitaire Print and Play Contest`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 3",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Art and Graphic Design",
            threads: 44,
            replies: 25,
            comment: `Show off your work, and ask for advice
        Which logo design?`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 4",
            lastCommentAuthor: "agoJohn Carimando"
        },
        {
            title: "Design Theory",
            hreads: 1,
            replies: 18,
            comment: `Principles of game design not specific to one game
    Co-op games: a calm discussion on "pass or fail"`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 5",
            lastCommentAuthor: "agoOblivion Doll"
        },
        {
            title: "Design Queries and Problems",
            threads: 25,
            replies: 25,
            comment: `Ask specific questions about a design in the works
    Indirect storytelling for a game.`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 6",
            lastCommentAuthor: "agoHayden Robinson"
        },
        {
            title: "Works in Progress",
            threads: 74,
            replies: 114,
            comment: `Share updates about your projects
        [WIP]Make Sail[2022 Solitaire Print&Play Game Design Contest][Components Available]`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 7",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Seeking Playtesters",
            threads: 26,
            replies: 11,
            comment: `Find folks willing to test out your creation
    Looking for Playtesters: S'Morse Code`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 8",
            lastCommentAuthor: "agoCourtney Falk"
        },
        {
            title: "Discussing Retailers",
            threads: 9,
            replies: 107,
            comment: `Talk about retailers, eBay sellers, the BGG Marketplace, etc. — no offers or ads by sellers
    GeekMarket Beta will be shutting down (no new listings Aug 7, no new orders Aug 15)`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 9",
            lastCommentAuthor: "Moray Johnson"
        },
        {
            title: "Board Game Design",
            threads: 22,
            replies: 295,
            comment: `A gathering place to discuss game design
            What areas of history would make a great hidden movement game? Extra points for non-military!`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 10",
            lastCommentAuthor: "John Breckenridge"
        },
        {
            title: "Design Contests",
            threads: 857,
            replies: 56,
            comment: `Announce and participate in game design competitions
        2022 Solitaire Print and Play Contest`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 11",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Art and Graphic Design",
            threads: 44,
            replies: 25,
            comment: `Show off your work, and ask for advice
        Which logo design?`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 12",
            lastCommentAuthor: "agoJohn Carimando"
        },
        {
            title: "Design Theory",
            hreads: 1,
            replies: 18,
            comment: `Principles of game design not specific to one game
    Co-op games: a calm discussion on "pass or fail"`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 13",
            lastCommentAuthor: "agoOblivion Doll"
        },
        {
            title: "Design Queries and Problems",
            threads: 25,
            replies: 25,
            comment: `Ask specific questions about a design in the works
    Indirect storytelling for a game.`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 14",
            lastCommentAuthor: "agoHayden Robinson"
        },
        {
            title: "Works in Progress",
            threads: 74,
            replies: 114,
            comment: `Share updates about your projects
        [WIP]Make Sail[2022 Solitaire Print&Play Game Design Contest][Components Available]`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 15",
            lastCommentAuthor: "agoIffix Y Santaph"
        },
        {
            title: "Seeking Playtesters",
            threads: 26,
            replies: 11,
            comment: `Find folks willing to test out your creation
    Looking for Playtesters: S'Morse Code`,
            lastCommentDate: new Date(),
            lastCommentThread: "Post 16",
            lastCommentAuthor: "agoCourtney Falk"
        }
    ];
}

function getComments(pageIndex) {
    let names = ['Dominique', 'Pierre', 'Thomas'];
    let levels = ['Warrior', 'Knight', 'King'];
    let comments = [];
    for (let index=pageIndex*10; index<25 && index<pageIndex*10+10; index++) {
        comments.push({
            avatarImage: `../images/site/avatars/avatar${index%3+1}.png`,
            avatarIdentity: names[index%3],
            avatarLevel: levels[index%3],
            avatarCommentCount: (index%3+1)*17,
            //comment: `The ${index}th comment of ${names[index%3]}`,
            comment: paragrpahText,
            likes: index*2+1,
            liked: index%5 === 0,
            date: new Date()
        });
    }
    return comments;
}

export var vForums = new VForums({
    loadForums:update=>{
        loadForums(
            forumsSpec=>{
                let forums=[];
                for (let forum of forumsSpec) {
                    forums.add(        {
                        title: forum.title,
                        threads: forum.threadCount,
                        replies: forum.messageCount,
                        comment: forum.description,
                        lastCommentDate: new Date(),
                        lastCommentThread: "Post 1",
                        lastCommentAuthor: "Moray Johnson"
                    });
                }
                update({
                    forums
                });
            }
        );
    },
    selectForum:forum=>{
        window.vPageContent.showForumThreads({
            // forum description
        });
    }
});

function getForum(pageIndex) {
    let threads = [];
    for (let index=pageIndex*10; index<25 && index<pageIndex*10+10; index++) {
        threads.push({
            title: "Discussing thread " + index,
            threads: 107,
            comments: 214,
            comment: paragrpahText,
            lastCommentDate: new Date(),
            lastCommentAuthor: "Moray Johnson"
        });
    }
    return threads;
}

export var vForum = new VForum({
    loadThreads:(pageIndex, update)=>{
        update({
            title: "Mon petit forum",
            pageCount: 3,
            currentPage: pageIndex,
            threadsCount: 25,
            firstThread: pageIndex*10+1,
            lastThread: pageIndex*10+10,
            threads: getForum(pageIndex)
        });
    },
    selectThread:thread=>{
        window.vPageContent.showForumThread({
            // thread description
        });
    }
});

export var vForumThread = new VForumThread({
    loadPage:(pageIndex, update)=>{
        update({
            title: "Ma petite discussion",
            pageCount: 3,
            currentPage: pageIndex,
            commentCount: 25,
            firstComment: pageIndex*10+1,
            lastComment: pageIndex*10+10,
            comments: getComments(pageIndex)
        });
    },
    send: post=>{
        console.log("Post sent", post);
    }
});

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