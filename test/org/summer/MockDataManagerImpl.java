package org.summer;

import org.summer.data.DataManager;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import java.lang.reflect.Proxy;
import java.util.*;

public class MockDataManagerImpl implements Mockable, DataManager {

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

	List<CallRecord> calls = new ArrayList<>();

	@Override
	public List<CallRecord> getCalls() {
		return this.calls;
	}

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
