package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum MessageModelCategory {
    MESSAGE_AUTHOR("msga"),
    MESSAGE_REPORTER("msgr");

    String label;
    MessageModelCategory(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, MessageModelCategory> byLabels;
    public static Map<String, MessageModelCategory> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (MessageModelCategory type : MessageModelCategory.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static MessageModelCategory byLabel(String label) {
        return byLabels().get(label);
    }

}
