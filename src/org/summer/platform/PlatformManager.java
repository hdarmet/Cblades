package org.summer.platform;

import org.summer.ApplicationManager;

import javax.mail.Message;
import javax.mail.Session;
import javax.mail.internet.MimeMessage;
import java.io.InputStream;
import java.io.OutputStream;

public interface PlatformManager {

    static PlatformManager get() {
        return ApplicationManager.get().getPlatformManager();
    }

    InputStream getInputStream(String filePath);

    OutputStream getOutputStream(String filePath);

    Session getMailSession();

    void sendMail(Session session, Message msg);
}
