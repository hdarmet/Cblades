
export function setCookie(cname, cvalue, exdays) {
    let date = new Date();
    date.setTime(date.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ date.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

export function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
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
    let reader  = new FileReader();
    reader.addEventListener("loadend", function () {
        object[field] = reader.result;
    }, false);
    reader.readAsDataURL(file);
    object[field] = reader.result;
}

export function requestServer(uri, requestContent, success, failure, files, method='POST') {
    let cookie = getCookie("xsrfToken");
    let formData;
    if (requestContent) {
        formData = new FormData();
        formData.append('request-part', requestContent);
    }
    if (files) {
        formData = formData || new FormData();
        for (let file in files) {
            formData.append(file.name, file.file, file.file.name);
        }
    }
    let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (cookie) headers['XSRF-TOKEN'] = cookie;
    let init = {
        headers,
        method: method
    };
    if (formData) init.body = formData;
    fetch(document.defaultView.location.origin+uri, init)
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
            failure(text);
        })
    });
}