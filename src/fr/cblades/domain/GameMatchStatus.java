package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum GameMatchStatus {
    PROPOSED("prp"),
    IN_PROGRESS("ipr"),
    CANCELLED("cnd"),
    FINISHED("end");

    String label;
    GameMatchStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, GameMatchStatus> byLabels;
    public static Map<String, GameMatchStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (GameMatchStatus type : GameMatchStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static GameMatchStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
