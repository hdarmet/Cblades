package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum Cohesion {
    GOOD_ORDER("GO"),
    DISRUPTED("D"),
    ROOTED("R");

    String label;
    Cohesion(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, Cohesion> byLabels;
    public static Map<String, Cohesion> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (Cohesion type : Cohesion.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
