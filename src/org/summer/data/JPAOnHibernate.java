package org.summer.data;

import java.util.Collection;
import java.util.Properties;

import org.summer.SummerException;

public class JPAOnHibernate {
	public static final String DEVELOPEMENT_SETUP = "create-drop";
	public static final String PRODUCTION_SETUP = "validate";

	public static void openPersistenceUnit(
		String persistenceUnitName,
		Class<?> jdbcDriverClass,
		String jdbcUrl,
		String user,
		String password,
		Class<?> dialect,
		String dataBaseSetup,
		boolean showSql,
		Collection<Class<?>> entityClasses)
	{
	    Properties properties = new Properties();
	    properties.put("hibernate.dialect", dialect.getName());
	    properties.put("hibernate.hbm2ddl.auto", dataBaseSetup);		
	    properties.put("hibernate.show_sql", showSql);
	    DataManager.declarePersistenceUnit(
			persistenceUnitName,
			jdbcDriverClass,
			jdbcUrl, user, password,
			properties,
			entityClasses);
	}

	public static void openPostgresPersistenceUnit(
		String persistenceUnitName,
		String dataBasePath,
		String user,
		String password,
		String dataBaseSetup,
		boolean showSql,
		Collection<Class<?>> entityClasses)
	{
		try {
			Class<?> jdbcDriverClass;
				jdbcDriverClass = Class.forName("org.postgresql.Driver");
			Class<?> dialectClass = Class.forName("org.summer.extension.postgresql.ExtendedPostgreSQLDialect");
			String dataBaseURL = "jdbc:postgresql:"+dataBasePath;
			openPersistenceUnit(persistenceUnitName, 
				jdbcDriverClass,
				dataBaseURL,
				user, password,
				dialectClass, dataBaseSetup, showSql, entityClasses);
		} catch (ClassNotFoundException e) {
			throw new SummerException("Unable to load Postgres driver or dialect.", e);
		}
	}

	public static void openPostgresPersistenceUnit(
		String dataBasePath,
		String user,
		String password,
		String dataBaseSetup,
		boolean showSql)
	{
		openPostgresPersistenceUnit(
			DataManager.DEFAULT_PERSISTENCE_UNIT,
			dataBasePath, user, password,
			dataBaseSetup, showSql,
			DataManager.get().getEntityClasses());
	}

	public static void openPostgresDevPersistenceUnit(
		String dataBasePath,
		String user,
		String password)
	{
		openPostgresPersistenceUnit(
			dataBasePath, user, password,
			DEVELOPEMENT_SETUP, true);
	}

	public static void openPostgresProdPersistenceUnit(
		String dataBasePath,
		String user,
		String password)
	{
		openPostgresPersistenceUnit(
			dataBasePath, user, password,
			PRODUCTION_SETUP, false);
	}
}
