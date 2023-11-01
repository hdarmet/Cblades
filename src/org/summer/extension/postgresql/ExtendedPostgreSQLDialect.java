package org.summer.extension.postgresql;

import org.hibernate.dialect.PostgreSQL95Dialect;

public class ExtendedPostgreSQLDialect extends PostgreSQL95Dialect {
    public ExtendedPostgreSQLDialect() {
        registerFunction("fts", new PostgreSQLFTSFunction());
    }

    public String getAddForeignKeyConstraintString(String constraintName, String[] foreignKey, String referencedTable, String[] primaryKey, boolean referencesPrimaryKey) {
        StringBuilder res = new StringBuilder(30);
        res.append(" add constraint ").append(this.quote(constraintName)).append(" foreign key (").append(String.join(", ", foreignKey)).append(") references ").append(referencedTable).append(" deferrable initially deferred");
        if (!referencesPrimaryKey) {
            res.append(" (").append(String.join(", ", primaryKey)).append(')');
        }
        return res.toString();
    }

}
