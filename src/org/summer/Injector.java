package org.summer;

import java.util.Collection;
import java.util.List;
import java.util.Set;

import javax.servlet.http.HttpSession;

public interface Injector {

	public static <T> void use(Class<T> klassT, InjectOne<T> executor) {
		T componentT = get().getComponent(klassT);
		try {
			executor.run(componentT);
		}
		finally {
			get().releaseComponent(componentT);
		}
	}

	public static <T, U> void use(Class<T> klassT, Class<U> klassU, InjectTwo<T, U> executor) {
		T componentT = get().getComponent(klassT);
		U componentU = get().getComponent(klassU);
		try {
			executor.run(componentT, componentU);
		}
		finally {
			get().releaseComponent(componentT);
			get().releaseComponent(componentU);
		}
	}

	public static <T, U, V> void use(Class<T> klassT, Class<U> klassU, Class<V> klassV, 
			InjectThree<T, U, V> executor) {
		T componentT = get().getComponent(klassT);
		U componentU = get().getComponent(klassU);
		V componentV = get().getComponent(klassV);
		try {
			executor.run(componentT, componentU, componentV);
		}
		finally {
			get().releaseComponent(componentT);
			get().releaseComponent(componentU);
			get().releaseComponent(componentV);
		}
	}

	public static <T> void useAll(Class<T> klass, InjectCollection<T> executor) {	
		executor.run((Set<T>)getAll(klass));
	}

	public static <T> void use(String profile, Class<T> klassT, InjectOne<T> executor) {	
		executor.run((T)get(profile, klassT));
	}

	public static <T, U> void use(String profile, Class<T> klassT, Class<U> klassU, InjectTwo<T, U> executor) {	
		executor.run((T)get(profile, klassT), (U)get(profile, klassU));
	}

	public static <T, U, V> void use(String profile, Class<T> klassT, Class<U> klassU, Class<V> klassV, InjectThree<T, U, V> executor) {	
		executor.run((T)get(profile, klassT), (U)get(profile, klassU), (V)get(profile, klassV));
	}

	public static <T> void useAll(String profile, Class<T> klass, InjectCollection<T> executor) {	
		executor.run((Set<T>)getAll(profile, klass));
	}

	static <T> T get(Class<T> serviceClass) {
		return ApplicationManager.get().getInjector().getComponent(serviceClass);
	}

	static <T> Set<T> getAll(Class<T> serviceClass) {
		return ApplicationManager.get().getInjector().getAllComponents(serviceClass);
	}

	static <T> T get(String profile, Class<T> serviceClass) {
		return ApplicationManager.get().getInjector().getComponent(profile, serviceClass);
	}

	static <T> Set<T> getAll(String profile, Class<T> serviceClass) {
		return ApplicationManager.get().getInjector().getAllComponents(profile, serviceClass);
	}
	
	public static <T> T value(String valueName) {
		return ApplicationManager.get().getInjector().getValue(valueName);
	}

	public static <T> List<T> values(String valueName) {
		return ApplicationManager.get().getInjector().getValue(valueName);
	}

	<T> T getComponent(Class<T> serviceClass);

	<T> Set<T> getAllComponents(Class<T> serviceClass);

	<T> T getComponent(String profile, Class<T> serviceClass);

	<T> Set<T> getAllComponents(String profile, Class<T> serviceClass);
	
	<T> void releaseComponent(T component);

	<T> T getValue(String valueName);

	<T> Collection<T> getValues(String valueName);

	<T> Injector setValue(String valueName, T value);

	<T> Injector putValue(String valueName, T value);

	void startThread(HttpSession session);

	void finishThread();

	public interface InjectOne<T> {
		void run(T injected);
	}

	public interface InjectTwo<T, U> {
		void run(T injectedT, U injectedU);
	}
	
	public interface InjectThree<T, U, V> {
		void run(T injectedT, U injectedU, V injectedV);
	}
	
	public interface InjectCollection<T> {
		void run(Collection<T> injected);
	}

	public static Injector get() {
		return ApplicationManager.get().getInjector();
	}

}
