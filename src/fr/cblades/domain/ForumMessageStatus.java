package fr.cblades.domain;

import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import java.util.HashMap;
import java.util.Map;

public enum ForumMessageStatus {
    LIVE("live"),
    ARCHIBED("arc"),
    BLOCKED("blk");

    String label;
    ForumMessageStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ForumMessageStatus> byLabels;
    public static Map<String, ForumMessageStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ForumMessageStatus type : ForumMessageStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
