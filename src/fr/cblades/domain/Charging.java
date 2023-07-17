package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum Charging {
    NONE("N"),
    BEGIN_CHARGE("BC"),
    CAN_CHARGE("CC"),
    CHARGING("C");

    String label;
    Charging(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, Charging> byLabels;
    public static Map<String, Charging> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (Charging type : Charging.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
