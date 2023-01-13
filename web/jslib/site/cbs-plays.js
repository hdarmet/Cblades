'use strict'

import {
    VImage, Vitamin, VModal
} from "../vitamin/vitamins.js";
import {
    Div, P, Span
} from "../vitamin/components.js";
import {
    VWall, VWallWithSearch
} from "../vitamin/vcontainer.js";
import {
    VButton, VButtons, VFormContainer, VRadios
} from "../vitamin/vforms.js";
import {
    loadLiveScenarios
} from "./cbs-scenario.js";

export class CBSArmy extends Vitamin(Div) {

    constructor({ref, army}) {
        super({ref});
        this.add(new Span("Army:").addClass("army-label"));
        this._armyName = new Span(army).addClass("army-name");
        this.add(this._armyName);
    }

    get specification() {
        return {
            ref: this.ref.ref,
            name: this._armyName.getText()
        };
    }

}

export class CBSParticipation extends CBSArmy {

    constructor({ref, army, player, status}) {
        super({ref, army});
        this._status = status;
        this.addClass("participation-"+status);
        this._armySeparator = new Span("&nbsp;").addClass("participation-separator");
        this.add(this._armySeparator);
        this.add(new Span("Player:").addClass("player-label"));
        this._armyPlayer = new Span(player).addClass("player-name");
        this.add(this._armyPlayer);
    }

    get specification() {
        return {
            ...super.specification,
            player: this._armyPlayer.getText(),
            status: this._status
        };
    }

}

export class CBSProposal extends CBSArmy {

    constructor({ref, army, player}) {
        super({ref, army});
        if (player) {
            this.addClass("army-not-available");
            this._armySeparator = new Span("&nbsp;").addClass("participation-separator");
            this.add(this._armySeparator);
            this.add(new Span("Player:").addClass("player-label"));
            this._armyPlayer = new Span(player).addClass("player-name");
            this.add(this._armyPlayer);
        }
        else {
            this.addClass("army-available");
        }
    }

    get specification() {
        let specification = super.specification;
        if (this._armyPlayer) {
            specification.player = this._armyPlayer.getText()
        }
        return specification;
    }

}

export class CBSAbstractGame extends Vitamin(Div) {

    constructor({
            ref,
            title, img, story, victory, specialRules, participations,
            action
        }) {
        super({ref});
        this.addClass("game");
        this._header = new Div().addClass("game-header");
        this.add(this._header);
        this._title = new P(title).addClass("game-title");
        this._header.add(this._title);
        this._image = new VImage({ref:this.ref+"-image", kind:"game-image", img});
        this._image && this._header.add(this._image);
        this._participations = new Div().addClass("game-participations");
        this.add(this._participations);
        let index = 0;
        for (let participation of participations) {
            this._participations.add(this._createParticipation(ref + "-" + index, participation));
            index++;
        }
        this._content = new Div().addClass("game-content");
        this.add(this._content);
        this._storyTitle = new P("Story").addClass("game-story-title");
        this._content.add(this._storyTitle);
        this._story = new P(story).addClass("game-story");
        this._content.add(this._story);
        this._victoryTitle = new P("Victory Conditions").addClass("game-victory-title");
        this._content.add(this._victoryTitle);
        this._victory = new P(victory).addClass("game-victory");
        this._content.add(this._victory);
        this._specialRulesTitle = new P("Special Rules").addClass("game-special-rules-title");
        this._content.add(this._specialRulesTitle);
        this._specialRules = new P(specialRules).addClass("game-special-rules");
        this._content.add(this._specialRules);
        this.onEvent("click", ()=>{
            action && action(this);
        });
    }

    get title() {
        return this._title.getText();
    }

    set title(title) {
        this._title.setText(title);
    }

    get story() {
        return this._story.getText();
    }

    set story(story) {
        this._story.setText(story);
    }

    get victory() {
        return this._victory.getText();
    }

    set victory(victory) {
        this._victory.setText(victory);
    }

    get specialRules() {
        return this._specialRules.getText();
    }

    set specialRules(specialRules) {
        this._specialRules.setText(specialRules);
    }

    get image() {
        return this._image ? this._image.src : null;
    }

    set image(img) {
        this._image = new VImage({ref:this.ref+"-image", kind:"scenario-image", img});
        this._header.insert(this._image, this._title);
    }

    get specification() {
        let participations = [];
        for (let participation of this._participations.children) {
            participations.push(participation.specification);
        }
        return {
            ref: this.ref.ref,
            img: this._image ? this._image.src : null,
            title: this._title.getText(),
            story: this._story.getText(),
            victory: this._victory.getText(),
            specialRules: this._specialRules.getText(),
            participations
        };
    }

}

export class CBSGame extends CBSAbstractGame {

    constructor({
        ref,
        title, img, story, victory, specialRules,
        turnNumber, participations,
        action
    }) {
        super({
            ref,
            title, img, story, victory, specialRules,
            participations, action
        });
        this._turnNumber = new Div()
            .add(new Span("Turn Number: ").addClass("turn-number-label"))
            .add(new Span(turnNumber).addClass("turn-number-value"))
            .add(new VButton({
                ref: "goto-game", type: VButton.TYPES.ACCEPT, label: "Go to game",
            }).addClass("game-command"))
            .addClass("turn-number");
        this._header.add(this._turnNumber);
    }

    _createParticipation(ref, participation) {
        return new CBSParticipation({ref, ...participation});
    }

    get specification() {
        return {
            ...super.specification,
            turnNumber: parseInt(this._turnNumber.getText())
        };
    }

}

export class CBSConfirmProposal extends VModal {

