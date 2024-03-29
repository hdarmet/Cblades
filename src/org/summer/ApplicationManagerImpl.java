package org.summer;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Collection;
import java.util.Comparator;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.function.Consumer;
import java.util.logging.Logger;

import org.summer.annotation.Job;
import org.summer.annotation.Launch;
import org.summer.annotation.Setup;
import org.summer.controller.ControllerManager;
import org.summer.controller.ControllerManagerImpl;
import org.summer.data.DataManager;
import org.summer.data.DataManagerImpl;
import org.summer.platform.PlatformManager;
import org.summer.security.SecurityManagerImpl;

public class ApplicationManagerImpl extends ApplicationManager {
	static final Logger log = Logger.getLogger("summer");

	ScheduledExecutorService jobService = Executors.newScheduledThreadPool(4);

	public ApplicationManagerImpl(String rootForLookup, Set<String> profiles) {
		setScanner(new ScannerImpl(rootForLookup, profiles));
	}

	@Override
	public void start() {
		setInjector(new InjectorImpl());
		setControllerManager(new ControllerManagerImpl());
		setDataManager(new DataManagerImpl());
		setSecurityManager(new SecurityManagerImpl());
		getControllerManager().installControllers();
		invokeSetupMethods();
		invokeJobsMethods();
	}

	Scanner scanner;
	
	@Override
	public Scanner getScanner() {
		return this.scanner;
	}
	
	public ApplicationManagerImpl setScanner(Scanner scanner) {
		this.scanner = scanner;
		return this;
	}
	
	Injector injector;
	
	@Override
	public Injector getInjector() {
		return this.injector;
	}
	
	public ApplicationManagerImpl setInjector(Injector injector) {
		this.injector = injector;
		return this;
	}

	DataManager dataManager;
	
	@Override
	public DataManager getDataManager() {
		return this.dataManager;
	}
	
	public ApplicationManagerImpl setDataManager(DataManager dataManager) {
		this.dataManager = dataManager;
		return this;
	}
	
	org.summer.security.SecurityManager securityManager;
	
	@Override
	public org.summer.security.SecurityManager getSecurityManager() {
		return this.securityManager;
	}
	
	public ApplicationManagerImpl setSecurityManager(org.summer.security.SecurityManager securityManager) {
		this.securityManager = securityManager;
		return this;
	}

	ControllerManager controllerManager;
	
	@Override
	public ControllerManager getControllerManager() {
		return this.controllerManager;
	}
	
	public ApplicationManagerImpl setControllerManager(ControllerManager controllerManager) {
		this.controllerManager = controllerManager;
		return this;
	}
	
	void invokeSetupMethods() {
		Consumer<Method> executeASetUpMethod = setupMethod->{
			log.info("Execute: "+setupMethod.getName());
			if ((setupMethod.getModifiers()|Modifier.STATIC)!=0) {
				setupMethod.setAccessible(true);
				try {
					setupMethod.invoke(null);
				} catch (InvocationTargetException | IllegalAccessException e) {
					throw new SummerException("Unable to execute setup method : "+setupMethod, e);
				}
			}
			else throw new SummerException("Setup method must be static : "+setupMethod);
		}; 
		Collection<Method> summerMethods = this.scanner.getSummerMethodsAnnotedBy(Setup.class);
		summerMethods.stream()
			.sorted(Comparator.comparingInt(m -> m.getDeclaredAnnotation(Setup.class).order())
		).forEach(executeASetUpMethod);
		Collection<Method> appMethods = this.scanner.getMethodsAnnotatedBy(Setup.class);
		appMethods.stream()
			.sorted(Comparator.comparingInt(m -> m.getDeclaredAnnotation(Setup.class).order())
		).forEach(executeASetUpMethod);
		summerMethods = this.scanner.getSummerMethodsAnnotedBy(Launch.class);
		summerMethods.stream()
			.sorted(Comparator.comparingInt(m -> m.getDeclaredAnnotation(Launch.class).order())
		).forEach(executeASetUpMethod);
		appMethods = this.scanner.getMethodsAnnotatedBy(Launch.class);
		appMethods.stream()
			.sorted(Comparator.comparingInt(m -> m.getDeclaredAnnotation(Launch.class).order())
		).forEach(executeASetUpMethod);
	}

	void invokeJobsMethods() {
		Consumer<Method> scheduleAJob = jobMethod->{
			log.info("Schedule: "+jobMethod.getName());
			Job jobAnnotation = jobMethod.getAnnotation(Job.class);
			PlatformManager.scheduleJob(jobMethod, 0, jobAnnotation.frequency());
		};
		Collection<Method> summerMethods = this.scanner.getSummerMethodsAnnotedBy(Job.class);
		summerMethods.stream().forEach(scheduleAJob);
		Collection<Method> appMethods = this.scanner.getMethodsAnnotatedBy(Job.class);
		appMethods.stream().forEach(scheduleAJob);
	}

	PlatformManager platformManager;

	@Override
	public PlatformManager getPlatformManager() {
		return this.platformManager;
	}

	@Override
	public ApplicationManagerImpl setPlatformManager(PlatformManager platformManager) {
		this.platformManager = platformManager;
		return this;
	}

}
