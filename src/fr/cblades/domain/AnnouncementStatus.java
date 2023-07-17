package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum AnnouncementStatus {
    LIVE("live"),
    COMING_SOON("soon"),
    ARCHIVED("arch");

    String label;
    AnnouncementStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, AnnouncementStatus> byLabels;
    public static Map<String, AnnouncementStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (AnnouncementStatus type : AnnouncementStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static AnnouncementStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
