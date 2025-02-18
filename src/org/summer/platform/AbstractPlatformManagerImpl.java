package org.summer.platform;

import org.summer.SummerException;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.logging.Logger;

public abstract class AbstractPlatformManagerImpl implements PlatformManager {
    static final Logger log = Logger.getLogger("summer");

    ScheduledExecutorService scheduledService = null;

    @Override
    public void doSetJobPoolSize(int poolSize) {
        assert(scheduledService==null);
        scheduledService = Executors.newScheduledThreadPool(poolSize);
    }

    Runnable getJobConsumer(Method jobMethod) {
        return () -> {
            log.info("Execute: " + jobMethod.getName());
            if (Modifier.isStatic(jobMethod.getModifiers())) {
                jobMethod.setAccessible(true);
                try {
                    jobMethod.invoke(null);
                } catch (Throwable e) {
                    log.severe("Unable to execute job method " + jobMethod.getName() + ": " + e);
                }
            } else {
                log.severe("Job method should be static: " + jobMethod.getName());
            }
        };
    }

    @Override
    public void doScheduleTaskAt(Method jobMethod, long time) {
        assert(scheduledService!=null);
        scheduledService.schedule(getJobConsumer(jobMethod), time-this.now(), TimeUnit.MILLISECONDS);
    }

    @Override
    public void doScheduleTask(Method jobMethod, long delay) {
        assert(scheduledService!=null);
        scheduledService.schedule(getJobConsumer(jobMethod), delay, TimeUnit.MILLISECONDS);
    }

    @Override
    public void doScheduleJob(Method jobMethod, long time, long delay) {
        assert(scheduledService!=null);
        scheduledService.scheduleAtFixedRate(getJobConsumer(jobMethod), time-this.now(), delay, TimeUnit.MILLISECONDS);
    }

}
