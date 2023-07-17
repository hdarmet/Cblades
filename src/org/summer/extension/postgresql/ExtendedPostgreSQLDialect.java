package org.summer.extension.postgresql;

import org.hibernate.dialect.PostgreSQL95Dialect;

public class ExtendedPostgreSQLDialect extends PostgreSQL95Dialect {
    public ExtendedPostgreSQLDialect() {
        registerFunction("fts", new PostgreSQLFTSFunction());
    }
}
