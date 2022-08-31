package org.summer;

import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.WeakHashMap;

import javax.servlet.http.HttpSession;

import org.summer.annotation.OneShotScoped;
import org.summer.annotation.PooledScoped;
import org.summer.annotation.RequestScoped;
import org.summer.annotation.SessionScoped;
import org.summer.annotation.SingletonScoped;

public class InjectorImpl implements Injector {

	public InjectorImpl() {
		this.installComponents();
	}
	
	Class<?> getImplementationClass(Class<?> serviceClass) {
		Set<Class<?>> implementationClasses = implementations.get(serviceClass);
		if (implementationClasses==null) {
			throw new SummerException("No registered implementation found for : "+serviceClass);
		}
		if (implementationClasses.size()>1) {
			throw new SummerException("Ambiguious definition for : "+serviceClass);
		}
		return implementationClasses.iterator().next();
	}

	Set<Class<?>> getImplementationClasses(Class<?> serviceClass) {
		Set<Class<?>> implementationsClasses = implementations.get(serviceClass);
		if (implementationsClasses==null) {
			throw new SummerException("No registered implementation found for : "+serviceClass);
		}
		return implementationsClasses;
	}
	
	Set<Class<?>> getImplementationClasses(String profile, Class<?> serviceClass) {
		Set<Class<?>> candidateClasses = implementations.get(serviceClass);
		if (candidateClasses==null) {
			throw new SummerException("No registered implementation found for : "+serviceClass);
		}
		Set<Class<?>> implementationClasses = new HashSet<>();
		for (Class<?> implementationClass : candidateClasses) {
			Set<String> profiles = collectProfilesFromScopeAnnotations(implementationClass);
			if (profiles.contains(profile)) {
				implementationClasses.add(implementationClass);
			}
		}
		return implementationClasses;
	}

	Class<?> getImplementationClass(String profile, Class<?> serviceClass) {
		Set<Class<?>> implementationsClasses = getImplementationClasses(profile, serviceClass);
		if (implementationsClasses.size()==0) {
			throw new SummerException("No implementation for : "+serviceClass+" in associated profile : "+profile);
		}
		if (implementationsClasses.size()>1) {
			throw new SummerException("Ambiguious definition for : "+serviceClass);
		}
		return implementationsClasses.iterator().next();
	}
	
	
	void collectProfilesFromScopeAnnotation(
			Set<String> profileNames,
			Class<?> componentClass, 
			Class<? extends Annotation> scopeAnnotationClass) 
	{
		Annotation scopeAnnotation = componentClass.getAnnotation(scopeAnnotationClass);
		if (scopeAnnotation!=null) {
			for (String name : Scanner.get().getProfilesFromClassAnnotation(componentClass, scopeAnnotationClass)) {
				profileNames.add(name);
			}
		}
	}
	
	Set<String> collectProfilesFromScopeAnnotations(Class<?> implementationClass) {
		Set<String> names = new HashSet<String>();
		collectProfilesFromScopeAnnotation(names, implementationClass, OneShotScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, RequestScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, PooledScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, SessionScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, SingletonScoped.class);
		return names;
	}
	
	Object getComponent(Class<?> componentClass, Map<Class<?>, Object> components) 
			throws InstantiationException, IllegalAccessException {
		Object component = components.get(componentClass);
		if (component==null) {
			component = componentClass.newInstance();
			components.put(componentClass, component);
		}
		return component;	
	}

	Object getComponent(Class<?> componentClass, List<Object> components) 
			throws InstantiationException, IllegalAccessException {
		if (components.size()==0) {
			return componentClass.newInstance();
		}
		else {
			return components.remove(0);
		}
	}
	
	@Override
	@SuppressWarnings("unchecked")
	public <T> T getComponent(Class<T> serviceClass) {
		Class<?> componentClass = getImplementationClass(serviceClass);
		return (T)getImplementation(componentClass);
	}

	@Override
	@SuppressWarnings("unchecked")
	public <T> Set<T> getAllComponents(Class<T> serviceClass) {
		Set<T> components = new HashSet<T>();
		Set<Class<?>> componentClasses = getImplementationClasses(serviceClass);
		for (Class<?> componentClass : componentClasses) {
			components.add((T)getImplementation(componentClass));
		}
		return components;
	}

	@Override
	@SuppressWarnings("unchecked")
	public <T> T getComponent(String profile, Class<T> serviceClass) {
		Class<?> componentClass = getImplementationClass(profile, serviceClass);
		return (T)getImplementation(componentClass);
	}

	@Override
	@SuppressWarnings("unchecked")
	public <T> Set<T> getAllComponents(String profile, Class<T> serviceClass) {
		Set<T> components = new HashSet<T>();
		Set<Class<?>> componentClasses = getImplementationClasses(profile, serviceClass);
		for (Class<?> componentClass : componentClasses) {
			components.add((T)getImplementation(componentClass));
		}
		return components;
	}
	
	Object getImplementation(Class<?> componentClass) {
		try {
			if (componentClass.getAnnotation(SingletonScoped.class)!=null) {
				return getComponent(componentClass, singletonScoped);
			}
			else if (componentClass.getAnnotation(SessionScoped.class)!=null) {
				return getSessionComponent(componentClass);
			}
			else if (componentClass.getAnnotation(RequestScoped.class)!=null) {
				return getRequestComponent(componentClass);
			}
			else if (componentClass.getAnnotation(PooledScoped.class)!=null) {
				return getPooledComponent(componentClass);
			}
			else if (componentClass.getAnnotation(OneShotScoped.class)!=null) {
				return componentClass.newInstance();
			}
			throw new SummerException("Unregistered component : "+componentClass);
		} catch (InstantiationException | IllegalAccessException e) {
			throw new SummerException("Unable to instanciate : "+componentClass);
		}
	}
	
