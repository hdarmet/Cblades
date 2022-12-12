package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ReportStatus {
    IN_PROGRESS("inp"),
    PROCESSED("ok"),
    CANCELED("ko");

    String label;
    ReportStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ReportStatus> byLabels;
    public static Map<String, ReportStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ReportStatus type : ReportStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
