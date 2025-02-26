package org.summer.platform;

import org.summer.ApplicationManager;

import javax.mail.Message;
import javax.mail.Session;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.security.SecureRandom;
import java.util.Date;
import java.util.Properties;
import java.util.function.Consumer;

public interface PlatformManager {

    static PlatformManager get() {
        return ApplicationManager.get().getPlatformManager();
    }

    static void setJobPoolSize(int poolSize) {
        get().doSetJobPoolSize(poolSize);
    }

    static void scheduleTaskAt(Method jobMethod, long time) {
        get().doScheduleTaskAt(jobMethod, time);
    }

    void doScheduleTaskAt(Method jobMethod, long time);

    static void scheduleTask(Method jobMethod, long delay) {
        get().doScheduleTask(jobMethod, delay);
    }

    void doScheduleTask(Method jobMethod, long delay);

    static void scheduleJob(Method jobMethod, long time, long delay) {
        get().doScheduleJob(jobMethod, time, delay);
    }

    void doScheduleJob(Method jobMethod, long time, long delay);

    void doSetJobPoolSize(int poolSize);

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

    default Date today() { return new Date(); }

}
