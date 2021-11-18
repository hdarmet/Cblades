package org.summer;

import org.junit.Assert;

import java.lang.reflect.Method;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.regex.Pattern;

public class TestUtils {
	
	static private String strip(String that) {
        Pattern p = Pattern.compile("[ \n\t]+");
        return p.matcher(that.trim()).replaceAll(" ");
    }
	
    static boolean isLambda(Object any) {
        if (any==null) {
            return false;
        }
        return any instanceof Predicate;
    }

	static public void assertArrayEquals(
			Object[] arrayOne, 
			Object[] arrayTwo) 
	{
	    if (arrayOne==null && (arrayTwo!=null && arrayTwo.length>0) || (arrayOne!=null && arrayOne.length>0) && arrayTwo==null) {
	        Assert.fail("Expected "+arrayTwo+" found "+arrayOne);
	    }
	    if (arrayOne!=null && arrayOne.length>0 && arrayTwo!=null && arrayTwo.length>0) {
	        Assert.assertEquals(arrayOne.length, arrayTwo.length);
	        for (int index = 0; index< arrayOne.length; index++) {
				if (arrayOne[index] instanceof String && arrayTwo[index] instanceof String) {
					Assert.assertEquals(strip((String)arrayOne[index]), strip((String)arrayTwo[index]));
				} else if (isLambda(arrayOne[index])) {
					@SuppressWarnings("unchecked")
					Predicate<Object> handler = (Predicate<Object>)arrayOne[index];
					Assert.assertTrue(
						handler.test(arrayTwo[index])
					);
				} else {
					Assert.assertEquals(arrayOne[index], arrayTwo[index]);
				}
			}
	    }
	}

	static public <T>Method getMethod(Class<?> clazz, String methodName, Class<?> ... args) {
		try {
			return clazz.getMethod(methodName, args);
		} catch (NoSuchMethodException | SecurityException e) {
			throw new SummerTestException(e.getMessage());
		}
	}
	
}
