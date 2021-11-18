package org.summer.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface MIME {
	
	enum Type { INLINE, ATTACHMENT }
	
	String url();
	Type contentDisposition() default Type.INLINE;
	String[] profile() default {};
}
