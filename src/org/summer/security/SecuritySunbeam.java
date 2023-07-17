package org.summer.security;

import org.summer.security.SecurityManager.Executor;

import java.util.function.BiPredicate;

public interface SecuritySunbeam {
	
	default void ifConnected(Executor executor) {
		SecurityManager.ifConnected(executor);
	}

	default void ifAuthorized(Executor executor, BiPredicate<String, String[]> verifier) {
		SecurityManager.ifAuthorized(executor, verifier);
	}

	default void ifAuthorized(Executor executor, String ... roles) {
		SecurityManager.ifAuthorized(executor, roles);
	}
	
	default void connect(String user, long expire) {
		SecurityManager.connect(user, expire);
	}

	default void disconnect() {
		SecurityManager.disconnect();
	}

	default boolean hasRole(String user, String[] roles) {
		return SecurityManager.hasRole(user, roles);
	}

}
