package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ForumStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    ForumStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ForumStatus> byLabels;
    public static Map<String, ForumStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ForumStatus type : ForumStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static ForumStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
