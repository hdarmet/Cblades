package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum IllustrationPosition {
    LEFT("left"),
    CENTER("center"),
    RIGHT("right");

    String label;
    IllustrationPosition(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, IllustrationPosition> byLabels;
    public static Map<String, IllustrationPosition> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (IllustrationPosition type : IllustrationPosition.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
