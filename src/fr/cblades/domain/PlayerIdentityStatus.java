package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum PlayerIdentityStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    PlayerIdentityStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, PlayerIdentityStatus> byLabels;
    public static Map<String, PlayerIdentityStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (PlayerIdentityStatus type : PlayerIdentityStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
