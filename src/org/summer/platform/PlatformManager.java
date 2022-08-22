package org.summer.platform;

import org.summer.ApplicationManager;

import java.io.InputStream;
import java.io.OutputStream;

public abstract interface PlatformManager {

    public static PlatformManager get() {
        return ApplicationManager.get().getPlatformManager();
    }

    public InputStream getInputStream(String filePath);

    public OutputStream getOutputStream(String filePath);

}
