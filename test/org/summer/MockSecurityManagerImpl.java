package org.summer;

import org.summer.controller.SummerControllerException;
import org.summer.security.SecurityManager;
import org.summer.security.SecurityManagerImpl.Finder;

import java.util.*;

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

	}
	
	Map<String, Credential> credentials = new HashMap<>();
	Credential connection = null;
	
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
	public Object executeIfConnected(Executor executor) {
		if (connection!=null) {
			return executor.run(connection.id);
		}
		else throw new SummerControllerException(403, "Not connected");
	}

	@Override
	public Object executeIfAuthorized(Executor executor, String... roles) {
		if (connection!=null) {
			boolean authorized = false;
			for (String role : roles) {
				if (connection.roles.contains(role)) {
					authorized = true;
				}
			}
			if (authorized) {
				return executor.run(connection.id);
			}
			else throw new SummerControllerException(403, "Not authorized");
		}
		else throw new SummerControllerException(403, "Not connected");
	}

	@Override
	public void doSetRolesFinder(Finder rolesFinder) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void doSetXsrfProtect(boolean xsrfProtect) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void doSetSecureHTTP(boolean secureHTTP) {
		// TODO Auto-generated method stub
		
	}

}