    constructor(proposal) {
        super({ref: CBSConfirmProposal.REF});
        this.title = "Confirm Proposal";
        this.addClass("confirm-proposal");
        let radios = [];
        for (let participation of proposal.participations) {
            radios.push({ref:participation.ref, title:participation.name, name:"select-army"});
        }
        this._armies = new VRadios({
            ref:CBSConfirmProposal.REF+"-armies", name: "armies", vertical:true, radios,
            onChange: event=>{
                this.get("confirm-proposal-ok").enabled = true;
            }
        });
        this.add(
            new VFormContainer({columns: 1})
                .addField({field: new Span(CBSConfirmProposal.TEXT).addClass("display-content")})
                .addField({field: this._armies})
                .addField({
                    field: new VButtons({
                        ref: "confirm-proposal-buttons", vertical: false, buttons: [
                            {
                                ref: "confirm-proposal-ok", enabled:false, type: VButton.TYPES.ACCEPT, label: "Ok",
                                onClick: event => {
                                    console.log(proposal);
                                    this.hide();
                                }
                            },
                            {
                                ref: "confirm-proposal-cancel", type: VButton.TYPES.REFUSE, label: "Cancel",
                                onClick: event => {
                                    this.hide();
                                }
                            }]
                    })
                })
        );
    }

    static REF = "confirm-proposal";

    static TEXT = "Choose the Army you want to play."

}

export class CBSGameScenario extends CBSAbstractGame {

    constructor({
            ref,
            title, img, story, victory, specialRules,
            participations
        }) {
        super({
            ref,
            title, img, story, victory, specialRules,
            participations,
            action: ()=>{
                new CBSConfirmProposal(this.specification).show();
            }
        });
        this._command = new VButton({
                ref: "choose-scenario", type: VButton.TYPES.ACCEPT, label: "Propose",
            }).addClass("game-command");
        this._header.add(this._command);
    }

    _createParticipation(ref, participation) {
        return new CBSArmy({ref, ...participation});
    }

}

export class CBSConfirmJoin extends VModal {

    constructor(proposal) {
        super({ref: CBSConfirmJoin.REF});
        this.title = "Confirm Joining";
        this.addClass("confirm-join");
        let radios = [];
        for (let participation of proposal.participations) {
            let enabled = !participation.player && proposal.participations.length>2;
            let checked = !participation.player && proposal.participations.length<=2;
            radios.push({ref:participation.ref, title:participation.name, enabled, checked, name:"select-army"});
        }
        this._armies = new VRadios({
            ref:CBSConfirmProposal.REF+"-armies", name: "armies", vertical:true, radios
        });
        this.add(
            new VFormContainer({columns: 1})
                .addField({field: new Span(CBSConfirmJoin.TEXT).addClass("display-content")})
                .addField({field: this._armies})
                .addField({
                    field: new VButtons({
                        ref: "confirm-proposal-buttons", verical: false, buttons: [
                            {
                                ref: "confirm-proposal-ok", type: VButton.TYPES.ACCEPT, label: "Ok",
                                onClick: event => {
                                    console.log(proposal);
                                    this.hide();
                                }
                            },
                            {
                                ref: "confirm-proposal-cancel", type: VButton.TYPES.REFUSE, label: "Cancel",
                                onClick: event => {
                                    this.hide();
                                }
                            }
                        ]
                    })
                })
        );
    }

    static REF = "confirm-join";

    static TEXT = "Choose the Army you want to play."

}

export class CBSGameProposal extends CBSAbstractGame {

    constructor({
                ref,
                title, img, story, victory, specialRules,
                participations
            }) {
        super({
            ref,
            title, img, story, victory, specialRules,
            participations,
            action: ()=>{
                new CBSConfirmJoin(this.specification).show();
            }
        });
        this._command = new VButton({
            ref: "join-proposal", type: VButton.TYPES.ACCEPT, label: "Join",
        }).addClass("game-command");
        this._header.add(this._command);
    }

    _createParticipation(ref, participation) {
        return new CBSProposal({ref, ...participation});
    }

}

export class CBSYourGamesWall extends VWall {

    constructor() {
        super({ref:"my-games", kind: "my-games"});
    }

    openInNewTab(url) {
        window.open(url, '_blank').focus();
    }

}

function getScenario() {
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

    return new CBSGameScenario({
        ref: "art1", title: "A Fierce Fighting",img: `../images/scenarii/scenario1.png`,
        story: paragrpahText, victory: paragrpahText, specialRules: paragrpahText,
        turnNumber: 12,
        participations: [
            {
                army: "Orc"
            },
            {
                army: "Roughneck",
            },
            {
                army: "Elves",
            }
        ]
    });
}

export class CBSProposeGameWall extends VWallWithSearch {

    constructor() {
        super({
            ref:"propose-game",
            kind: "propose-game",
            requestNotes: function (page, search) {
                loadLiveScenarios(page, search, scenarios=>{
                    this.loadNotes(scenarios);
                });
            },
            receiveNotes: function(scenarios) {
                for (let scenario of scenarios) {
                    console.log(scenario);
                    this.addNote(new CBSGameScenario({
                        ref: "scen-"+scenario.id,
                        title: scenario.title,
                        img: scenario.illustration,
                        story: scenario.story,
                        victory: scenario.victoryConditions,
                        specialRules: scenario.specialRules,
                        turnNumber: 12,
                        participations: scenario.game.players.map(player=>{
                            return {
                                "army": player.identity.name
                            }
                        })
                    }));
                }
            },
            searchAction: ()=>{
                this.clearNotes()
            }
        });
    }

}

export class CBSJoinGameWall extends VWallWithSearch {

    constructor() {
        super({ref:"join-game", kind: "join-game",
            searchAction: text=>alert("search:"+text)});
    }

}

export var vProposeGameWall = new CBSProposeGameWall();

