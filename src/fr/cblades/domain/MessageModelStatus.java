package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum MessageModelStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    MessageModelStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, MessageModelStatus> byLabels;
    public static Map<String, MessageModelStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (MessageModelStatus type : MessageModelStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static MessageModelStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
