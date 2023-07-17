package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum OrderInstruction {
    ATTACK("A"),
    DEFEND("D"),
    REGROUP("G"),
    RETREAT("R");

    String label;
    OrderInstruction(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, OrderInstruction> byLabels;
    public static Map<String, OrderInstruction> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (OrderInstruction type : OrderInstruction.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

}
