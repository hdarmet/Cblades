package org.summer.data;

import java.util.Collection;
import java.util.Properties;

import javax.persistence.Entity;
import javax.persistence.EntityManager;

import org.summer.ApplicationManager;
import org.summer.Scanner;
import org.summer.annotation.Profile;

public interface DataManager {
	public static final String DEFAULT_PERSISTENCE_UNIT = "default";

	public interface Executor {
		void run(EntityManager em);
	}

	public static void inTransaction(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransaction(persistenceUnitName, executor);
	}

	public static void inTransaction(Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransaction(executor);
	}

	public static void declarePersistenceUnit(
			String persistenceUnitName,
			Class<?> jdbcDriverClass,
			String jdbcUrl,
			String user,
			String password,
			Properties properties,
			Collection<Class<?>> entityClasses) 
	{
		ApplicationManager.get().getDataManager().openPersistenceUnit(
			persistenceUnitName, 
			jdbcDriverClass, 
			jdbcUrl, user, password, 
			properties, 
			entityClasses);
	}

	void executeInTransaction(String persistenceUnitName, Executor executor);

	void executeInTransaction(Executor executor);

	void openPersistenceUnit(
			String persistenceUnitName,
			Class<?> jdbcDriverClass,
			String jdbcUrl,
			String user,
			String password,
			Properties properties,
			Collection<Class<?>> entityClasses);
	
	public static DataManager get() {
		return ApplicationManager.get().getDataManager();
	}
	
	public static Collection<Class<?>> getEntityClasses() {
		return Scanner.get().getClassesAnnotatedBy(Entity.class, Profile.class);
	}
}
