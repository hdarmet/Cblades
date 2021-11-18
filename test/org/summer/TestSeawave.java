package org.summer;

import java.util.HashMap;
import java.util.Map;

public interface TestSeawave {

	public static void inject(Object bean, String name, Object target) {
		ReflectUtil.set(bean, name, target);
	}
	
	default Map<String, String> params(String... params) {
		Map<String, String> result = new HashMap<>();
		for (int index=0; index<params.length; index+=2) {
			result.put(params[index], params[index+1]);
		}
		return result;
	}
	
}
