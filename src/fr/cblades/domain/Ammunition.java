package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum Ammunition {
    PLENTIFUL("P"),
    SCARCE("S"),
    EXHAUSTED("E");

    String label;
    Ammunition(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, Ammunition> byLabels;
    public static Map<String, Ammunition> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (Ammunition type : Ammunition.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static Ammunition byLabel(String label) {
        return byLabels().get(label);
    }

}
