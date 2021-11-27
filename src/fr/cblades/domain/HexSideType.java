package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public enum HexSideType {
    NORMAL("N"),
    EASY("E"),
    DIFFICULT("D"),
    CLIMB("C"),
    WALL("W");

    String label;
    HexSideType(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, HexSideType> byLabels;
    public static Map<String, HexSideType> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (HexSideType type : HexSideType.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
