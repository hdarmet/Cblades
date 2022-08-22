package org.summer.platform;

import org.summer.SummerException;

import java.io.*;

public class LocalPlatformManagerImpl implements PlatformManager  {

    String basePath;

    public LocalPlatformManagerImpl(String basePath) {
        this.basePath = basePath;
    }

    @Override
    public InputStream getInputStream(String filePath) {
        try {
            return new FileInputStream(basePath + filePath);
        }
        catch (FileNotFoundException fnfe) {
            throw new SummerException(String.format("File %s", basePath + filePath));
        }
    }

    @Override
    public OutputStream getOutputStream(String filePath) {
        try {
            return new FileOutputStream(basePath + filePath);
        }
        catch (FileNotFoundException fnfe) {
            throw new SummerException(String.format("File %s", basePath + filePath));
        }
    }
}
