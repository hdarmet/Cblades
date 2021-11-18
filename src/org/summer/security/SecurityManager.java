package org.summer.security;

import org.summer.ApplicationManager;
import org.summer.security.SecurityManagerImpl.Finder;

public interface SecurityManager {
	
	public interface Executor {
		Object run(String subject);
	}

	public static Object ifConnected(Executor executor) {
		return ApplicationManager.get().getSecurityManager().executeIfConnected(executor);
	}
	
	public static Object ifAuthorized(Executor executor, String ... roles) {
		return ApplicationManager.get().getSecurityManager().executeIfAuthorized(executor, roles);
	}

	public static void connect(String user, long expire) {
		ApplicationManager.get().getSecurityManager().doConnect(user, expire);
	}

	public static void disconnect() {
		ApplicationManager.get().getSecurityManager().doDisconnect();
	}
	
	public static void setRolesFinder(Finder rolesFinder) {
		ApplicationManager.get().getSecurityManager().doSetRolesFinder(rolesFinder);
	}
	
	public static void setXsrfProtect(boolean xsrfProtect) {
		ApplicationManager.get().getSecurityManager().doSetXsrfProtect(xsrfProtect);
	}
	
	public static void setSecureHTTP(boolean secureHTTP) {
		ApplicationManager.get().getSecurityManager().doSetSecureHTTP(secureHTTP);
	}
	
	void doConnect(String user, long expire);
	
	void doDisconnect();
		
	Object executeIfConnected(Executor executor);
	
	Object executeIfAuthorized(Executor executor, String ... roles);
	
	void doSetRolesFinder(Finder rolesFinder);
    
	void doSetXsrfProtect(boolean xsrfProtect);
    
	void doSetSecureHTTP(boolean secureHTTP);
}
