package org.summer;

import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collection;

public interface Scanner {

	public static Scanner get() {
		return ApplicationManager.get().getScanner();
	}

	Collection<Class<?>> getClassesAnnotatedBy(
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass);

	Collection<Class<?>> getClassesAnnotatedBy(
			Class<? extends Annotation> annotationClass);

	Collection<Class<?>> getSummerClassesAnnotatedBy(
			Class<? extends Annotation> annotationClass);

	Collection<Method> getMethodsAnnotatedBy(
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass);

	Collection<Method> getMethodsAnnotatedBy(
			Class<? extends Annotation> annotationClass);

	Collection<Method> getComponentMethodsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass);
	
	Collection<Method> getComponentMethodsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass);
	
	Collection<Field> getFieldsAnnotatedBy(
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass);

	Collection<Field> getFieldsAnnotatedBy(
			Class<? extends Annotation> annotationClass);

	Collection<Field> getComponentFieldsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass);
	
	Collection<Field> getComponentFieldsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass);
	
	String[] getProfilesFromClassAnnotation(
			Class<?> componentClass, 
			Class<? extends Annotation> annotationClass);

	String[] getProfilesFromMethodAnnotation(
			Method method, 
			Class<? extends Annotation> annotationClass);

	boolean profilesMatch(Collection<String> componentProfiles);

	Collection<Method> getSummerMethodsAnnotedBy(
			Class<? extends Annotation> annotationClass);
}
