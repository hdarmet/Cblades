package org.summer.data;

import java.util.Collection;
import java.util.Properties;
import java.util.logging.Logger;

import javax.persistence.Entity;
import javax.persistence.EntityManager;
import javax.persistence.OptimisticLockException;

import org.summer.ApplicationManager;
import org.summer.Scanner;
import org.summer.annotation.Profile;

public interface DataManager {
	static final Logger log = Logger.getLogger("summer");
	public static final String DEFAULT_PERSISTENCE_UNIT = "default";
	public static final int MAX_RETRIES = 4;

	public interface Executor {
		void run(EntityManager em);
	}

	public static void inTransaction(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransaction(persistenceUnitName, executor);
	}

	public static void inTransaction(Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransaction(executor);
	}

	public static void inReadTransaction(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInReadTransaction(persistenceUnitName, executor);
	}

	public static void inReadTransaction(Executor executor) {
		ApplicationManager.get().getDataManager().executeInReadTransaction(executor);
	}

	public static void inTransactionUntilSuccessful(Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransactionUntilSuccessful(executor);
	}

	public static void inTransactionUntilSuccessful(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransactionUntilSuccessful(persistenceUnitName, executor);
	}

	default void executeInTransactionUntilSuccessful(Executor executor) {
		boolean finished = false;
		int retries = 0;
		while (!finished && retries<DataManager.MAX_RETRIES) {
			try {
				ApplicationManager.get().getDataManager().executeInTransaction(executor);
				finished = true;
			} catch (OptimisticLockException ole) {
				retries++;
				log.warning("OptimisticLockException encountered. Retry.");
			}
		}
	}

	default void executeInTransactionUntilSuccessful(String persistenceUnitName, Executor executor) {
		boolean finished = false;
		int retries = 0;
		while (!finished && retries<DataManager.MAX_RETRIES) {
			try {
				ApplicationManager.get().getDataManager().executeInTransactionUntilSuccessful(persistenceUnitName, executor);
				finished = true;
			} catch (OptimisticLockException ole) {
				retries++;
				log.warning("OptimisticLockException encountered. Retry.");
			}
		}
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

	void executeInReadTransaction(String persistenceUnitName, Executor executor);

	void executeInReadTransaction(Executor executor);

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
	
	default Collection<Class<?>> getEntityClasses() {
		return Scanner.get().getClassesAnnotatedBy(Entity.class, Profile.class);
	}

}
