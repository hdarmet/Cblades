import {
    getDrawPlatform
} from "../jslib/board/draw.js";

let responses = [];

export function registerResponse(uri, value) {
    responses.push({uri, value});
}

getDrawPlatform().requestServer = function(uri, requestContent, success, failure, files, method) {
    for (let record of responses) {
        if (uri.indexOf(record.uri)>=0) {
            success(typeof (record.value) === "function" ?
                record.value(requestContent) :
                JSON.stringify(record.value));
            return;
        }
    }
};

