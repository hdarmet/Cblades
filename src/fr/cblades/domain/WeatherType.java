package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;


public enum WeatherType {
    HOT("H"),
    CLEAR("C"),
    CLOUDY("N"),
    OVERCAST("O"),
    RAIN("R"),
    STORM("S");

    String label;
    WeatherType(String label) {
        this.label = label;
    };

    public String getLabel() {
        return this.label;
    }

    static Map<String, WeatherType> byLabels;
    public static Map<String, WeatherType> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (WeatherType type : WeatherType.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static WeatherType byLabel(String label) {
        return byLabels().get(label);
    }

}
