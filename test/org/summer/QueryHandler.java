package org.summer;

import javax.persistence.EntityTransaction;
import javax.persistence.Query;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

class QueryHandler implements InvocationHandler {

	EntityManagerHandler parent;

	public QueryHandler(EntityManagerHandler parent) {
		this.parent = parent;
	}
	
    private DataCallRecord peekCall() {
        if (!parent.manager.calls.isEmpty()) {
        	return parent.manager.calls.remove(0);
        }
    	else throw new SummerTestException("No data request available");
    }

    static Method setParameterMethod = TestUtils.getMethod(Query.class, "setParameter", String.class, Object.class);
    static Method getSingleResultMethod = TestUtils.getMethod(Query.class, "getSingleResult");
    static Method getResultListMethod = TestUtils.getMethod(Query.class, "getResultList");

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.equals(setParameterMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            peekCall().invoke("setParameter", args);
            return proxy;
        }
        else if (method.equals(getSingleResultMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("getSingleResult", args);
        }
        else if (method.equals(getResultListMethod)) {
            if (!parent.transaction.first.active) throw new SummerTestException("Transaction is not active");
            return peekCall().invoke("getResultList", args);
        }
        else {
        	throw new SummerTestException(method+" not supported yet");
        }
    }

}
