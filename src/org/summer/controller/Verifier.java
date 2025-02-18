package org.summer.controller;

import org.summer.ReflectUtil;

import java.lang.reflect.Array;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class Verifier {

	Json json;
	Json result;

	List<String> levels = new ArrayList<String>();

	public Verifier(Json json) {
		this.json = json;
		this.result = null;
	}

	public Verifier(Map<String, ?> params) {
		this.json = Json.createJsonFromMap(params);
		this.result = null;
	}

	public Verifier check(Predicate<Json> predicate, String field, String message) {
		if (!predicate.test(json)) {
			if (this.result==null) {
				this.result = Json.createJsonObject();
			}
			this.result.put(field, message);
		}
		return this;
	}

	public Verifier inspect(String field, Function<Json, Verifier> verifyBuilder) {
		Json json = (Json)this.json.get(field);
		if (json!=null) {
			Verifier verifier = verifyBuilder.apply(json);
			if (verifier.result!=null) {
				if (this.result==null) {
					this.result = Json.createJsonObject();
				}
				this.result.putAll(verifier.result);
			}
		}
		return this;
	}
	
	public Verifier each(String field, Function<Json, Verifier> verifyBuilder) {
		Json jarray = (Json)this.json.get(field);
		this.levels.add(field);
		if (jarray!=null) {
			jarray.forEach(value->{
				Json json = value instanceof Json ? (Json)value : Json.createJsonObject().put("_", value);
				Verifier verifier = verifyBuilder.apply(json);
				if (verifier.result!=null) {
					if (this.result==null) {
						this.result = Json.createJsonObject();
					}
					String path = "";
					for (String level : this.levels) {
						path += level + "-";
					}
					for (String key : verifier.result.keys()) {
						this.result.put(path+key, verifier.result.get(key));
					}
				}
			});
		}
		this.levels.remove(this.levels.size()-1);
		return this;
	}
	
	public Json get() {
		return this.result;
	}
	
	public Verifier ensure() {
		return ensure(result->{ throw new SummerControllerException(400, this.result);});
	}

	public Verifier ensure(Consumer<Json> process) {
		if (this.result!=null) {
			process.accept(this.result);
		}
		return this;
	}

	public Verifier checkWhen(Predicate<Json> predicate, Function<Json, Verifier> verifyBuilder) {
		if (predicate.test(this.json)) {
			verifyBuilder.apply(this.json);
		}
		return this;
	}

	public Verifier checkRequired(String field) {
		return checkRequired(field, "required");
	}

	public Verifier checkRequired(String field, String message) {
		return check(json->json.get(field)!=null, field, message);
	}
	
	public Verifier checkPattern(String field, String pattern, String message) {
		return check(json->json.get(field)==null||
			(json.get(field) instanceof String) &&
			(((String)json.get(field)).matches(pattern)), field, message);
	}

	public Verifier checkPattern(String field, String pattern) {
		return checkPattern(field, pattern, "must matches '"+pattern+"'");
	}

	public <T> Verifier check(String field, Set<T>values) {
		return check(
				json->json.get(field)==null || values.contains(json.get(field)),
				field,
				json.get(field)+" must matches one of ["+
				String.join(", ", values.stream().map(item->item.toString()).collect(Collectors.toList())
		)+"]");
	}

	public <T> Verifier check(String field, T ... values) {
		return check(
			json->{
				if (json.get(field)==null) return true;
				T fieldValue = json.get(field);
				for (T value : values) {
					if (fieldValue.equals(value)) return true;
				}
				return false;
			},
			field,
			json.get(field)+" must matches one of ["+
			String.join(", ", Arrays.stream(values).map(item->item.toString()).collect(Collectors.toList())
		)+"]");
	}

	public Verifier checkMinSize(String field, int size) {
		return checkMinSize(field, size, "must be greater of equals to "+size);
	}
	
	public Verifier checkMaxSize(String field, int size) {
		return checkMaxSize(field, size, "must not be greater than "+size);
	}
	
	public Verifier checkMinSize(String field, int size, String message) {
		return check(json->json.get(field)==null||
				(json.get(field) instanceof String) &&
				(((String)json.get(field)).length()>=size), field, message);
	}
	
	public Verifier checkMaxSize(String field, int size, String message) {
		return check(json->json.get(field)==null||
				(json.get(field) instanceof String) &&
				(((String)json.get(field)).length()<=size), field, message);
	}
	
	public Verifier checkMin(String field, int min) {
		return checkMin(field, min, "must be greater or equal to "+min);
	}
	
	public Verifier checkMax(String field, int max) {
		return checkMax(field, max, "must not be greater than "+max);
	}
	
	public Verifier checkMin(String field, Number min, String message) {
		return check(json->json.get(field)==null||
				(json.get(field) instanceof Number) &&
				(((Number)json.get(field)).doubleValue()>=min.doubleValue()), field, message);
	}
	
	public Verifier checkMax(String field, Number max, String message) {
		return check(json->json.get(field)==null||
				(json.get(field) instanceof Number) &&
				(((Number)json.get(field)).doubleValue()<=max.doubleValue()), field, message);
	}

	public Verifier checkDate(String field, String message) {
		return check(json->{
			if (json.get(field)==null) return true;
			if (!(json.get(field) instanceof String)) return false;
			try {
				new SimpleDateFormat("yyyy-MM-dd").parse((String)json.get(field));
			} catch (ParseException e) {
				return false;
			}
			return true;
		}, field, message);
	}

	public Verifier checkInteger(String field, String message) {
		return check(json->json.get(field)==null||
			(json.get(field) instanceof Integer),
			field, message);
	}

	public Verifier checkString(String field, String message) {
		return check(json->json.get(field)==null||
			(json.get(field) instanceof String), field, message);
	}

	public Verifier checkLong(String field, String message) {
		return check(json->json.get(field)==null||
			(json.get(field) instanceof Long), field, message);
	}

	public Verifier checkFloat(String field, String message) {
		return check(json->json.get(field)==null||
				(json.get(field) instanceof Float), field, message);
	}

	public Verifier checkDouble(String field, String message) {
		return check(json->json.get(field)==null||
				(json.get(field) instanceof Double), field, message);
	}

	public Verifier checkInteger(String field) {
		return checkInteger(field, "not a valid integer");
	}

	public Verifier checkDate(String field) {
		return checkDate(field, "not a valid date");
	}

	public Verifier checkFloat(String field) {
		return checkFloat(field, "not a valid float");
	}

	public Verifier checkDouble(String field) {
		return checkDouble(field, "not a valid double");
	}

	public Verifier checkString(String field) {
		return checkString(field, "not a valid string");
	}

	public Verifier checkEmail(String field, String message) {
		return checkPattern(field, "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$", 
				message);
	}

	public Verifier checkEmail(String field) {
		return checkEmail(field, "not a valid email");
	}

	public Verifier checkBoolean(String field, String message) {
		return check(json->json.get(field)==null||(json.get(field) instanceof Boolean), field, message);
	}

	public Verifier checkBoolean(String field) {
		return checkBoolean(field, "not a valid boolean");
	}

	public Verifier checkEnum(String field, String message, Object[] options) {
		String[] reason = new String[1];
		return check(json->{
			Object value= json.get(field);
			if (value==null) return true;
			for (Object option : options) {
				if (value.equals(option)) return true;
			}
			StringBuilder sb = new StringBuilder();
			for (Object option : options) {
				if (sb.length()>0) sb.append(", ");
				sb.append(option.toString());
			}
			reason[0] = sb.toString();
			return false;
		}, field, reason[0]);
	}

	public Verifier checkEnum(String field, Object ...values) {
		return checkEnum(field, "not a valid value: [%s]", values);
	}

}
