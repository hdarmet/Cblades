package fr.cblades.controller;

import fr.cblades.StandardUsers;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.controller.Json;
import org.summer.security.SecuritySunbeam;

import java.util.Map;
import java.util.logging.Logger;

@Controller
public class PingController implements SecuritySunbeam, StandardUsers {
    static final Logger log = Logger.getLogger("cblades");

    @REST(url="/api/ping", method= REST.Method.GET)
    public Json ping(Map<String, Object> params, Json request) {
        Json response = Json.createJsonObject()
            .put("message", "Hello World !");
        return response;
    }

    @REST(url="/api/ping-login", method= REST.Method.POST)
    public Json pingLogin(Map<String, Object> params, Json request) {
        log.warning("call /api/ping-login");
        connect("admin", 30*60*1000);
        Json response = Json.createJsonObject()
            .put("message", "Connect to Secure World !");
        return response;
    }

    @REST(url="/api/ping-protected", method= REST.Method.POST)
    public Json pingProtected(Map<String, Object> params, Json request) {
        log.warning("call /api/ping-protected");
        return (Json)ifAuthorized(user->{
            Json response = Json.createJsonObject()
                .put("message", "Hello Secure World !");
            return response;
        }, ADMIN);
    }

}
