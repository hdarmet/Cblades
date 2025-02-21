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

/**
 * Implémentation de l'injecteur. Le rôle de l'injecteur est de fournir un composant de service à une snippet au par
 * l'usage d'un appel à la fonction "use":
 * <code>
 * use(LikeVoteService.class, likeVoteService -> {<br>
 * 		...<br>
 * 		LikeVoteService.Votation votation = likeVoteService.getPoll(pollId, user);<br>
 *  	...<br>
 * });
 * </code>
 * Le composant injecté est choisi à partir de deux informations données en paramètre à "use":
 * <ul>
 *     <li>le ou les interfaces de service demandées</li>
 *     <li>un "profil" (une chaîne de catactères qui caractérise une implémentation)</li>
 * </ul>.
 * Les composants de services sont automatiquement reconnus par Summer lorsqu'ils sont munis d'une des annotations
 * suivante:
 * <ul>
 *     <li>OneShotScoped : un composant est crée à chaque injection</li>
 *     <li>RequestScoped : le composant est créé pour une requête HTTP donnée</li>
 *     <li>SessionScoped : le composant est créé pour une session HTTP donnée</li>
 *     <li>SingletonScoped : un seul composant est créé est partagé entre tous les usages</li>
 *     <li>PooledScoped : un pool de composants est créé et est partagé entre tous les usages. En cas de "famine" un
 *     nouveau composant est créé (sans limite de nombre, ni politique d'éviction)</li>
 * </ul>
 * <code>
 * &#64;SingletonScoped<br>
 * public class LikeVoteServiceImpl implements LikeVoteService {<br>
 * ...<br>
 * }
 * </code>
 * ou (lorsqu'on veut réserver le service à un "profile" donné (ici "Google"):
 *  <code>
 *  SessionScoped("Google")<br>
 *  public class GMailServiceImpl implements MailService {<br>
 *  ...<br>
 *  }
 *  Noter qu'il n'est pas légal d'utiliser plusieurs scope pour une même implémentation.
 */
public class InjectorImpl implements Injector {

	/**
	 * Construction de l'injecteur. Cela consiste essentiellement à collecter et ranger les composants de services
	 * qu'il reconnait à l'aide d'annotations d'implémentation de service.
	 */
	public InjectorImpl() {
		this.installComponents();
	}

	/**
	 * Retrouve la classe implémentant une interface de service donnée (sans précisee de profile)
	 * @param serviceClass interface de service dont on cherche l'implémentation.
	 * @return la classe d'implémentation
	 */
	Class<?> getImplementationClass(Class<?> serviceClass) {
		return this.getImplementationClass("", serviceClass);
	}

	/**
	 * Retrouve la classe implémentant une interface de service donnée pour un profile donné
	 * @param profile profile associé à l'implémentation
	 * @param serviceClass interface de service dont on cherche l'implémentation.
	 * @return la classe d'implémentation
	 */
	Class<?> getImplementationClass(String profile, Class<?> serviceClass) {
		Map<String, Class<?>> candidateClasses = implementations.get(serviceClass);
		if (candidateClasses==null) {
			throw new SummerException("No registered implementation found for : "+serviceClass);
		}
		Class<?> implementationClass = candidateClasses.get(profile);
		if (implementationClass == null) {
			if (profile.isEmpty())
				throw new SummerException("No default implementation for : "+serviceClass);
			else
				throw new SummerException("No implementation for : "+serviceClass+  " for profile : "+profile);
		}
		return implementationClass;
	}

