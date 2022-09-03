package org.summer.platform;

import org.summer.ApplicationManager;

import javax.mail.Message;
import javax.mail.Session;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Date;
import java.util.Random;

public interface PlatformManager {

    static PlatformManager get() {
        return ApplicationManager.get().getPlatformManager();
    }

    InputStream getInputStream(String filePath);

    OutputStream getOutputStream(String filePath);

    Session getMailSession();

    void sendMail(Session session, Message msg);

    default float random() {
        return new SecureRandom().nextFloat();
    }

    default Long now() {
        return System.currentTimeMillis();
    }

}
