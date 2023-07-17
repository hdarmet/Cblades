package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum BoardStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    BoardStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, BoardStatus> byLabels;
    public static Map<String, BoardStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (BoardStatus type : BoardStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static BoardStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
