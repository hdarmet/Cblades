package org.summer;

import org.summer.data.DataManager;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import java.lang.reflect.Proxy;
import java.util.*;
import java.util.function.Consumer;

public class MockDataManagerImpl implements DataManager {

	List<DataCallRecord> calls = new ArrayList<>();
	Map<String, EntityManagerFactory> emFactories = 
			Collections.synchronizedMap(new HashMap<String, EntityManagerFactory>());

	@Override
    public void openPersistenceUnit(
            String persistenceUnitName,
            Class<?> jdbcDriverClass,
            String jdbcUrl,
            String user,
            String password,
            Properties properties,
            Collection<Class<?>> entityClasses)
    {
        emFactories.put(persistenceUnitName, mockEntityManagerFactory(this));
    }

    public void openPersistenceUnit(
           String persistenceUnitName)
    {
        emFactories.put(persistenceUnitName, mockEntityManagerFactory(this));
    }

    public void register(
    	String functionName,
    	Object returnValue,
    	Throwable exception,
		Object ... parameters)
    {
        calls.add(new DataCallRecord(functionName, returnValue, exception, parameters));
    }

    public DataCallRecord expects(String functionName) {
    	DataCallRecord record = new DataCallRecord(functionName, null, null, null);
        calls.add(record);
        return record;
    }

    public void hasFinished() {
        if (!calls.isEmpty()) throw new SummerTestException("Data request(s) still pending");
    }

    public void clear() {
        calls.clear();
    }

	@Override
	public void executeInTransaction(String persistenceUnitName, Executor executor) {
		EntityManagerFactory emf = emFactories.get(persistenceUnitName);
		if (emf==null) {
			throw new SummerException("Persistence unit not registered : "+persistenceUnitName);
		}
		EntityManager em = emf.createEntityManager();
		em.getTransaction().begin();
		boolean success = false;
		try {
			executor.run(em);
			em.getTransaction().commit();
			success = true;
		}
		finally {
			if (success) {
				em.close();
			}
			else {
				try {
					em.getTransaction().rollback();
				}
				catch (IllegalStateException e) {
				}
				finally {
					em.close();
				}
			}
		}
	}

	private EntityManagerFactory mockEntityManagerFactory(MockDataManagerImpl manager) {
	    return (EntityManagerFactory)Proxy.newProxyInstance(
	            EntityManagerFactory.class.getClassLoader(),
	            new Class[] {EntityManagerFactory.class},
	            new EntityManagerFactoryHandler(manager)
	    );
	}
	
	@Override
	public void executeInTransaction(Executor executor) {
		executeInTransaction(DataManager.DEFAULT_PERSISTENCE_UNIT, executor);
	}


}
