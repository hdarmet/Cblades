package org.summer;

import org.summer.data.BaseEntity;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class ReflectUtil {

	static Map<Class<?>, Map<String, Method>> getters = Collections.synchronizedMap(new HashMap<>());
	
	public static Map<String, Method> getGetters(Class<?> klass) {
		Map<String, Method> getters = ReflectUtil.getters.get(klass);
		if (getters==null) {
			getters = Arrays.asList(klass.getMethods()).stream()
			.filter(method->{
				return method.getParameterCount()==0 && (
					(method.getName().length()>3 && method.getName().startsWith("get")
							&& method.getReturnType()!=Void.TYPE) ||
					(method.getName().length()>2 && method.getName().startsWith("is")
					&& (method.getReturnType()!=Boolean.class || method.getReturnType()!=Boolean.TYPE))
				);
			})
			.collect(Collectors.toMap(method->canonize(method.getName(), "get", "is"), method->method));
			ReflectUtil.getters.put(klass, getters);
		}
		return getters;
	}

	static Map<Class<?>, Map<String, Method>> setters = Collections.synchronizedMap(new HashMap<>());

	public static Map<String, Method> getSetters(Class<?> klass) {
		Map<String, Method> setters = ReflectUtil.setters.get(klass);
		if (setters==null) {
			setters = Arrays.asList(klass.getMethods()).stream()
			.filter(method->{
				return method.getParameterCount()==1 && (
					method.getName().length()>3 && method.getName().startsWith("set")
				);
			})
			.collect(Collectors.toMap(method->canonize(method.getName(), "set"), method->method));
			ReflectUtil.setters.put(klass, setters);
		}
		return setters;
	}

	public static Method getGetter(Class<?> klass, String fieldName) {
		return getGetters(klass).get(fieldName);
	}

	public static Method getSetter(Class<?> klass, String fieldName) {
		return getSetters(klass).get(fieldName);
	}

	public static <T> Field getField(Class<T> klass, String fieldName) {
		try {
			Field field = klass.getDeclaredField(fieldName);
			return field;
		} 
		catch (NoSuchFieldException e) {
			if (klass.equals(Object.class)) {
				return null;
			}
			return getField(klass.getSuperclass(), fieldName);
		} 
		catch (SecurityException e) {
			throw new SummerException("Unexpected exception. Probably a bug", e);
		}
	}

	static Map<Class<?>, Collection<Field>> fields = Collections.synchronizedMap(new HashMap<>());

	public static Collection<Field> getFields(Class<?> klass) {
		Collection<Field> allFields = fields.get(klass);
		if (allFields==null) {
			allFields = new ArrayList<Field>();
			try {
				Class<?> currentKlass = klass;
				do {
					allFields.addAll(Arrays.asList(klass.getDeclaredFields()));
					currentKlass = currentKlass.getSuperclass();
				} while (klass.equals(Object.class));
				fields.put(klass, allFields);
			} 
			catch (SecurityException e) {
				throw new SummerException("Unexpected exception. Probably a bug", e);
			}
		}
		return Collections.unmodifiableCollection(allFields);
	}

	static Map<Class<?>, Collection<Method>> methods = Collections.synchronizedMap(new HashMap<>());

	public static Collection<Method> getMethods(Class<?> klass) {
		Collection<Method> allMethods = methods.get(klass);
		if (allMethods==null) {
			allMethods = new ArrayList<Method>();
			try {
				Class<?> currentKlass = klass;
				do {
					allMethods.addAll(Arrays.asList(klass.getDeclaredMethods()));
					currentKlass = currentKlass.getSuperclass();
				} while (klass.equals(Object.class));
				methods.put(klass, allMethods);
			} 
			catch (SecurityException e) {
				throw new SummerException("Unexpected exception. Probably a bug", e);
			}
		}
		return Collections.unmodifiableCollection(allMethods);
	}
	
	@SuppressWarnings("unchecked")
	public static <T, E> T get(E thisEntity, Field field) {
		field.setAccessible(true);
		try {
			return (T)field.get(thisEntity);
		} catch (IllegalArgumentException | IllegalAccessException e) {
			throw new SummerException("Unexpected exception. Probably a bug", e);
		}
	}

	static Object convert(Object value, Class<?> type) {
		if (value==null) return null;
		if (type.isInstance(value)) return value;
		if ((type == Float.class || type == Float.TYPE) && value instanceof Number) {
			return ((Number)value).floatValue();
		}
		if ((type == Double.class || type == Double.TYPE) && value instanceof Number) {
			return ((Number)value).doubleValue();
		}
		if ((type == Integer.class || type == Integer.TYPE) && value instanceof Number) {
			return ((Number)value).intValue();
		}
		if ((type == Long.class || type == Long.TYPE) && value instanceof Number) {
			return ((Number)value).longValue();
		}
		return value;
	}

	public static <T, E> void set(E thisEntity, Field field, T value) {
		field.setAccessible(true);
		try {
			field.set(thisEntity, convert(value, field.getType()));
		} catch (IllegalArgumentException | IllegalAccessException e) {
			throw new SummerException("Unexpected exception. Probably a bug", e);
		}
	}

	public static <T, E> T get(E thisEntity, String fieldName) {
		String[] paths = fieldName.split("\\.");
		Object entity = thisEntity;
		for (int index=0; index<paths.length-1; index++) {
			Field field = getField(thisEntity.getClass(), paths[index]);
			entity = get(entity, field);
			if (entity==null) return null;
		}
		Field field = getField(entity.getClass(), paths[paths.length-1]);
		return get(entity, field);
	}

	public static <T, E> void set(E thisEntity, String fieldName, T value) {
		String[] paths = fieldName.split("\\.");
		Object entity = thisEntity;
		for (int index=0; index<paths.length-1; index++) {
			Field field = getField(thisEntity.getClass(), paths[index]);
			entity = get(entity, field);
			if (entity==null) return;
		}
		Field field = getField(entity.getClass(), paths[paths.length-1]);
		set(thisEntity, field, value);
	}
	
	public static String canonize(String name, String... prefixes) {
		for (String prefix : prefixes) {
			if (name.startsWith(prefix)) {
				Character firstCharacterInLowerCase = Character.toLowerCase(name.charAt(prefix.length()));
				if (name.length()>prefix.length()+1) {
					return firstCharacterInLowerCase + name.substring(prefix.length()+1);
				}
				else {
					return firstCharacterInLowerCase + "";
				}
			}
		}
		throw new SummerException("Name cannot be canonized : "+name);
	}
	
	
	public static Type getCollectionType(Field field) {
		ParameterizedType type = (ParameterizedType)field.getGenericType();
		return type.getActualTypeArguments()[0];
	}

	public static <E> Type getCollectionType(Class<E> klass, String fieldName) {
		Field field = getField(klass, fieldName);
		return getCollectionType(field);
	}

	public static <E> Type getCollectionType(E thisEntity, String fieldName) {
		return getCollectionType(thisEntity.getClass(), fieldName);
	}

	public static <E> Type getType(E thisEntity, String fieldName) {
		return getType(thisEntity.getClass(), fieldName);
	}

	public static <E> Type getType(Class<E> klass, String fieldName) {
		Field field = getField(klass, fieldName);
		return field.getType();
	}

	public static <E> E newInstance(Class<E> clazz) {
		try {
			return clazz.newInstance();
		} catch (InstantiationException | IllegalAccessException e) {
			throw new SummerException("Unexpected exception. Probably a bug", e);
		}
	}

}
