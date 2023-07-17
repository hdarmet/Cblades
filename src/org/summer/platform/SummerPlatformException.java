package org.summer.platform;

import org.summer.SummerException;

public class SummerPlatformException extends SummerException {
    public SummerPlatformException(String message, Throwable exception) {
        super(message, exception);
    }
}
