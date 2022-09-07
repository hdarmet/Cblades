package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum EventStatus {
    LIVE("live"),
    COMING_SOON("soon"),
    ARCHIVED("arch");

    String label;
    EventStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, EventStatus> byLabels;
    public static Map<String, EventStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (EventStatus type : EventStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
