package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum Stacking {
    TOP("T"),
    BOTTOM("B");

    String label;
    Stacking(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, Stacking> byLabels;
    public static Map<String, Stacking> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (Stacking type : Stacking.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static Stacking byLabel(String label) {
        return byLabels().get(label);
    }

}
