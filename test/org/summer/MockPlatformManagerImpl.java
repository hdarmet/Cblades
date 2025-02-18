package org.summer;

import org.summer.platform.PlatformManager;

import javax.mail.Message;
import javax.mail.Session;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

public class MockPlatformManagerImpl implements Mockable, PlatformManager {

    List<CallRecord> calls = new ArrayList<>();

    @Override
    public List<CallRecord> getCalls() {
        return this.calls;
    }

    @Override
    public void doScheduleTaskAt(Method jobMethod, long time) {
        throw new SummerTestException("Not yet implemented.");
    }

    @Override
    public void doScheduleTask(Method jobMethod, long delay) {
        throw new SummerTestException("Not yet implemented.");
    }

    @Override
    public void doScheduleJob(Method jobMethod, long time, long delay) {
        throw new SummerTestException("Not yet implemented.");
    }

    @Override
    public void doSetJobPoolSize(int poolSize) {
        throw new SummerTestException("Not yet implemented.");
    }

    @Override
    public InputStream getInputStream(String filePath) {
        try {
            return (InputStream) peekCall().invoke("getInputStream", new Object[] {filePath});
        } catch (Throwable e) {
            if (e instanceof RuntimeException)
                throw (RuntimeException)e;
            else
                throw new SummerTestException("Unexcepted exception :"+e.getMessage());
        }
    }

    @Override
    public OutputStream getOutputStream(String filePath) {
        try {
            return (OutputStream) peekCall().invoke("getOutputStream", new Object[] {filePath});
        } catch (Throwable e) {
            if (e instanceof RuntimeException)
                throw (RuntimeException)e;
            else
                throw new SummerTestException("Unexcepted exception :"+e.getMessage());
        }
    }

    @Override
    public Session getMailSession() {
        throw new SummerTestException("Not yet implemented.");
    }

    @Override
    public void sendMail(Session session, Message msg) {
        throw new SummerTestException("Not yet implemented.");
    }

    List<Float> randoms = new ArrayList<Float>();
    public MockPlatformManagerImpl addRandom(float value) {
        this.randoms.add(value);
        return this;
    }

    @Override
    public float random() {
        return this.randoms.remove(0);
    }

    long time;

    public MockPlatformManagerImpl setTime(long time) {
        this.time = time;
        return this;
    }

    @Override
    public Long now() {
        return this.time;
    }

}
