package org.summer;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Collection;
import java.util.Set;
import java.util.function.Consumer;
import java.util.logging.Logger;

import org.summer.annotation.Launch;
import org.summer.annotation.Setup;
import org.summer.controller.ControllerManager;
import org.summer.controller.ControllerManagerImpl;
import org.summer.data.DataManager;
import org.summer.data.DataManagerImpl;
import org.summer.security.SecurityManagerImpl;

public class ApplicationManagerImpl extends ApplicationManager {
	static final Logger log = Logger.getLogger("summer");

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
		summerMethods.stream().forEach(executeASetUpMethod);
		Collection<Method> appMethods = this.scanner.getMethodsAnnotatedBy(Setup.class);
		appMethods.stream().forEach(executeASetUpMethod);
		summerMethods = this.scanner.getSummerMethodsAnnotedBy(Launch.class);
		summerMethods.stream().forEach(executeASetUpMethod);
		appMethods = this.scanner.getMethodsAnnotatedBy(Launch.class);
		appMethods.stream().forEach(executeASetUpMethod);
	}


}
