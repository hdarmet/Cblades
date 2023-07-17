package org.summer.security;

import org.summer.ApplicationManager;
import org.summer.security.SecurityManagerImpl.Finder;

import java.util.function.BiPredicate;
import java.util.function.Consumer;

public interface SecurityManager {
	
	public interface Executor {
		void run(String subject);
	}

	public static void ifConnected(Executor executor) {
		ApplicationManager.get().getSecurityManager().executeIfConnected(executor);
	}

	public static void ifAuthorized(Executor executor, BiPredicate<String, String[]> verifier) {
		ApplicationManager.get().getSecurityManager().executeIfAuthorized(executor, verifier);
	}

	public static void ifAuthorized(Executor executor, String ... roles) {
		ApplicationManager.get().getSecurityManager().executeIfAuthorized(executor, roles);
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

	public static boolean hasRole(String user, String[] roles) {
		return ApplicationManager.get().getSecurityManager().lookForRole(user, roles);
	}

	void doConnect(String user, long expire);
	
	void doDisconnect();
		
	void executeIfConnected(Executor executor);

	boolean lookForRole(String user, String[] roles);

	void executeIfAuthorized(Executor executor, BiPredicate<String, String[]> verifier);

	void executeIfAuthorized(Executor executor, String ... roles);
	
	void doSetRolesFinder(Finder rolesFinder);
    
	void doSetXsrfProtect(boolean xsrfProtect);
    
	void doSetSecureHTTP(boolean secureHTTP);
}
