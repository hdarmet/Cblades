package org.summer;

import com.google.common.base.Supplier;

import javax.servlet.http.HttpSession;
import java.util.*;

public class InjectorForTest implements Injector {

	class ComponentFactory<T> {
		
		Class<T> serviceClass;
		Supplier<T> componentSupplier;
		List<String> profiles = new ArrayList<>();
		
		ComponentFactory(Class<T> serviceClass, Supplier<T> componentSupplier, String... profiles) {
			this.serviceClass = serviceClass;
			this.componentSupplier = componentSupplier;
			this.profiles.addAll(Arrays.asList(profiles));
		}

		boolean matches(Class<?> serviceClass, String profile) {
			boolean isMatching = serviceClass.isAssignableFrom(this.serviceClass);
			if (isMatching && profile!=null) {
				isMatching = this.profiles.contains(profile);
			}
			return isMatching;
		}
		
		T getComponent() {
			return this.componentSupplier.get();
		}
	}
	
	List<ComponentFactory<?>> factories = new ArrayList<>();
	
	public <T> InjectorForTest addComponent(
			Class<T> serviceClass, 
			Supplier<T> componentSupplier, 
			String... profiles) 
	{
		factories.add(new ComponentFactory<>(serviceClass, componentSupplier, profiles));
		return this;
	}

	public <T> InjectorForTest addComponent(
			Class<T> serviceClass, 
			String... profiles) 
	{
		factories.add(new ComponentFactory<>(serviceClass, ()->ReflectUtil.newInstance(serviceClass), profiles));
		return this;
	}

	public <T> InjectorForTest addComponent(
			Class<T> serviceClass, 
			T component, 
			String... profiles) 
	{
		factories.add(new ComponentFactory<>(serviceClass, ()->component, profiles));
		return this;
	}

	@SuppressWarnings("unchecked")
	@Override
	public <T> T getComponent(Class<T> serviceClass) {
		for(ComponentFactory<?> factory : factories) {
			if (factory.matches(serviceClass, null)) {
				return (T)factory.getComponent();
			}
		}
		return null;
	}

	@SuppressWarnings("unchecked")
	@Override
	public <T> T getComponent(String profile, Class<T> serviceClass) {
		for(ComponentFactory<?> factory : factories) {
			if (factory.matches(serviceClass, profile)) {
				return (T)factory.getComponent();
			}
		}
		return null;
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

	@Override
	public <T> void releaseComponent(T component) {
	}

	@Override
	public void startThread(HttpSession session) {
	}

	@Override
	public void finishThread() {
	}

	public static InjectorForTest get() {
		return (InjectorForTest)ApplicationManager.get().getInjector();
	}
}
