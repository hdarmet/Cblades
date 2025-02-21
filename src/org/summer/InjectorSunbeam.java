package org.summer;

import java.util.List;

public interface InjectorSunbeam {

	default <T> T get(Class<T> serviceClass) {
		return Injector.get(serviceClass);
	}

	default <T> T get(String profile, Class<T> serviceClass) {
		return Injector.get(profile, serviceClass);
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

	default <T, U> void use(Class<T> klassT, Class<U> klassU, Injector.InjectTwo<T, U> executor) {
		Injector.use(klassT, klassU, executor);
	}

	default <T, U, V> void use(Class<T> klassT, Class<U> klassU, Class<V> klassV, Injector.InjectThree<T, U, V> executor) {
		Injector.use(klassT, klassU, klassV, executor);
	}

	default <T> void use(String profile, Class<T> klass, Injector.InjectOne<T> executor) {
		Injector.use(profile, klass, executor);
	}

	default <T, U> void use(String profile, Class<T> klassT, Class<U> klassU, Injector.InjectTwo<T, U> executor) {
		Injector.use(profile, klassT, klassU, executor);
	}

	default <T, U, V> void use(String profile, Class<T> klassT, Class<U> klassU, Class<V> klassV, Injector.InjectThree<T, U, V> executor) {
		Injector.use(profile, klassT, klassU, klassV, executor);
	}

	default <T> Ref<T> ref() {
		return new Ref<T>();
	}

}
