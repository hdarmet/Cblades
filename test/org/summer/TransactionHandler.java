package org.summer;

import org.junit.Assert;

import javax.persistence.EntityTransaction;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

public class TransactionHandler implements InvocationHandler {

    boolean active = false;
    boolean commited = false;
    boolean rollbackOnlyFlag = false;
    boolean rollbacked = false;

    static Method beginMethod = TestUtils.getMethod(EntityTransaction.class, "begin");
    static Method commitMethod = TestUtils.getMethod(EntityTransaction.class, "commit");
    static Method rollbackMethod = TestUtils.getMethod(EntityTransaction.class, "rollback");
    static Method setRollbackOnlyMethod = TestUtils.getMethod(EntityTransaction.class, "setRollbackOnly");
    static Method getRollbackOnlyMethod = TestUtils.getMethod(EntityTransaction.class, "getRollbackOnly");
    static Method isActiveMethod = TestUtils.getMethod(EntityTransaction.class, "isActive");
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) {
        if (method.equals(beginMethod)) {
        	if (active) throw new SummerTestException("Transaction is already active");
            active = true;
            return null;
        } else if (method.equals(commitMethod)) {
            if (!active) throw new SummerTestException("Transaction is not active");
            if (rollbackOnlyFlag) throw new SummerTestException("Transaction must be rollbacked");
            active = false;
            commited = true;
            return null;
        } else if (method.equals(rollbackMethod)) {
            if (!active) throw new SummerTestException("Transaction is not active");
            active = false;
            rollbacked = true;
            return null;
        } else if (method.equals(setRollbackOnlyMethod)) {
            if (!active) throw new SummerTestException("Transaction is not active");
            rollbackOnlyFlag = true;
            return null;
        } else if (method.equals(getRollbackOnlyMethod)) {
            if (!active) throw new SummerTestException("Transaction is not active");
            return rollbackOnlyFlag;
        } else if (method.equals(isActiveMethod)) {
            return active;
        } else {
            throw new SummerTestException(method+" not supported yet");
        }
    }
}
