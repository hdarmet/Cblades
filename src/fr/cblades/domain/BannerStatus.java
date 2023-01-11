package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum BannerStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    BannerStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, BannerStatus> byLabels;
    public static Map<String, BannerStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (BannerStatus type : BannerStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
