package org.summer.controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.summer.ReflectUtil;
import org.summer.SummerException;

public class Json implements Iterable {

	static final String JSON_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX";
	
	JSONObject json = null;
	JSONArray jsonArray = null;
	
	Json(JSONObject json) {
		this.json = json;
	}

	Json(JSONArray jsonArray) {
		this.jsonArray = jsonArray;
	}
	
	public static Json createJsonFromRequest(BufferedReader reader) throws IOException {
		StringBuffer jsonBuffer = new StringBuffer();
		String line = null;
		while ((line = reader.readLine()) != null) {
			jsonBuffer.append(line);
		}
		String content = jsonBuffer.toString().trim();
		if (content.length()==0) {
			return createJsonObject();
		}
		else {
			return createJsonFromString(content);
		}
	}
	
	public static Json createJsonFromString(String content) {
		Object json;
		try {
			json = new JSONObject(new JSONTokener(content));
			return new Json((JSONObject)json);
		} catch (JSONException e) {
			try {
				json = new JSONArray(new JSONTokener(content));
				return new Json((JSONArray)json);
			} catch (JSONException e2) {
				throw new SummerException("Malformed JSON content : "+content, e2);
			}
		}
	}

	public static Json createJsonFromMap(Map<String, ?> content) {
		Object json;
		try {
			json = new JSONObject(content);
			return new Json((JSONObject)json);
		} catch (JSONException e) {
			try {
				json = new JSONArray(content);
				return new Json((JSONArray)json);
			} catch (JSONException e2) {
				throw new SummerException("Malformed JSON content : "+content, e2);
			}
		}
	}
	
	public static Json createJsonObject() {
		return new Json(new JSONObject());
	}
	
	public static Json createJsonArray() {
		return new Json(new JSONArray());
	}
	
	Object jsonGet(JSONObject object, String name) {
		try {
			return this.json.isNull(name) ? null : this.json.get(name);
		}
		catch (JSONException jse) {
			return null;
		}	
	}
	
	@SuppressWarnings("unchecked")
	public <T> T get(String name, String... aliases) {
		if (this.json==null) {
			return null;
		}
		else {
			Object value = jsonGet(this.json, name);
			if (value!=null) {
				return (T)jsonify(value);
			}
			for (String alias : aliases) {
				value = jsonGet(this.json, alias);
				if (value!=null) {
					return (T)jsonify(value);
				}
			}
			return null;
		}
	}

	public <T> T search(String path) {
		String[] names = path.split("\\.");
		Object value = this;
		for (String name : names) {
			if (value == null) return null;
			value = ((Json)value).get(name);
		}
		return (T)value;
	}

	public boolean isArray() {
		return jsonArray != null;
	}

	public Long getLong(String name, String... aliases) {
		Integer value = get(name, aliases);
		return value==null ? null : new Long(value);
	}

	public Integer getInteger(String name, String... aliases) {
		Integer value = get(name, aliases);
		return value==null ? null : new Integer(value);
	}

	public Json getJson(String name, String... aliases) {
		return (Json)get(name, aliases);
	}

	public Json read(Object src, String... names) {
		if (this.json==null) {
			throw new SummerException("JSON Array instead of JSON Object");
		}
		try {
			Map<String, Method> getters = ReflectUtil.getGetters(src.getClass());
			for (String name : names) {
				Method getMethod = getters.get(name);
				if (getMethod==null) {
					throw new SummerException("No get accessor \""+name+"\" in class : "+src.getClass());
				}
				Object value = getMethod.invoke(src);
				this.json.put(name, value);
			}
		} catch (IllegalAccessException 
				| IllegalArgumentException
				| InvocationTargetException e) 
		{
			throw new SummerException("Unexcepted exception, probably a bug.", e);
		}
		return this;
	}

	public <T> T write(T dest, String... names) {
		if (this.json==null) {
			throw new SummerException("JSON Array instead of JSON Object");
		}
		try {
			Map<String, Method> setters = ReflectUtil.getSetters(dest.getClass());
			for (String name : names) {
				Method setMethod = setters.get(name);
				if (setMethod==null) {
					throw new SummerException("No set accessor \""+name+"\" in class : "+dest.getClass());
				}
				Object value = this.json.get(name);
				setMethod.invoke(dest, value);
			}
		} catch (IllegalAccessException 
				| IllegalArgumentException
				| InvocationTargetException e) 
		{
			throw new SummerException("Unexcepted exception, probably a bug.", e);
		}
		return dest;
	}

	public Json readField(Object src, String fieldName, String jsonAttribute) {
		if (this.json==null) {
			throw new SummerException("JSON Array instead of JSON Object");
		}
		try {
			Map<String, Method> getters = ReflectUtil.getGetters(src.getClass());
			Method getMethod = getters.get(fieldName);
			if (getMethod==null) {
				throw new SummerException("No get accessor \""+fieldName+"\" in class : "+src.getClass());
			}
			Object value = getMethod.invoke(src);
			this.json.put(jsonAttribute, value);
		} catch (IllegalAccessException 
				| IllegalArgumentException
				| InvocationTargetException e) 
		{
			throw new SummerException("Unexcepted exception, probably a bug.", e);
		}
		return this;
	}

