package org.summer.util;

import java.util.regex.Pattern;

public class StringReplacer {

    public static String replace(String string, String ... replacements) {
        for (int index=0; index<replacements.length; index+=2) {
            string = string.replaceAll("(?i)"+ Pattern.quote(replacements[index]), replacements[index+1]);
        }
        return string;
    }

}
