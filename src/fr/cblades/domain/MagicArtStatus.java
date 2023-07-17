package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum MagicArtStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    MagicArtStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, MagicArtStatus> byLabels;
    public static Map<String, MagicArtStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (MagicArtStatus type : MagicArtStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static MagicArtStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
