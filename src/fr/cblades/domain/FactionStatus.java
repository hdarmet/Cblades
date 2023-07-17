package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum FactionStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    FactionStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, FactionStatus> byLabels;
    public static Map<String, FactionStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (FactionStatus type : FactionStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static FactionStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
