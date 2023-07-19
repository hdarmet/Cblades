'use strict'

import {
    assert, describe, it, before
} from "../jstest/jtest.js";
import {
    completeRequester,
    getCookie,
    requester, requestServer
} from "../jslib/request.js";
import {
    MockPromise, ResponsePromise
} from "./mocks.js";

describe("Request", ()=> {

    before(()=> {
        requester.decodeURIComponent = function(cookie) { return cookie; };
        requester.locationOrigin = "https://myserver";
        requester.fetch = function(uri, config) {
            assert(requester.expected.uri).equalsTo(uri);
            assert(requester.expected.config).objectEqualsTo(config);
            requester.request = new MockPromise();
            return requester.request;
        }
        Object.defineProperty(requester, "cookie", {
            get: function() { return ' first-cookie=my first cookie content;  xsrfToken=xsrf-token-content;';},
            configurable: true
        });
    });

    function expectRequester(uri, body, method) {
        requester.expected = {
            uri:"https://myserver"+uri,
            config:{
                method,
                headers:{
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "XSRF-TOKEN": "xsrf-token-content"
                },
                body
            }
        };
    }

    it("Checks cookie property implementation", () => {
        given:
            completeRequester();
            document.cookie = "mycookie";
        then:
            assert(requester.cookie.indexOf("mycookie")>=0).isTrue();
    });


    it("Checks a request that succeeds", () => {
        given:
            var answerType;
            var answerText;
            var answerStatus;
        when:
            expectRequester("/app/api/hello", "{\"message\":\"Hello Server\"}", "POST");
            requestServer(
                "/app/api/hello", {message:"Hello Server"},
                (text, status)=>{answerType="S"; answerText=text; answerStatus=status;},
                (text, status)=>{answerType="F"; answerText=text; answerStatus=status;},
                null, 'POST'
            );
            requester.request.succeeds({
                status:201,
                text() {
                    return new ResponsePromise("{\"message\":\"Hello Client\"}");
                }
            });
        then:
            assert(answerType).equalsTo('S');
            assert(answerStatus).equalsTo(201);
            assert(answerText).equalsTo("{\"message\":\"Hello Client\"}");
    });

    it("Checks a request that fails because the response status is not an 200 one", () => {
        given:
            var answerType;
            var answerText;
            var answerStatus;
        when:
            expectRequester("/app/api/hello", "{\"message\":\"Hello Server\"}", "POST");
            requestServer(
                "/app/api/hello", {message:"Hello Server"},
                (text, status)=>{answerType="S"; answerText=text; answerStatus=status;},
                (text, status)=>{answerType="F"; answerText=text; answerStatus=status;},
                null, 'POST'
            );
            requester.request.succeeds({
                status:503,
                text() {
                    return new ResponsePromise("{\"message\":\"Hello Client\"}");
                }
            });
        then:
            assert(answerType).equalsTo('F');
            assert(answerStatus).equalsTo(503);
            assert(answerText).equalsTo("{\"message\":\"Hello Client\"}");
    });

    it("Checks a request that fails because fetch triggers a failure", () => {
        given:
            var answerType;
            var answerText;
            var answerStatus;
        when:
            expectRequester("/app/api/hello", "{\"message\":\"Hello Server\"}", "POST", "POST");
            requestServer(
                "/app/api/hello", {message:"Hello Server"},
                (text, status)=>{answerType="S"; answerText=text; answerStatus=status;},
                (text, status)=>{answerType="F"; answerText=text; answerStatus=status;},
                null, 'POST'
            );
            requester.request.fails({
                status:503,
                text() {
                    return new ResponsePromise("{\"message\":\"Hello Client\"}");
                }
            });
        then:
            assert(answerType).equalsTo('F');
            assert(answerStatus).equalsTo(503);
            assert(answerText).equalsTo("{\"message\":\"Hello Client\"}");
    });

    it("Checks the getCookie method", () => {
        assert(getCookie("first-cookie")).equalsTo("my first cookie content");
        assert(getCookie("nokey")).equalsTo("");
    });

});