package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum AccountStatus {
    ACTIVE("act"),
    PENDING("pnd"),
    BLOCKED("blk");

    String label;
    AccountStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, AccountStatus> byLabels;
    public static Map<String, AccountStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (AccountStatus type : AccountStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static AccountStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
