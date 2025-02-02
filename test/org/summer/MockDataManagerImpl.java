package org.summer;

import org.summer.data.DataManager;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import java.lang.reflect.Proxy;
import java.util.*;

public class MockDataManagerImpl implements DataManager {

	public class Factory {
		EntityManagerFactory creator;
		public Class<?> jdbcDriverClass;
		public String jdbcUrl;
		public String user;
		public String password;
		public Properties properties;
		public Collection<Class<?>> entityClasses;

		Factory(EntityManagerFactory creator) {
			this.creator = creator;
		}

		Factory(
			EntityManagerFactory creator,
			Class<?> jdbcDriverClass,
			String jdbcUrl,
			String user,
			String password,
			Properties properties,
			Collection<Class<?>> entityClasses)
		{
			this.creator = creator;
			this.jdbcDriverClass = jdbcDriverClass;
			this.jdbcUrl = jdbcUrl;
			this.user = user;
			this.password = password;
			this.properties = properties;
			this.entityClasses = entityClasses;
		}
	}

	List<DataCallRecord> calls = new ArrayList<>();
	Collection<Class<?>> entityClasses = new ArrayList<>();
	Map<String, Factory> emFactories =  Collections.synchronizedMap(new HashMap<>());

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
        emFactories.put(persistenceUnitName, new Factory(
        	mockEntityManagerFactory(this),
			jdbcDriverClass, jdbcUrl,
			user, password, properties,
			entityClasses
		));
    }

    public void openPersistenceUnit(
           String persistenceUnitName)
    {
        emFactories.put(persistenceUnitName, new Factory(mockEntityManagerFactory(this)));
    }

    public Factory getFactory(String persistenceUnitName) {
		return emFactories.get(persistenceUnitName);
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
		EntityManagerFactory emf = emFactories.get(persistenceUnitName).creator;
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

	@Override
	public void executeInReadTransaction(String persistenceUnitName, Executor executor) {
		EntityManagerFactory emf = emFactories.get(persistenceUnitName).creator;
		if (emf==null) {
			throw new SummerException("Persistence unit not registered : "+persistenceUnitName);
		}
		EntityManager em = emf.createEntityManager();
		em.getTransaction().begin();
		try {
			executor.run(em);
		}
		finally {
			em.getTransaction().rollback();
			em.close();
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

	@Override
	public void executeInReadTransaction(Executor executor) {
		executeInReadTransaction(DataManager.DEFAULT_PERSISTENCE_UNIT, executor);
	}

	@Override
	public Collection<Class<?>> getEntityClasses() {
		return this.entityClasses;
	}

	public void getEntityClasses(Collection<Class<?>> classes) {
		this.entityClasses = classes;
	}

}
