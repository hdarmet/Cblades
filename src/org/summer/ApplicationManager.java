package org.summer;

import org.summer.controller.ControllerManager;
import org.summer.data.DataManager;
import org.summer.platform.PlatformManager;

public abstract class ApplicationManager {

	static ApplicationManager instance;
	
	public static ApplicationManager get() {
		return instance;
	}
	
	public synchronized static void set(ApplicationManager instance) {
		ApplicationManager.instance = instance;
	}
	
	public abstract void start();

	public abstract Scanner getScanner();
	
	public abstract Injector getInjector();

	public abstract DataManager getDataManager();
	
	public abstract org.summer.security.SecurityManager getSecurityManager();
	
	public abstract ControllerManager getControllerManager();

	public abstract PlatformManager getPlatformManager();
	public abstract ApplicationManager setPlatformManager(PlatformManager platformManager);
}