	/**
	 * Ajoute à un set de profiles en cours d'élaboration, les profils associés à une classe d'implémenation pour un
	 * scope donné.
	 * @param profileNames set de profiles en cours d'élaboration
	 * @param componentClass classe d'implémentation du service
	 * @param scopeAnnotationClass classe de l'annotation recherchée
	 */
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
		else {
			profileNames.add("");
		}
	}

	/**
	 * Retourne la liste de tous les profiles associés à une classe d'implémentation de service.
	 * @param implementationClass classe d'implémentationd de service
	 * @return la liste des profiles associés
	 */
	Set<String> collectProfilesFromScopeAnnotations(Class<?> implementationClass) {
		Set<String> names = new HashSet<String>();
		collectProfilesFromScopeAnnotation(names, implementationClass, OneShotScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, RequestScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, PooledScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, SessionScoped.class);
		collectProfilesFromScopeAnnotation(names, implementationClass, SingletonScoped.class);
		return names;
	}

	/**
	 * Recherche dans une map référençant des composants disponibles, un composant dont la classe est donnée en
	 * paramètre. Si aucun composant de ce type n'est disponible, un nouveau composant est créé
	 * @param componentClass classe d'implémentation du composant recherché
	 * @param components map contenants toutes des instances de composants disponibles (noter que cette méthode est
	 *                   susceptible d'ajouter une entrée à cette map).
	 * @return le composant trouvé ou créé
	 * @throws InstantiationException
	 * @throws IllegalAccessException
	 */
	Object getComponent(Class<?> componentClass, Map<Class<?>, Object> components) 
			throws InstantiationException, IllegalAccessException {
		synchronized (components) {
			Object component = components.get(componentClass);
			if (component == null) {
				component = componentClass.newInstance();
				components.put(componentClass, component);
			}
			return component;
		}
	}

	/**
	 * Recherche un composant de service (sans préciser de profile) implémentant l'interface donné en paramètre.
	 * Le composant estcréé si nécessaiire
	 * @param serviceClass interface de service que doit implémenter le composant.
	 * @return le composant recherché. Cette valeur ne peut être nulle.
	 * @param <T> type de l'interface de service
	 * @throws SummerException si le composant ne peut être construit ou trouvé
	 */
	@Override
	@SuppressWarnings("unchecked")
	public <T> T getComponent(Class<T> serviceClass) {
		Class<?> componentClass = getImplementationClass(serviceClass);
		return (T)getImplementation(componentClass);
	}

	/**
	 * Recherche un composant de service (en précisant un profile) implémentant l'interface donné en paramètre.
	 * Le composant estcréé si nécessaiire
	 * @param profile profile associé à l'implémentation recherchée
	 * @param serviceClass interface de service que doit implémenter le composant.
	 * @return le composant recherché. Cette valeur ne peut être nulle.
	 * @param <T> type de l'interface de service
	 * @throws SummerException si le composant ne peut être construit ou trouvé
	 */
	@Override
	@SuppressWarnings("unchecked")
	public <T> T getComponent(String profile, Class<T> serviceClass) {
		Class<?> componentClass = getImplementationClass(profile, serviceClass);
		return (T)getImplementation(componentClass);
	}

	/**
	 * Map contenant tous les composants singletons (en fonction d eleurs interface de service)
	 */
	Map<Class<?>, Object> singletonScoped = new HashMap<>();
	/**
	 * Map contenant tous les composants en pool (en fonction d eleurs interface de service)
	 */
	Map<Class<?>, List<Object>> pooledScoped = new HashMap<>();
	/**
	 * Map des composants que l'on a associé a la session HTTP courante.
	 */
	Map<HttpSession, Map<Class<?>, Object>> sessionScoped = new WeakHashMap<>();
	/**
	 * Map des composants que l'on a associé a la requête (le thread) courant.
	 */
	ThreadLocal<Map<Class<?>, Object>> requestScoped = new ThreadLocal<>();

	/**
	 * Retourne une instance d'un service (= un composant). La manière de trouver et/ou créer ce composant dépend
	 * du scope pour lequel il a été défini.
	 * @param componentClass classe d'implémentation du composant recherché (attention: il ne s'agit pas ici de
	 *                       l'interface de service, mais celle d'implémentation.
	 * @return le composant trouvé. Cette valeur ne peut pas être nulle.
	 * @throws SummerException si le composant ne peut être construit ou trouvé
	 */
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

	/**
	 * Retourne une instance d'un service (= un composant) définit pour un scope de Session HTTP.
	 * @param componentClass classe d'implémentation du composant recherché (attention: il ne s'agit pas ici de
	 *                       l'interface de service, mais celle d'implémentation.
	 * @return le composant trouvé. Cette valeur ne peut pas être nulle.
	 * @throws SummerException si le composant ne peut être construit ou trouvé
	 */
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

	/**
	 * Retourne une instance d'un service (= un composant) définit pour un scope de Requête HTTP.
	 * @param componentClass classe d'implémentation du composant recherché (attention: il ne s'agit pas ici de
	 *                       l'interface de service, mais celle d'implémentation.
	 * @return le composant trouvé. Cette valeur ne peut pas être nulle.
	 * @throws SummerException si le composant ne peut être construit ou trouvé
	 */
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

	/**
	 * Retourne une instance d'un service (= un composant) définit pour un scope de type pool
	 * @param componentClass classe d'implémentation du composant recherché (attention: il ne s'agit pas ici de
	 *                       l'interface de service, mais celle d'implémentation.
	 * @return le composant trouvé. Cette valeur ne peut pas être nulle.
	 * @throws SummerException si le composant ne peut être construit ou trouvé
	 */
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

	/**
	 * Restitue un composant en fin de l'exécution de la méthode "use". Le seul cas ou il y a quelque chose à faire
	 * (autre que ce que fait le garbage collector) concerne les composants en pool: dans ce cas, le composant est
	 * remis dans le pool.
	 * @param component composant à restituer
	 */
	@Override
	public void releaseComponent(Object component) {
		Class<?> componentClass = component.getClass();
		if (componentClass.getAnnotation(PooledScoped.class)!=null) {
			synchronized(pooledScoped) {
				List<Object> components = pooledScoped.get(componentClass);
				if (components==null) {
					components = new LinkedList<>();
					pooledScoped.put(componentClass, components);
				}
				components.add(component);
			}
		}
	}

	/**
	 * Libere toutes les ressources associées à une requête HTTP
	 */
	void closeThread() {
		requestScoped.remove();
	}

	/**
	 * Enregistre la session HTTP associée à la requête que l'on vient de recevoir
	 * @param session
	 */
	@Override
	public void startThread(HttpSession session) {
		sessions.set(session);
	}

	/**
	 * Désenregistrement de la session HTTP avec le thread
	 */
	@Override
	public void finishThread() {
		sessions.remove();
		closeThread();
	}

	/**
	 * Association entre le thread et la session HTTP
	 */
	ThreadLocal<HttpSession> sessions = new ThreadLocal<>();

	/**
	 * Map référençant toutes les classes d'implémentation en fonction des interfaces qu'elles déclarent. Pour une
	 * interface de service donnée, toutes les implémentations possibles dont référencées dans une sous-map indéxé par
	 * profile (l'implémentation sans profile a comme clé, la chaine vide :"").
	 */
	Map<Class<?>, Map<String, Class<?>>> implementations = new HashMap<>();

	/**
	 * Recheche toutes les classes d'implémentation de services. Ce sont les classes qui possèdent une annotation parmi:
	 * <ul>
	 *     <li>OneShotScoped : un composant est crée à chaque injection</li>
	 *     <li>RequestScoped : le composant est créé pour une requête HTTP donnée</li>
	 *     <li>SessionScoped : le composant est créé pour une session HTTP donnée</li>
	 *     <li>SingletonScoped : un seul composant est créé est partagé entre tous les usages</li>
	 *     <li>PooledScoped : un pool de composant est créé et est partagé entre tous les usages</li>
	 * </ul>
	 */
	void installComponents() {
		Set<Class<?> > componentClasses = new HashSet<>();
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(OneShotScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(RequestScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(SessionScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(SingletonScoped.class));
		componentClasses.addAll(Scanner.get().getSummerClassesAnnotatedBy(PooledScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(OneShotScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(RequestScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(SessionScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(SingletonScoped.class));
		componentClasses.addAll(Scanner.get().getClassesAnnotatedBy(PooledScoped.class));
		registerComponentClasses(componentClasses);
	}

	/**
	 * Enregistrement d'une collection de classes d'implémentation.
	 * @param componentClasses la collectiob des classes d'implémentation à enregistrer
	 */
	void registerComponentClasses(Set<Class<?>> componentClasses) {
		for (Class<?> componentClass : componentClasses) {
			registerComponentClass(componentClass, componentClass);
		}
	}

	/**
	 * Enregistrement d'une classe d'implémentation. On l'enregistre pour sa propre classe (et
	 * superclasses) ainsi que pour toutes ses interfaces (et super-interfaces).
	 * @param serviceClass interface de service
	 * @param componentClass classe d'implémentation
	 */
	void registerComponentClass(Class<?> serviceClass, Class<?> componentClass) {
		if (serviceClass!=null) {
			addImplementation(serviceClass, componentClass);
			registerComponentClass(serviceClass.getSuperclass(), componentClass);
			for (Class<?> interfaceClass : serviceClass.getInterfaces()) {
				registerInterfaceClass(interfaceClass, componentClass);
			}
		}
	}

	/**
	 * Enregistrement d'une classe d'implémentation pour une interface (et récursivement
	 * pour ses super-interfaces).
	 * @param serviceClass interface de service
	 * @param componentClass classe d'implémentation
	 */
	void registerInterfaceClass(Class<?> serviceClass, Class<?> componentClass) {
		addImplementation(serviceClass, componentClass);
		for (Class<?> interfaceClass : serviceClass.getInterfaces()) {
			registerInterfaceClass(interfaceClass, componentClass);
		}
	}

	/**
	 * Associe une interface de service avec sa classe d'implémentation pour un scope donné. Toute la structure
	 * d'enregistrement est mise à jour par cette méthode.
	 * @param serviceClass interface de service
	 * @param componentClass classe d'implémentation
	 */
	void addImplementation(Class<?> serviceClass, Class<?> componentClass) {
		Map<String, Class<?>> implementationForAGivenInterface = implementations.get(serviceClass);
		if (implementationForAGivenInterface==null) {
			implementationForAGivenInterface = new HashMap<>();
			implementations.put(serviceClass, implementationForAGivenInterface);
		}
		for (String profile : this.collectProfilesFromScopeAnnotations(componentClass)) {
			implementationForAGivenInterface.put(profile, componentClass);
		}
	}

	Map<String, List<Object>> values = new HashMap<String, List<Object>>();
	
	@SuppressWarnings("unchecked")
	@Override
	synchronized public <T> T getValue(String valueName) {
		List<Object> values = this.values.get(valueName);
		if (values==null || values.size()==0) return null;
		if (values.size()>1) {
			throw new SummerException("Ambiguious values for : "+valueName);
		}
		return (T)values.get(0);
	}
	
}
