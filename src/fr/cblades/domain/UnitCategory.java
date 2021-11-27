package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum UnitCategory {
    TROOP("T"),
    FORMATION("F"),
    CHARACTER("C");

    String label;
    UnitCategory(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, UnitCategory> byLabels;
    public static Map<String, UnitCategory> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (UnitCategory type : UnitCategory.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