	public <T> T writeField(T dest, String fieldName, String jsonAttribute) {
		if (this.json==null) {
			throw new SummerException("JSON Array instead of JSON Object");
		}
		try {
			Map<String, Method> setters = ReflectUtil.getSetters(dest.getClass());
			Method setMethod = setters.get(fieldName);
			if (setMethod==null) {
				throw new SummerException("No set accessor \""+fieldName+"\" in class : "+dest.getClass());
			}
			setMethod.invoke(dest, this.json.get(fieldName));
		} catch (IllegalAccessException 
				| IllegalArgumentException
				| InvocationTargetException e) 
		{
			throw new SummerException("Unexcepted exception, probably a bug.", e);
		}
		return dest;
	}

	public Object get(int index) {
		if (this.jsonArray==null) {
			return null;
		}
		else {
			Object value = this.jsonArray.get(index);
			return jsonify(value);
		}
	}

	public Json getJson(int index) {
		return (Json)get(index);
	}

	public Json put(String name, Object value, String... aliases) {
		value = translateValue(value);
		if (this.json==null) {
			throw new SummerException("JSON Array instead of JSON Object");
		}
		if (value==null) {
			this.json.remove(name);
		}
		else {
			this.json.put(name, unjsonify(value));
		}
		for (String alias : aliases) {
			if (value==null) {
				this.json.remove(alias);
			}
			else {
				this.json.put(alias, unjsonify(value));
			}
		}
		return this;
	}
	
	public Json putAll(Json from) {
		if (this.json!=null) {
			for (String key : from.json.keySet()) {
				this.json.put(key, from.json.get(key));
			}
		}
		else {
			for (int index=0; index<this.jsonArray.length(); index++) {
				this.jsonArray.put(this.jsonArray.get(index));
			}
		}
		return this;
	}

	public Json put(int index, Object value) {
		value = translateValue(value);
		if (this.jsonArray==null) {
			throw new SummerException("JSON Object instead of JSON Array");
		}
		this.jsonArray.put(index, unjsonify(value));
		return this;
	}

	public int size() {
		if (this.jsonArray==null) {
			throw new SummerException("JSON Object instead of JSON Array");
		}
		return this.jsonArray.length();
	}
	
	public Json push(Object value) {
		if (this.jsonArray==null) {
			throw new SummerException("JSON Object instead of JSON Array");
		}
		this.jsonArray.put(unjsonify(value));
		return this;
	}

	@SuppressWarnings("rawtypes")
	static class JsonIterator implements Iterator {

		Iterator iterator;
		
		JsonIterator(Iterator iterator) {
			this.iterator = iterator;
		}
		
		@Override
		public boolean hasNext() {
			return iterator.hasNext();
		}

		@Override
		public Object next() {
			return jsonify(this.iterator.next());
		}

	}

	@SuppressWarnings({ "rawtypes", "unchecked" })
	@Override
	public Iterator iterator() {
		if (this.jsonArray==null) {
			throw new SummerException("JSON Object instead of JSON Array");
		}
		return new JsonIterator(this.jsonArray.iterator());
	}

	public Set<String> keys() {
		if (this.json==null) {
			throw new SummerException("JSON Array instead of JSON Object");
		}
		return this.json.keySet();
	}

	@Override
	public String toString() {
		return this.json==null ? this.jsonArray.toString() : this.json.toString();
	}

	@Override
	public int hashCode() {
		return this.json==null ? this.jsonArray.hashCode() : this.json.hashCode();
	}
	
	@Override 
	public boolean equals(Object object) {
		if (object==null || !(object instanceof Json)) {
			return false;
		}
		Json json = (Json)object;
		if ((this.json!=null) != (json.json!=null)) {
			return false;
		}
		return this.json!=null ? this.json.equals(json.json) : this.jsonArray.equals(json.jsonArray);
	}
	
	static Object jsonify(Object value) {
		if (value!=null) {
			if (value instanceof Json) {
				return (Json)value;
			}
			else if (value instanceof JSONObject) {
				return new Json((JSONObject)value);
			}
			else if (value instanceof JSONArray) {
				return new Json((JSONArray)value);
			}
			else {
				return translateValue(value);
			}
		}
		else {
			return null;
		}	
	}
	
	static Object unjsonify(Object value) {
		if (value!=null) {
			if (value instanceof Json) {
				return ((Json)value).json!=null ? ((Json)value).json : ((Json)value).jsonArray;
			}
			else {
				return value;
			}
		}
		else {
			return null;
		}	
	}

	static void checkValue(Object value) {
		if (value!=null &&
				!(value instanceof Json) &&
				!(value instanceof Integer) && 
				!(value instanceof Long) &&
				!(value instanceof Float) &&
				!(value instanceof Double) &&
				!(value instanceof Boolean) &&
				!(value instanceof String)) {
			throw new SummerException("Illegal Json value type : "+value.getClass());
		}
	}
	
	@SuppressWarnings("rawtypes")
	static Object translateValue(Object value) {
		if (value instanceof Collection) {
			Json array = createJsonArray();
			for (Object item : ((Collection)value)) {
				array.push(translateValue(item));
			}
			return array;
		}
		else {
			checkValue(value);
			return value;
		}
	}
	
	public static Date parseDate(String jsonDate) {
		SimpleDateFormat dateFormatter = new SimpleDateFormat(JSON_DATE_FORMAT);
		try {
			return dateFormatter.parse(jsonDate);
		} catch (ParseException e) {
			throw new SummerException(e);
		}
	}
	
	public static String jsonDate(Date date) {
		SimpleDateFormat dateFormatter = new SimpleDateFormat(JSON_DATE_FORMAT);
		return dateFormatter.format(date);
	}
}
