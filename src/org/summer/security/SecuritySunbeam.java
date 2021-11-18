package org.summer.security;

import org.summer.security.SecurityManager.Executor;

public interface SecuritySunbeam {
	
	default Object ifConnected(Executor executor) {
		return SecurityManager.ifConnected(executor);
	}
	
	default Object ifAuthorized(Executor executor, String ... roles) {
		return SecurityManager.ifAuthorized(executor, roles);
	}
	
	default void connect(String user, long expire) {
		SecurityManager.connect(user, expire);
	}

	default void disconnect() {
		SecurityManager.disconnect();
	}

}
