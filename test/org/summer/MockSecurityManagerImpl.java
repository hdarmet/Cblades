package org.summer;

import org.summer.controller.SummerControllerException;
import org.summer.security.SecurityManager;
import org.summer.security.SecurityManagerImpl;
import org.summer.security.SecurityManagerImpl.Finder;

import java.util.*;
import java.util.function.BiPredicate;

public class MockSecurityManagerImpl implements SecurityManager {

	public static class Credential {
		public Credential(
			String id,
			String password,
			String... roles) {
			this.id = id;
			this.password = password;
			this.roles = new HashSet<String>(Arrays.asList(roles));
		}

		String id;
		String password;
		Set<String> roles;

		public String getId() {
			return this.id;
		}

		public String getPassword() {
			return this.password;
		}

		public Collection<String> getRoles() {
			return this.roles;
		}

		public String[] getRolesArray() {
			String[] roles = new String[this.roles.size()];
			return this.roles.toArray(roles);
		}
	}
	
	Map<String, Credential> credentials = new HashMap<>();
	Credential connection = null;
	public Finder rolesFinder;
	public boolean xsrfProtect;
	public boolean secureHTTP;

	public MockSecurityManagerImpl register(Credential credential) {
		credentials.put(credential.id, credential);
		return this;
	}

	public Credential getConnection() {
		return this.connection;
	}

	@Override
	public void doConnect(String user, long expire) {
		connection = credentials.get(user);
		if (connection==null) {
			throw new NullPointerException("User not defined.");
		}
	}

	@Override
	public void doDisconnect() {
		connection = null;
	}

	@Override
	public void executeIfConnected(Executor executor) {
		if (connection!=null) {
			executor.run(connection.id);
		}
		else throw new SummerControllerException(403, "Not connected");
	}

	@Override
	public boolean lookForRole(String user, String[] roles) {
		if (connection!=null) {
			if (roles.length==0) return true;
			for (String role : roles) {
				if (connection.roles.contains(role)) {
					return true;
				}
			}
		}
		return false;
	}

	@Override
	public void executeIfAuthorized(Executor executor, String... roles) {
		if (connection!=null) {
			if (lookForRole(connection.id, roles)) {
				executor.run(connection.id);
			}
			else throw new SummerControllerException(403, "Not authorized");
		}
		else throw new SummerControllerException(403, "Not connected");
	}

	@Override
	public void executeIfAuthorized(Executor executor, BiPredicate<String, String[]> verifier) {
		if (connection!=null) {
			if (verifier.test(connection.id, connection.getRolesArray())) {
				executor.run(connection.id);
			}
			else throw new SummerControllerException(403, "Not authorized");
		}
		else throw new SummerControllerException(403, "Not connected");
	}

	@Override
	public void doSetRolesFinder(Finder rolesFinder) {
		this.rolesFinder = rolesFinder;
	}

	@Override
	public void doSetXsrfProtect(boolean xsrfProtect) {
		this.xsrfProtect = xsrfProtect;
	}

	@Override
	public void doSetSecureHTTP(boolean secureHTTP) {
		this.secureHTTP = secureHTTP;
	}

}
