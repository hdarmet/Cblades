package org.summer;

import org.junit.AssumptionViolatedException;
import org.summer.data.BaseEntity;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;

public interface TestSeawave {

	public static void inject(Object bean, String name, Object target) {
		ReflectUtil.set(bean, name, target);
	}
	
	default Map<String, Object> params(Object... params) {
		Map<String, Object> result = new HashMap<>();
		for (int index=0; index<params.length; index+=2) {
			result.put((String)params[index], params[index+1]);
		}
		return result;
	}

	default void setId(BaseEntity entity, long id) {
		try {
			Field idField = BaseEntity.class.getDeclaredField("id");
			idField.setAccessible(true);
			idField.setLong(entity, id);
		} catch (NoSuchFieldException e) {
			throw new RuntimeException(e);
		} catch (IllegalAccessException e) {
			throw new RuntimeException(e);
		}
	}
	
}
