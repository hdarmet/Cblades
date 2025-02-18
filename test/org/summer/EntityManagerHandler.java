package org.summer;

import javax.persistence.EntityManager;
import javax.persistence.EntityTransaction;
import javax.persistence.Query;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class EntityManagerHandler implements InvocationHandler {

	MockDataManagerImpl manager;
	
	public EntityManagerHandler(MockDataManagerImpl manager) {
		this.manager = manager;
	}
	
	Pair<TransactionHandler, EntityTransaction> transaction = mockTransaction();

    static Method findMethod = TestUtils.getMethod(EntityManager.class, "find", Class.class, Object.class);
    static Method persistMethod = TestUtils.getMethod(EntityManager.class, "persist", Object.class);
    static Method mergeMethod = TestUtils.getMethod(EntityManager.class, "merge", Object.class);
    static Method removeMethod = TestUtils.getMethod(EntityManager.class, "remove", Object.class);
    static Method flushMethod = TestUtils.getMethod(EntityManager.class, "flush");
    static Method closeMethod = TestUtils.getMethod(EntityManager.class, "close");
    static Method createQueryMethod = TestUtils.getMethod(EntityManager.class, "createQuery", String.class);
    static Method getTransactionMethod = TestUtils.getMethod(EntityManager.class, "getTransaction");

	private Pair<TransactionHandler, EntityTransaction> mockTransaction() {
    	TransactionHandler handler = new TransactionHandler();
        return new Pair<TransactionHandler, EntityTransaction>(
        	handler, (EntityTransaction)Proxy.newProxyInstance(
	        	EntityTransaction.class.getClassLoader(),
	        	new Class[] {EntityTransaction.class},
	        	handler));
    }
    
    private CallRecord peekCall() {
        return manager.peekCall();
    }

    private Pair<QueryHandler, Query> mockQuery(EntityManagerHandler parentHandler) {
    	QueryHandler handler = new QueryHandler(parentHandler);
	    return new Pair<QueryHandler, Query>(handler, (Query)Proxy.newProxyInstance(
            Query.class.getClassLoader(),
            new Class[] {Query.class},
            handler));
	}
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.equals(findMethod)) {
            if (!transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("find", args);
        }
        else if (method.equals(persistMethod)) {
            if (!transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("persist", args);
        }
        else if (method.equals(mergeMethod)) {
            if (!transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("merge", args);
        }
        else if (method.equals(removeMethod)) {
            if (!transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("remove", args);
        }
        else if (method.equals(flushMethod)) {
            if (!transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("flush", args);
        }
        else if (method.equals(closeMethod)) {
        	return null;
        }
        else if (method.equals(createQueryMethod)) {
            if (!transaction.first.active) throw new SummerTestException("Transaction is not active");
            peekCall().invoke("createQuery", args);
            return mockQuery(this).second;
        }
        else if (method.equals(getTransactionMethod)) {
            return transaction.second;
        }
        else {
        	throw new SummerTestException(method+" not supported yet");
        }
    }
}
