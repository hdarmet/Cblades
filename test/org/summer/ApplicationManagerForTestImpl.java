package org.summer;

import org.summer.controller.ControllerManager;
import org.summer.data.DataManager;

public class ApplicationManagerForTestImpl extends ApplicationManager {

	Injector injector = new InjectorForTest();

	DataManager dataManager = new MockDataManagerImpl();
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

	public ApplicationManagerForTestImpl setDataManager(DataManager dataManager) {
		this.dataManager = dataManager;
		return this;
	}
	
	public ApplicationManagerForTestImpl setInjector(Injector injector) {
		this.injector = injector;
		return this;
	}

}
