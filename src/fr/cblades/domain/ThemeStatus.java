package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ThemeStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    ThemeStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ThemeStatus> byLabels;
    public static Map<String, ThemeStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ThemeStatus type : ThemeStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
