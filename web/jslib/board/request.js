
export let requester = {
    decodeURIComponent,
    fetch: fetch.bind(window),
    locationOrigin: document.defaultView.location.origin,
    date: Date,
    formData: FormData,
    fileReader: FileReader
}
export function completeRequester() {
    Object.defineProperty(requester, "cookie", {
        get: function () {
            return document.cookie;
        },
        set: function (cookie) {
            document.cookie = cookie;
        },
        configurable: true
    });
}
completeRequester();

export function setCookie(exdays, ...values) {
    let date = new requester.date();
    date.setTime(date.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ date.toUTCString();
    let cookie = "";
    for (let value of values) {
        cookie += value.name + "=" + value.value+ ";";
    }
    requester.cookie = cookie + expires + ";path=/";
}

export function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = requester.decodeURIComponent(requester.cookie);
    let ca = decodedCookie.split(';');
    for(let index = 0; index <ca.length; index++) {
        let c = ca[index];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

export function loadFile(object, field, file) {
    let reader  = new requester.fileReader();
    reader.addEventListener("loadend", function () {
        object[field] = reader.result;
    }, false);
    reader.readAsDataURL(file);
    object[field] = reader.result;
}

export function requestServer(uri, requestContent, success, failure, files, method='POST') {
    let cookie = getCookie("xsrfToken");
    let body;
    let headers;
    if (files) {
        body = new requester.formData();
        if (requestContent) {
            body.append('request-part', JSON.stringify(requestContent));
        }
        for (let file of files) {
            body.append(file.key, file.file, file.file.name);
        }
        headers = {};
    }
    else {
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        if (requestContent) {
            body = JSON.stringify(requestContent);
        }
    }

    if (cookie) headers['XSRF-TOKEN'] = cookie;
    let init = {
        headers,
        method
    };
    if (body) init.body = body;
    return requester.fetch(requester.locationOrigin+uri, init)
    .then(function(response) {
        response.text()
        .then(function(text) {
            if (response.status<200 || response.status>=300) {
                failure(text, response.status);
            }
            else {
                success(text, response.status);
            }
        })
    })
    .catch(function(response) {
        response.text()
        .then(function(text) {
            failure(text, response.status);
        })
    });
}