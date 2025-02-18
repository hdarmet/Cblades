package org.summer;

import org.junit.Assert;

import java.util.function.Supplier;

public class CallRecord {

	public CallRecord(
		String functionName,
		Object returnValue,
		Throwable exception,
		Object[] parameters) 
	{
		this.functionName = functionName;
		this.returnValue = returnValue;
		this.exception = exception;
		this.parameters = parameters;
	}
	
	String functionName;
	Object returnValue;
	Throwable exception;
	Object[] parameters;
	
	@SuppressWarnings("unchecked")
	private Object valueReturned(Object any) {
        if (any==null) {
            return null;
        }
        if (any instanceof Supplier) {
        	return ((Supplier<Object>)any).get();
        }
        else {
        	return any;
        }
    }
	
    public Object invoke(String functionName, Object[] parameters) throws Throwable {
        Assert.assertEquals(this.functionName, functionName);
        TestUtils.assertArrayEquals(this.parameters, parameters);
        if (exception!=null) {
            throw exception;
        }
        return valueReturned(this.returnValue);
    }
    
    public CallRecord withParameters(Object ... parameters) {
        this.parameters = parameters;
        return this;
    }
    
    public CallRecord returning(Object returnValue) {
        this.returnValue = returnValue;
        return this;
    }
    
    CallRecord throwing(Throwable exception) {
        this.exception = exception;
        return this;
    }
}