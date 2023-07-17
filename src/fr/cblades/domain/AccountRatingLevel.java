package fr.cblades.domain;

import java.util.HashMap;
import java.util.Map;

public enum AccountRatingLevel {
    SQUIRE("Squire", 0, 99),
    KNIGHT("Knight", 100, 299),
    LORD("Lord", 300, 599),
    BANNER_LORD("Banner Lord", 600, 999),
    EARL("Earl", 1000, 1499),
    DUKE("Duke", 1500, 1999),
    KING("King", 2000, 2999),
    EMPEROR("Emperor", 3000, Integer.MAX_VALUE);

    String label;
    int minRating, maxRating;

    AccountRatingLevel(String label, int minRatin, int maxRating) {
        this.label = label;
        this.minRating = minRatin;
        this.maxRating = maxRating;
    };

    public String getLabel() {
        return this.label;
    }
    public int getMinRating() {
        return this.minRating;
    }
    public int getMaxRating() {
        return this.maxRating;
    }

    static Map<String, AccountRatingLevel> byLabels;
    public static Map<String, AccountRatingLevel> byLabels() {
        if (byLabels==null) {
            byLabels = new HashMap<>();
            for (AccountRatingLevel type : AccountRatingLevel.values()) {
                byLabels.put(type.getLabel(), type);
            }
        }
        return byLabels;
    }

    public static AccountRatingLevel byLabel(String label) {
        return byLabels().get(label);
    }

}
