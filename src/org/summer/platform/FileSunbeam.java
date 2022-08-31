package org.summer.platform;

import org.summer.SummerException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public interface FileSunbeam {

    default void copyStream(InputStream source, OutputStream target) {
        try {
            byte[] buf = new byte[8192];
            int length;
            while ((length = source.read(buf)) != -1) {
                target.write(buf, 0, length);
            }
            source.close();
            target.close();
        }
        catch (IOException ioe) {
            throw new SummerPlatformException("IOException while copying streams.", ioe);
        }
    }

}
