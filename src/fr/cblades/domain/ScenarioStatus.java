package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ScenarioStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    ScenarioStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ScenarioStatus> byLabels;
    public static Map<String, ScenarioStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ScenarioStatus type : ScenarioStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static ScenarioStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
