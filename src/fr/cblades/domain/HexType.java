package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public enum HexType {
    OUTDOOR_CLEAR("OC"),
    OUTDOOR_ROUGH("OR"),
    OUTDOOR_DIFFICULT("OD"),
    OUTDOOR_CLEAR_FLAMMABLE("OCF"),
    OUTDOOR_ROUGH_FLAMMABLE("ORF"),
    OUTDOOR_DIFFICULT_FLAMMABLE("ODF"),
    WATER("WA"),
    LAVA("LA"),
    IMPASSABLE("IM"),
    CAVE_CLEAR("CC"),
    CAVE_ROUGH("CR"),
    CAVE_DIFFICULT("CD"),
    CAVE_CLEAR_FLAMMABLE("CCF"),
    CAVE_ROUGH_FLAMMABLE("CRF"),
    CAVE_DIFFICULT_FLAMMABLE("CDF");

    String label;
    HexType(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, HexType> byLabels;
    public static Map<String, HexType> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (HexType type : HexType.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }
}
