package org.summer;

import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

import org.reflections.Reflections;
import org.reflections.scanners.FieldAnnotationsScanner;
import org.reflections.scanners.MethodAnnotationsScanner;
import org.reflections.scanners.SubTypesScanner;
import org.reflections.scanners.TypeAnnotationsScanner;

public class ScannerImpl implements Scanner {
	
	static final String SUMMER_ROOT = "org.summer";

	Reflections summerReflections;
	Reflections appReflections;
	Set<String> profiles;

	public ScannerImpl(String rootForLookup, Set<String> profiles) {
		this.profiles = profiles;
		prepareReflectionUtility(rootForLookup);
	}

	void prepareReflectionUtility(String rootForLookup) {
		if (rootForLookup==null) {
			throw new InstantiationError("No root-lookup defined");
		}
		this.summerReflections = new Reflections(SUMMER_ROOT, 
				new TypeAnnotationsScanner(), 
				new SubTypesScanner(),  
				new MethodAnnotationsScanner(),
				new FieldAnnotationsScanner());	
		this.appReflections = new Reflections(rootForLookup, 
				new TypeAnnotationsScanner(), 
				new SubTypesScanner(),  
				new MethodAnnotationsScanner(),
				new FieldAnnotationsScanner());	
	}
	
	@Override
	public Collection<Class<?>> getClassesAnnotatedBy(
		Class<? extends Annotation> annotationClass,
		Class<? extends Annotation> profileAnnotationClass)
	{
		return this.appReflections.getTypesAnnotatedWith(annotationClass).stream()
		.filter(componentClass->{
			return profilesMatch(Arrays.asList(
					getProfilesFromClassAnnotation(
						componentClass, profileAnnotationClass)));			
		}).collect(Collectors.toList());
	}

	@Override
	public Collection<Class<?>> getSummerClassesAnnotatedBy(
		Class<? extends Annotation> annotationClass)
	{
		return this.summerReflections.getTypesAnnotatedWith(annotationClass);
	}

	@Override
	public Collection<Class<?>> getClassesAnnotatedBy(
			Class<? extends Annotation> annotationClass) 
	{
		return getClassesAnnotatedBy(annotationClass, annotationClass);
	}
	
	@Override
	public Collection<Method> getMethodsAnnotatedBy(
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass) 
	{
		return this.appReflections.getMethodsAnnotatedWith(annotationClass).stream()
		.filter(method->{
			return profilesMatch(Arrays.asList(
					getProfilesFromMethodAnnotation(
						method, profileAnnotationClass)));			
		}).collect(Collectors.toList());
	}

	@Override
	public Collection<Method> getMethodsAnnotatedBy(
			Class<? extends Annotation> annotationClass) 
	{
		return getMethodsAnnotatedBy(annotationClass, annotationClass);
	}

	@Override
	public Collection<Method> getComponentMethodsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass) 
	{
		return ReflectUtil.getMethods(componentClass).stream()
		.filter(method->{
			if (method.getAnnotation(annotationClass)==null) {
				return false;
			}
			else {
				return profilesMatch(Arrays.asList(
					getProfilesFromMethodAnnotation(
						method, profileAnnotationClass)));
			}
		}).collect(Collectors.toList());
	}
	
	@Override
	public Collection<Method> getComponentMethodsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass) 
	{
		return getComponentMethodsAnnotatedBy(componentClass, annotationClass, annotationClass);
	}
	
	@Override
	public Collection<Field> getFieldsAnnotatedBy(
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass) 
	{
		return this.appReflections.getFieldsAnnotatedWith(annotationClass);
	}

	@Override
	public Collection<Field> getFieldsAnnotatedBy(
			Class<? extends Annotation> annotationClass) 
	{
		return getFieldsAnnotatedBy(annotationClass, annotationClass);
	}

	@Override
	public Collection<Field> getComponentFieldsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass,
			Class<? extends Annotation> profileAnnotationClass) 
	{
		return ReflectUtil.getFields(componentClass).stream()
				.filter(field->field.getAnnotation(annotationClass)!=null)
				.collect(Collectors.toList());
	}
	
	@Override
	public Collection<Field> getComponentFieldsAnnotatedBy(
			Class<?> componentClass,
			Class<? extends Annotation> annotationClass) 
	{
		return getComponentFieldsAnnotatedBy(componentClass, annotationClass, annotationClass);
	}
	
	@Override
	public String[] getProfilesFromClassAnnotation(
			Class<?> componentClass, 
			Class<? extends Annotation> annotationClass) 
	{
		try {
			Method retrieveProfiles = annotationClass.getDeclaredMethod("profile");
			Annotation annotation = componentClass.getAnnotation(annotationClass);
			return annotation==null ? new String[] {} : (String[]) retrieveProfiles.invoke(annotation);
		} catch (NoSuchMethodException | SecurityException | IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {
			throw new SummerException("Unexpected exception, probably a bug : ", e);
		}
	}

	public String[] getProfilesFromMethodAnnotation(
			Method method, 
			Class<? extends Annotation> annotationClass) 
	{
		try {
			Method retrieveProfiles = annotationClass.getDeclaredMethod("profile");
			Annotation annotation = method.getAnnotation(annotationClass);
			return annotation==null ? new String[] {} : (String[]) retrieveProfiles.invoke(annotation);
		} catch (NoSuchMethodException | SecurityException | IllegalAccessException | IllegalArgumentException | InvocationTargetException e) {
			throw new SummerException("Unexpected exception, probably a bug : ", e);
		}
	}

	@Override
	public boolean profilesMatch(Collection<String> componentProfiles) {
		if (componentProfiles.size()==0) {
			return true;
		}
		for (String profile : componentProfiles) {
			if (this.profiles.contains(profile)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public Collection<Method> getSummerMethodsAnnotedBy(
			Class<? extends Annotation> annotationClass) 
	{
		return this.summerReflections.getMethodsAnnotatedWith(annotationClass);
	}
}
