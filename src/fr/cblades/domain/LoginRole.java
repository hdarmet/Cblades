package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum LoginRole {
    STANDARD("std"),
    CONTRIBUTOR("cnt"),
    ADMINISTRATOR("adm"),
    TEST("tst");

    String label;
    LoginRole(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, LoginRole> byLabels;
    public static Map<String, LoginRole> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (LoginRole type : LoginRole.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static LoginRole byLabel(String label) {
        return byLabels().get(label);
    }
}
