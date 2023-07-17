package org.summer;

import org.junit.Assert;

import java.awt.image.ImageProducer;
import java.util.function.Supplier;

public class DataCallRecord {

	public DataCallRecord(
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
    
    public DataCallRecord withParameters(Object ... parameters) {
        this.parameters = parameters;
        return this;
    }
    
    public DataCallRecord returning(Object returnValue) {
        this.returnValue = returnValue;
        return this;
    }
    
    DataCallRecord throwing(Throwable exception) {
        this.exception = exception;
        return this;
    }
}