	Object getSessionComponent(Class<?> componentClass) throws IllegalAccessException, InstantiationException {
		HttpSession currentSession = sessions.get();
		if (currentSession==null) {
			throw new SummerException("No current session for : "+componentClass);
		}
		Map<Class<?>, Object> components = sessionScoped.get(currentSession);
		if (components==null) {
			components = new HashMap<>();
			sessionScoped.put(currentSession, components);
		}
		return getComponent(componentClass, components);
	}

	Object getRequestComponent(Class<?> componentClass) 
			throws IllegalAccessException, InstantiationException 
	{
		Map<Class<?>, Object> components = requestScoped.get();
		if (components==null) {
			components = new HashMap<>();
			requestScoped.set(components);
		}
		return getComponent(componentClass, components);
	}

	Object getPooledComponent(Class<?> componentClass) 
			throws InstantiationException, IllegalAccessException 
	{
		synchronized(pooledScoped) {
			List<Object> components = pooledScoped.get(componentClass);
			if (components==null || components.size()==0) {
				return componentClass.newInstance();
			}
			return components.remove(0);
		}	
	}

	@Override
	public void releaseComponent(Object component) {
		Class<?> componentClass = component.getClass();
		if (componentClass.getAnnotation(PooledScoped.class)!=null) {
			releasePooledComponent(component);
		}
	}
	
	void releasePooledComponent(Object component) {
		synchronized(pooledScoped) {
			Class<?> componentClass = component.getClass();
			List<Object> components = pooledScoped.get(componentClass);
			if (components==null) {
				components = new LinkedList<>();
				pooledScoped.put(componentClass, components);
			}
			components.add(component);
		}
	}
	
	void closeThread() {
		requestScoped.remove();
	}
	
	Map<Class<?>, Object> singletonScoped = new HashMap<>();
	Map<Class<?>, List<Object>> pooledScoped = new HashMap<>();
	Map<HttpSession, Map<Class<?>, Object>> sessionScoped = new WeakHashMap<>();
	ThreadLocal<Map<Class<?>, Object>> requestScoped = new ThreadLocal<>();
	
	@Override
	public void startThread(HttpSession session) {
		sessions.set(session);
	}

	@Override
	public void finishThread() {
		sessions.remove();
		closeThread();
	}
	
	ThreadLocal<HttpSession> sessions = new ThreadLocal<>();

	Map<Class<?>, Set<Class<?>>> implementations = new HashMap<>();
	
	void installComponents() {
		Set<Class<?> > componentClasses = new HashSet<>();
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(OneShotScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(RequestScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(SessionScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(SingletonScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(OneShotScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(RequestScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(SessionScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(SingletonScoped.class));
		registerComponentClasses(componentClasses);
	}
	
	void registerComponentClasses(Set<Class<?>> componentClasses) {
		for (Class<?> componentClass : componentClasses) {
			registerComponentClass(componentClass, componentClass);
		}
	}
	
	void registerComponentClass(Class<?> componentClass) {
		registerComponentClass(componentClass, componentClass);
	}
	
	void registerComponentClass(Class<?> serviceClass, Class<?> componentClass) {
		if (serviceClass!=null) {
			addImplementation(serviceClass, componentClass);
			registerComponentClass(serviceClass.getSuperclass(), componentClass);
			for (Class<?> interfaceClass : serviceClass.getInterfaces()) {
				registerInterfaceClass(interfaceClass, componentClass);
			}
		}
	}

	void registerInterfaceClass(Class<?> serviceClass, Class<?> componentClass) {
		addImplementation(serviceClass, componentClass);
		for (Class<?> interfaceClass : serviceClass.getInterfaces()) {
			registerInterfaceClass(interfaceClass, componentClass);
		}
	}

	void addImplementation(Class<?> serviceClass, Class<?> componentClass) {
		Set<Class<?>> implementationForAGivenInterface = implementations.get(serviceClass);
		if (implementationForAGivenInterface==null) {
			implementationForAGivenInterface = new HashSet<>();
			implementations.put(serviceClass, implementationForAGivenInterface);
		}
		implementationForAGivenInterface.add(componentClass);
	}

	Map<String, List<Object>> values = new HashMap<String, List<Object>>();
	
	@SuppressWarnings("unchecked")
	@Override
	public <T> T getValue(String valueName) {
		List<Object> values = this.values.get(valueName);
		if (values==null || values.size()==0) return null;
		if (values.size()>1) {
			throw new SummerException("Ambiguious values for : "+valueName);
		}
		return (T)values.get(0);
	}

	@SuppressWarnings("unchecked")
	@Override
	public <T> Collection<T> getValues(String valueName) {
		List<Object> values = this.values.get(valueName);
		if (values==null || values.size()==0) return Collections.emptyList();
		return Collections.unmodifiableList((List<T>)values);
	}

	@SuppressWarnings("unchecked")
	@Override
	synchronized public <T> Injector setValue(String valueName, T value) {
		List<T> values = (List<T>)this.values.get(valueName);
		if (values==null) {
			values = new ArrayList<T>();
			this.values.put(valueName,  (List<Object>)values);
		}
		else {
			values.clear();
		}
		values.add(value);
		return this;
	}

	@SuppressWarnings("unchecked")
	@Override
	synchronized public <T> Injector putValue(String valueName, T value) {
		List<T> values = (List<T>)this.values.get(valueName);
		if (values==null) {
			values = new ArrayList<T>();
			this.values.put(valueName,  (List<Object>)values);
		}
		values.add(value);
		return this;
	}
	
}
