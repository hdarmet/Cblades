package org.summer;

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
	
}
