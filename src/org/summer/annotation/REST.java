package org.summer.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface REST {
	String url();
	Method method();
	String[] profile() default {};
	
	public enum Method {
		GET, POST, PUT, DELETE, UPLOAD
	}
}
