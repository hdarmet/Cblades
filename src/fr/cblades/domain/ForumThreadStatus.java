package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ForumThreadStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    ForumThreadStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ForumThreadStatus> byLabels;
    public static Map<String, ForumThreadStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ForumThreadStatus type : ForumThreadStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
