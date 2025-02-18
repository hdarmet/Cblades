package org.summer;

import javax.persistence.Query;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

class QueryHandler implements InvocationHandler {

	EntityManagerHandler parent;

	public QueryHandler(EntityManagerHandler parent) {
		this.parent = parent;
	}
	
    private CallRecord peekCall() {
        if (!parent.manager.calls.isEmpty()) {
        	return parent.manager.calls.remove(0);
        }
    	else throw new SummerTestException("No data request available");
    }

    static Method setParameterMethod = TestUtils.getMethod(Query.class, "setParameter", String.class, Object.class);
    static Method getSingleResultMethod = TestUtils.getMethod(Query.class, "getSingleResult");
    static Method getResultListMethod = TestUtils.getMethod(Query.class, "getResultList");
    static Method setFirstResultMethod = TestUtils.getMethod(Query.class, "setFirstResult", Integer.TYPE);
    static Method setMaxResultsMethod = TestUtils.getMethod(Query.class, "setMaxResults", Integer.TYPE);
    static Method executeUpdate = TestUtils.getMethod(Query.class, "executeUpdate");


    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.equals(setParameterMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            peekCall().invoke("setParameter", args);
            return proxy;
        }
        else if (method.equals(setFirstResultMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("setFirstResult", args);
        }
        else if (method.equals(setMaxResultsMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("setMaxResults", args);
        }
        else if (method.equals(getSingleResultMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("getSingleResult", args);
        }
        else if (method.equals(getResultListMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("getResultList", args);
        }
        else if (method.equals(executeUpdate)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("executeUpdate", args);
        }
        else {
        	throw new SummerTestException(method+" not supported yet");
        }
    }

}
