'use strict'

import {
    assert, describe, it, before
} from "../../jstest/jtest.js";
import {
    completeRequester,
    getCookie, loadFile,
    requester, requestServer, setCookie
} from "../../jslib/board/request.js";
import {
    MockPromise, ResponsePromise
} from "./mocks.js";

describe("Request", ()=> {

    before(()=> {
        requester.decodeURIComponent = function(cookie) { return cookie; };
        requester.locationOrigin = "https://myserver";
        requester.fetch = function(uri, config) {
            assert(uri).equalsTo(requester.expected.uri);
            assert(config).objectEqualsTo(requester.expected.config);
            requester.request = new MockPromise();
            return requester.request;
        }
        requester.documentCookie = ' first-cookie=my first cookie content;  xsrfToken=xsrf-token-content;';
        Object.defineProperty(requester, "cookie", {
            get: function() { return requester.documentCookie;},
            set: function(cookie) { requester.documentCookie = cookie;},
            configurable: true
        });
    });

    function expectRequester(uri, body, headers, method) {
        requester.expected = {
            uri:"https://myserver"+uri,
            config:{
                method,
                headers,
                body
            }
        };
    }

    it("Checks cookie property implementation", () => {
        given:
            completeRequester();
            document.cookie = "mycookie=v1";
        then:
            assert(requester.cookie.indexOf("mycookie=v1")>=0).isTrue();
        when:
            requester.cookie = "mycookie=v2";
        then:
            assert(requester.cookie.indexOf("mycookie=v2")>=0).isTrue();
    });

    it("Checks a request that succeeds", () => {
        given:
            var answerType;
            var answerText;
            var answerStatus;
        when:
            expectRequester("/app/api/hello", "{\"message\":\"Hello Server\"}", {
                Accept: "application/json",
                    "Content-Type": "application/json",
                    "XSRF-TOKEN": "xsrf-token-content"
                }, "POST");
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

    it("Checks a request that carry files in a multipart message", () => {
        given:
            var answerType;
            var answerText;
            var answerStatus;
            var file1 = {content: "file1content", file: {name:"file1.file"}};
            requester.formData = function() {
                requester.body = this;
                this.parts = [];
            }
            requester.formData.prototype.append = function(key, content, name) {
                requester.body.parts.push({key, content, name});
            }
        when:
            expectRequester("/app/api/hello", {
                parts: [
                    {
                        content: "{\"message\":\"Hello Server\"}",
                        key: "request-part"
                    },
                    {
                        content: {name: 'file1.file'},
                        name: "file1.file"
                    }
                ]
            },
            {
                "XSRF-TOKEN": "xsrf-token-content"
            }, "POST");
            requestServer(
                "/app/api/hello", {message:"Hello Server"},
                (text, status)=>{answerType="S"; answerText=text; answerStatus=status;},
                (text, status)=>{answerType="F"; answerText=text; answerStatus=status;},
                [file1], 'POST'
            );
        then:
            assert(requester.body.parts.length).equalsTo(2);
    });

    it("Checks a request that fails because the response status is not an 200 one", () => {
        given:
            var answerType;
            var answerText;
            var answerStatus;
        when:
            expectRequester("/app/api/hello", "{\"message\":\"Hello Server\"}", {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "XSRF-TOKEN": "xsrf-token-content"
                }, "POST");
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
            expectRequester("/app/api/hello", "{\"message\":\"Hello Server\"}", {
                Accept: "application/json",
                "Content-Type": "application/json",
                "XSRF-TOKEN": "xsrf-token-content"
            }, "POST");
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

    it("Checks a cookie set", () => {
        given:
            requester.date = function() {
                this.time = 10000000;
                this.getTime = function() { return this.time; }
                this.setTime = function(time) { this.time = time; }
                this.toUTCString = function() { return ""+this.time; }
            }
        when:
            setCookie(2, {name: "c1", value: 1}, {name: "c2", value: "A"});
        then:
            assert(requester.cookie).equalsTo("c1=1;c2=A;expires=182800000;path=/");
    });

    it("Checks a load file", () => {
        given:
            requester.fileReader = function() {
                requester.reader = this;
                this.result = null;
                this.addEventListener = function(event, fun, option) {
                    assert(event).equalsTo("loadend");
                    assert(option).isFalse();
                    this.listener = fun;
                }
                this.readAsDataURL = function(file) {
                    this.file = file;
                }
            }
        when:
            var target = {};
            var file = {};
            loadFile(target, "file", file);
        then:
            assert(target.file).equalsTo(null);
        when:
            requester.reader.result = "result.file";
            requester.reader.listener();
        then:
            assert(target.file).equalsTo("result.file");
    });
});