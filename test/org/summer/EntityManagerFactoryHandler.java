package org.summer;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class EntityManagerFactoryHandler implements InvocationHandler {

	static Method createEntityManagerMethod = TestUtils.getMethod(EntityManagerFactory.class, "createEntityManager");
			
	MockDataManagerImpl manager;
	
	private EntityManager mockEntityManager(MockDataManagerImpl manager) {
		EntityManagerHandler handler = new EntityManagerHandler(manager);
	    return (EntityManager)Proxy.newProxyInstance(
	    	EntityManager.class.getClassLoader(),
	    	new Class[] {EntityManager.class},
	    	handler);
	}
	
	public EntityManagerFactoryHandler(MockDataManagerImpl manager) {
		this.manager = manager;
	}
	
	public Object invoke(Object proxy, Method method, Object[] args) {
        if (method.equals(createEntityManagerMethod)) {
        	return mockEntityManager(manager);
        }
        else throw new SummerTestException(method+" not supported yet");
    }
}

