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

/**
 * Interface de service du composant d'accès à la base de données. Elle est, pour l'essentiel, composée
 * d'une serie de méthodes nommées "inTransaction" qui exécutent une snippet en lui injectant un
 * EntityManager (en paramètre):
 * <code>
 *     inTransaction(em->{<br>
 *     ...<br>
 * 	   Account author = Account.find(em, 101L);<br>
 * 	   ...<br>
 * 	   });<br>
 * </code>
 * Noter que toutes les méthodes inTransaction ont une forme statique et une forme metode d'instance. Cela permet
 * d'accéder à la base de données quelque soit le contexte.
 * Trois logique sont proposées:
 * <ul>
 *     <li> une logique standard, ou la transaction ouverte est validée (commit) ou annulée (rollback) selon que
 *     l'exécution de la snippet arrive à son terme ou non.</li>
 *     <li> une logique "lecture seulement", ou la transaction ouverte est systématiquement annulée (rollback) afin de
 *     s'assurer que la base de données ne sera pas impactée.</li>
 *     <li> une logique de tentatives multiples, qui fonctionne comme la logique standard, mais qui en cas d'échec du
 *     à un vérrouillage optimiste ré-éxecute la snippet. Cela permet de limiter fortement le nombre d'échecs</li>
 * </ul>
 */
public interface DataManager {
	static final Logger log = Logger.getLogger("summer");
	public static final String DEFAULT_PERSISTENCE_UNIT = "default";
	public static final int MAX_RETRIES = 4;

	/**
	 * Interface fonctionnelle qu'implémentent les snippets exécutées par les différentes méthodes
	 * inTransaction
	 */
	public interface Executor {
		void run(EntityManager em);
	}

	/**
	 * Exécute une snippet au sein d'une transaction (en précisant le nom de l'unité de persistence utilisée). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée.
	 * @param persistenceUnitName nom de l'unité de persistance à utiliser
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	static void inTransaction(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransaction(persistenceUnitName, executor);
	}

	/**
	 * Exécute une snippet au sein d'une transaction (en utilisant l'unité de persistence par défaut). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée.
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	static void inTransaction(Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransaction(executor);
	}

	/**
	 * Exécute une snippet au sein d'une transaction (en précisant le nom de l'unité de persistence utilisée). Cette
	 * transaction sera systématiquement annulée (rollback) afin de s'assurer que la base de données ne sera pas
	 * impactée.
	 * @param persistenceUnitName nom de l'unité de persistance à utiliser
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	static void inReadTransaction(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInReadTransaction(persistenceUnitName, executor);
	}

	/**
	 * Exécute une snippet au sein d'une transaction (en utilisant l'unité de persistence par défaut). Cette
	 * transaction sera systématiquement annulée (rollback) afin de s'assurer que la base de données ne sera pas
	 * impactée.
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	static void inReadTransaction(Executor executor) {
		ApplicationManager.get().getDataManager().executeInReadTransaction(executor);
	}

	/**
	 * Exécute une snippet au sein d'une transaction (en précisant le nom de l'unité de persistence utilisée). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée. Si l'erreur est due à un verrouillage optimiste, la snippet est automatiquement
	 * rééxécutée (jusqu'à 4 tentatives).
	 * @param persistenceUnitName nom de l'unité de persistance à utiliser
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	static void inTransactionUntilSuccessful(String persistenceUnitName, Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransactionUntilSuccessful(persistenceUnitName, executor);
	}

	/**
	 * Exécute une snippet au sein d'une transaction (en utilisant l'unité de persistence par défaut). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée. Si l'erreur est due à un verrouillage optimiste, la snippet est automatiquement
	 * rééxécutée (jusqu'à 4 tentatives).
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	static void inTransactionUntilSuccessful(Executor executor) {
		ApplicationManager.get().getDataManager().executeInTransactionUntilSuccessful(executor);
	}

	/**
	 * Ouvre une unité de persistence JPA.
	 * @param persistenceUnitName nom de l'unité de persistence
	 * @param jdbcDriverClass classe du driver JDBC permettant d'accéder à la base de données
	 * @param jdbcUrl URL d'accès à la base de données
	 * @param user identification de la connexion à la base de données
	 * @param password mots de passe associé
	 * @param properties propriétés non standard à transmettre au driver lors de la connexion
	 * @param entityClasses liste des classes des entitées JPA persistées par cette unité
	 */
	static void declarePersistenceUnit(
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

	/**
	 * Exécute une snippet au sein d'une transaction (en précisant le nom de l'unité de persistence utilisée). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée.
	 * @param persistenceUnitName nom de l'unité de persistance à utiliser
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	void executeInTransaction(String persistenceUnitName, Executor executor);

	/**
	 * Exécute une snippet au sein d'une transaction (en utilisant l'unité de persistence par défaut). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée.
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	void executeInTransaction(Executor executor);

	/**
	 * Exécute une snippet au sein d'une transaction (en précisant le nom de l'unité de persistence utilisée). Cette
	 * transaction sera systématiquement annulée (rollback) afin de s'assurer que la base de données ne sera pas
	 * impactée.
	 * @param persistenceUnitName nom de l'unité de persistance à utiliser
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	void executeInReadTransaction(String persistenceUnitName, Executor executor);

	/**
	 * Exécute une snippet au sein d'une transaction (en utilisant l'unité de persistence par défaut). Cette
	 * transaction sera systématiquement annulée (rollback) afin de s'assurer que la base de données ne sera pas
	 * impactée.
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
	void executeInReadTransaction(Executor executor);

	/**
	 * Exécute une snippet au sein d'une transaction (en précisant le nom de l'unité de persistence utilisée). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée. Si l'erreur est due à un verrouillage optimiste, la snippet est automatiquement
	 * rééxécutée (jusqu'à 4 tentatives).
	 * @param persistenceUnitName nom de l'unité de persistance à utiliser
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
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

	/**
	 * Exécute une snippet au sein d'une transaction (en utilisant l'unité de persistence par défaut). Cette
	 * transaction sera validée (commit) si l'exécution de la snippet arrive à son terme et annulée (rollback) lorsqu'
	 * une exception est levée. Si l'erreur est due à un verrouillage optimiste, la snippet est automatiquement
	 * rééxécutée (jusqu'à 4 tentatives).
	 * @param executor snippet à exécuter au sein de la transaction.
	 */
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

	/**
	 * Ouvre une unité de persistence JPA.
	 * @param persistenceUnitName nom de l'unité de persistence
	 * @param jdbcDriverClass classe du driver JDBC permettant d'accéder à la base de données
	 * @param jdbcUrl URL d'accès à la base de données
	 * @param user identification de la connexion à la base de données
	 * @param password mots de passe associé
	 * @param properties propriétés non standard à transmettre au driver lors de la connexion
	 * @param entityClasses liste des classes des entitées JPA persistées par cette unité
	 */
	void openPersistenceUnit(
			String persistenceUnitName,
			Class<?> jdbcDriverClass,
			String jdbcUrl,
			String user,
			String password,
			Properties properties,
			Collection<Class<?>> entityClasses);

	/**
	 * Récupère le gestionnaire de données actif
	 * @return le gestionnaire de données actif
	 */
	static DataManager get() {
		return ApplicationManager.get().getDataManager();
	}

	/**
	 * Dresse la liste de toutes les classes de l'application courante représentant des entitées JPA.
	 * @return une collection de classes d'entités
	 */
	default Collection<Class<?>> getEntityClasses() {
		return Scanner.get().getClassesAnnotatedBy(Entity.class, Profile.class);
	}

}
