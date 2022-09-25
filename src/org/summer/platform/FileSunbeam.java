package org.summer.platform;

import org.summer.SummerException;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;

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
