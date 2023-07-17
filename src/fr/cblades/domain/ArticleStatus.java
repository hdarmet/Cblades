package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ArticleStatus {
    LIVE("live"),
    PENDING("pnd"),
    PROPOSED("prp");

    String label;
    ArticleStatus(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ArticleStatus> byLabels;
    public static Map<String, ArticleStatus> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ArticleStatus type : ArticleStatus.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static ArticleStatus byLabel(String label) {
        return byLabels().get(label);
    }

}
