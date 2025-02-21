package org.summer;

import java.util.Collection;
import java.util.List;
import java.util.Set;

import javax.servlet.http.HttpSession;

public interface Injector {

	 static <T> void use(Class<T> klassT, InjectOne<T> executor) {
		T componentT = get().getComponent(klassT);
		try {
			executor.run(componentT);
		}
		finally {
			get().releaseComponent(componentT);
		}
	}

	 static <T, U> void use(Class<T> klassT, Class<U> klassU, InjectTwo<T, U> executor) {
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

	 static <T, U, V> void use(Class<T> klassT, Class<U> klassU, Class<V> klassV,
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

	static <T> void use(String profile, Class<T> klassT, InjectOne<T> executor) {
		T componentT = get().getComponent(profile, klassT);
		try {
			executor.run(componentT);
		}
		finally {
			get().releaseComponent(componentT);
		}
	}

	static <T, U> void use(String profile, Class<T> klassT, Class<U> klassU, InjectTwo<T, U> executor) {
		T componentT = get().getComponent(profile, klassT);
		U componentU = get().getComponent(profile, klassU);
		try {
			executor.run(componentT, componentU);
		}
		finally {
			get().releaseComponent(componentT);
			get().releaseComponent(componentU);
		}
	}

	static <T, U, V> void use(String profile, Class<T> klassT, Class<U> klassU, Class<V> klassV, InjectThree<T, U, V> executor) {
		T componentT = get().getComponent(profile, klassT);
		U componentU = get().getComponent(profile, klassU);
		V componentV = get().getComponent(profile, klassV);
		try {
			executor.run(componentT, componentU, componentV);
		}
		finally {
			get().releaseComponent(componentT);
			get().releaseComponent(componentU);
			get().releaseComponent(componentV);
		}
	}

	static <T> T get(Class<T> serviceClass) {
		 return get().getComponent(serviceClass);
	}

	static <T> T get(String profile, Class<T> serviceClass) {
		return get().getComponent(profile, serviceClass);
	}
	
	static <T> T value(String valueName) {
		 return get().getValue(valueName);
	}

	static <T> List<T> values(String valueName) {
		return get().getValue(valueName);
	}

	<T> T getComponent(Class<T> serviceClass);

	<T> T getComponent(String profile, Class<T> serviceClass);
	
	<T> void releaseComponent(T component);

	<T> T getValue(String valueName);

	void startThread(HttpSession session);

	void finishThread();

	/**
	 * Interface fonctionnelle des snippets pour lesquelles sont injectées un seul service
	 * @param <T> la classe du service injecté
	 */
	interface InjectOne<T> {
		void run(T injected);
	}

	/**
	 * Interface fonctionnelle des snippets pour lesquelles sont injectées deux services
	 * @param <T> la classe du premier service injecté
	 * @param <U> la classe du second service injecté
	 */
	interface InjectTwo<T, U> {
		void run(T injectedT, U injectedU);
	}

	/**
	 * Interface fonctionnelle des snippets pour lesquelles sont injectées trois services
	 * @param <T> la classe du premier service injecté
	 * @param <U> la classe du second service injecté
	 * @param <V> la classe du troisième service injecté
	 */
	interface InjectThree<T, U, V> {
		void run(T injectedT, U injectedU, V injectedV);
	}

	/**
	 * Retourne le gestionnaire d'injection associé au gestionnaire d'application actif.
	 * @return le gestionnaire d'injection
	 */
	/**
	 * Returns the injection handler associated with the active application handler.
	 * @return the injection handler
	 */
	static Injector get() {
		return ApplicationManager.get().getInjector();
	}

}
