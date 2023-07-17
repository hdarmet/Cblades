package org.summer;

import java.util.List;
import java.util.Set;

import org.summer.Injector.InjectCollection;

public interface InjectorSunbeam {

	default <T> T get(Class<T> serviceClass) {
		return Injector.get(serviceClass);
	}

	default <T> Set<T> getAll(Class<T> serviceClass) {
		return Injector.getAll(serviceClass);
	}

	default <T> T get(String profile, Class<T> serviceClass) {
		return Injector.get(profile, serviceClass);
	}

	default <T> Set<T> getAll(String profile, Class<T> serviceClass) {
		return Injector.getAll(profile, serviceClass);
	}

	default <T> T value(String valueName) {
		return Injector.value(valueName);
	}

	default <T> List<T> values(String valueName) {
		return Injector.values(valueName);
	}
	
	default <T> void use(Class<T> klass, Injector.InjectOne<T> executor) {
		Injector.use(klass, executor);
	}

	default <T> void useAll(Class<T> klass, InjectCollection<T> executor) {	
		Injector.useAll(klass, executor);
	}

	default <T> void use(String profile, Class<T> klass, Injector.InjectOne<T> executor) {
		Injector.use(profile, klass, executor);
	}

	default <T> void useAll(String profile, Class<T> klass, InjectCollection<T> executor) {	
		Injector.useAll(profile, klass, executor);
	}

	default <T> Ref<T> ref() {
		return new Ref<T>();
	}

}
