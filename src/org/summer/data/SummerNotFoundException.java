package org.summer.data;

import org.summer.SummerException;

public class SummerNotFoundException extends SummerException {

    public SummerNotFoundException(String message, Object ... values) {
        super(String.format(message, values));
    }

}
