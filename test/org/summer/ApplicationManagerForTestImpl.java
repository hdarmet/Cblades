package org.summer;

import org.summer.controller.ControllerManager;
import org.summer.data.DataManager;
import org.summer.platform.PlatformManager;

import java.io.*;

public class ApplicationManagerForTestImpl extends ApplicationManager {

	Injector injector = new InjectorForTest();

	DataManager dataManager = new MockDataManagerImpl();
	PlatformManager platformManager;
	org.summer.security.SecurityManager securityManager = new MockSecurityManagerImpl();

	@Override
	public Scanner getScanner() {
		return null;
	}
	
	@Override
	public void start() {}

	@Override
	public Injector getInjector() {
		return injector;
	}

	@Override
	public DataManager getDataManager() {
		return this.dataManager;
	}

	@Override
	public org.summer.security.SecurityManager getSecurityManager() {
		return this.securityManager;
	}
	
	@Override
	public ControllerManager getControllerManager() {
		return null;
	}

	@Override
	public PlatformManager getPlatformManager() {
		return this.platformManager;
	}

	@Override
	public ApplicationManager setPlatformManager(PlatformManager platformManager) {
		this.platformManager = platformManager;
		return this;
	}

	public ApplicationManagerForTestImpl setDataManager(DataManager dataManager) {
		this.dataManager = dataManager;
		return this;
	}
	
	public ApplicationManagerForTestImpl setInjector(Injector injector) {
		this.injector = injector;
		return this;
	}

}
