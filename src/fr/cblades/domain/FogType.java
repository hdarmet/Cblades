package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;


public enum FogType {
    NO_FOG("NF"),
    MIST("M"),
    DENSE_MIST("DM"),
    FOG("F"),
    DENSE_FOG("DF");

    String label;
    FogType(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, FogType> byLabels;
    public static Map<String, FogType> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (FogType type : FogType.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static FogType byLabel(String label) {
        return byLabels().get(label);
    }

}
