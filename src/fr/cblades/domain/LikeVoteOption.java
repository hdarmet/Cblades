package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum LikeVoteOption {
    NONE("N"),
    LIKE("L"),
    DISLIKE("D");

    String label;
    LikeVoteOption(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, LikeVoteOption> byLabels;
    public static Map<String, LikeVoteOption> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (LikeVoteOption type : LikeVoteOption.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
