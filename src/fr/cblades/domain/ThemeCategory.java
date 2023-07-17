package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum ThemeCategory {
    GAME("game"),
    LEGEND("legends"),
    EXAMPLES("examples");

    String label;
    ThemeCategory(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, ThemeCategory> byLabels;
    public static Map<String, ThemeCategory> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (ThemeCategory type : ThemeCategory.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static ThemeCategory byLabel(String label) {
        return byLabels().get(label);
    }

}
