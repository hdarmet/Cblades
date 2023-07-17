package org.summer.data;

import java.beans.PropertyVetoException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.stream.Collectors;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.spi.PersistenceUnitInfo;
import javax.sql.DataSource;

import org.hibernate.jpa.boot.internal.EntityManagerFactoryBuilderImpl;
import org.hibernate.jpa.boot.internal.PersistenceUnitInfoDescriptor;
import org.summer.SummerException;

import com.mchange.v2.c3p0.ComboPooledDataSource;

public class DataManagerImpl implements DataManager {
	
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

	@Override
	public void executeInReadTransaction(String persistenceUnitName, Executor executor) {
		EntityManagerFactory emf = emFactories.get(persistenceUnitName);
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

	@Override
	public void executeInTransaction(Executor executor) {
		executeInTransaction(DataManager.DEFAULT_PERSISTENCE_UNIT, executor);
	}

	@Override
	public void executeInReadTransaction(Executor executor) {
		executeInReadTransaction(DataManager.DEFAULT_PERSISTENCE_UNIT, executor);
	}

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
		ComboPooledDataSource cpds = new ComboPooledDataSource();
		try {
			cpds.setDriverClass(jdbcDriverClass.getName());
		} catch (PropertyVetoException e) {
			throw new SummerException("Unexpected exception, probably a bug ", e);
		}
		cpds.setJdbcUrl(jdbcUrl);
		if (user!=null) {
			cpds.setUser(user);       
		}
		if (password!=null) {
			cpds.setPassword(password);  
		}
	    EntityManagerFactory emf = createEntityManagerFactory(
				persistenceUnitName, 
				properties,
				entityClasses.stream().map(entityClass->entityClass.getName())
					.collect(Collectors.toList()), 
				cpds);
	    emFactories.put(persistenceUnitName, emf);
	}
	
	protected EntityManagerFactory createEntityManagerFactory(
			String persistenceUnitName,
			Properties properties,
			Collection<String> fileNames,
			DataSource dataSource) 
	{		
	    PersistenceUnitInfo persistenceUnitInfo = 
	        PersistenceUnitInfoImpl.newNonJTAPersistenceUnitInfo(
	        	persistenceUnitName, 
	        	new ArrayList<String>(fileNames), 
	        	properties, 
	        	dataSource);
	    Map<String, Object> configuration = new HashMap<>();
	    return new EntityManagerFactoryBuilderImpl(
	            new PersistenceUnitInfoDescriptor(
	                persistenceUnitInfo), configuration
	    ).build();
	}

}
