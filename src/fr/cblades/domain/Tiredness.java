package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum Tiredness {
    FRESH("F"),
    TIRED("T"),
    EXHAUSTED("E");

    String label;
    Tiredness(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, Tiredness> byLabels;
    public static Map<String, Tiredness> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (Tiredness type : Tiredness.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
