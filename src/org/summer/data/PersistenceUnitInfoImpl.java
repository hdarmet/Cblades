package org.summer.data;

import java.net.URL;
import java.util.Collections;
import java.util.List;
import java.util.Properties;

import javax.persistence.SharedCacheMode;
import javax.persistence.ValidationMode;
import javax.persistence.spi.ClassTransformer;
import javax.persistence.spi.PersistenceUnitInfo;
import javax.persistence.spi.PersistenceUnitTransactionType;
import javax.sql.DataSource;

import org.hibernate.jpa.HibernatePersistenceProvider;

public class PersistenceUnitInfoImpl implements PersistenceUnitInfo {

    public static PersistenceUnitInfoImpl newNonJTAPersistenceUnitInfo(
            String persistenceUnitName, 
            List<String> mappingFileNames, 
            Properties properties, 
            DataSource nonJtaDataSource) 
    {
        PersistenceUnitInfoImpl persistenceUnitInfo = new PersistenceUnitInfoImpl(
            persistenceUnitName, mappingFileNames, properties
        );
        persistenceUnitInfo.jtaDataSource = null;
        persistenceUnitInfo.nonJtaDataSource = nonJtaDataSource;
        persistenceUnitInfo.transactionType = PersistenceUnitTransactionType.RESOURCE_LOCAL;
        return persistenceUnitInfo;
    }
    
    public static PersistenceUnitInfoImpl newJTAPersistenceUnitInfo(
            String persistenceUnitName, 
            List<String> mappingFileNames, 
            Properties properties, 
            DataSource jtaDataSource) 
    {
        PersistenceUnitInfoImpl persistenceUnitInfo = new PersistenceUnitInfoImpl(
            persistenceUnitName, mappingFileNames, properties
        );
        persistenceUnitInfo.jtaDataSource = jtaDataSource;
        persistenceUnitInfo.nonJtaDataSource = null;
        persistenceUnitInfo.transactionType = PersistenceUnitTransactionType.JTA;
        return persistenceUnitInfo;
    }

    final String persistenceUnitName;

    PersistenceUnitTransactionType transactionType;

    final List<String> managedClassNames;

    final Properties properties;

    DataSource jtaDataSource;

    DataSource nonJtaDataSource;

    PersistenceUnitInfoImpl(String persistenceUnitName, List<String> managedClassNames, Properties properties) {
        this.persistenceUnitName = persistenceUnitName;
        this.managedClassNames = managedClassNames;
        this.properties = properties;
    }

    @Override
    public String getPersistenceUnitName() {
        return persistenceUnitName;
    }

    @Override
    public String getPersistenceProviderClassName() {
        return HibernatePersistenceProvider.class.getName();
    }

    @Override
    public PersistenceUnitTransactionType getTransactionType() {
        return transactionType;
    }

    @Override
    public DataSource getJtaDataSource() {
        return jtaDataSource;
    }

    @Override
    public DataSource getNonJtaDataSource() {
        return nonJtaDataSource;
    }

    @Override
    public List<String> getMappingFileNames() {
        return null;
    }

    @Override
    public List<URL> getJarFileUrls() {
        return Collections.emptyList();
    }

    @Override
    public URL getPersistenceUnitRootUrl() {
        return null;
    }

    @Override
    public List<String> getManagedClassNames() {
        return managedClassNames;
    }

    @Override
    public boolean excludeUnlistedClasses() {
        return false;
    }

    @Override
    public SharedCacheMode getSharedCacheMode() {
        return SharedCacheMode.UNSPECIFIED;
    }

    @Override
    public ValidationMode getValidationMode() {
        return ValidationMode.AUTO;
    }

    public Properties getProperties() {
        return properties;
    }

    @Override
    public String getPersistenceXMLSchemaVersion() {
        return "2.1";
    }

    @Override
    public ClassLoader getClassLoader() {
        return Thread.currentThread().getContextClassLoader();
    }

    @Override
    public void addTransformer(ClassTransformer transformer) {

    }

    @Override
    public ClassLoader getNewTempClassLoader() {
        return null;
    }
}
