package org.summer.data;

import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;

import org.summer.ReflectUtil;
import org.summer.Scanner;
import org.summer.annotation.Setup;

public class RelationshipRegistry {
	static final Logger log = Logger.getLogger("summer");

	@Setup
	static void setupRelationships() {
		log.info("Inspect entity relationships...");
		DataManager.getEntityClasses().stream().forEach(
			entityClass->{
				Scanner.get().getComponentFieldsAnnotatedBy(entityClass, OneToOne.class).stream().forEach(
					oneToOneRelationship->registerRelationship(oneToOneRelationship,
						oneToOneRelationship.getAnnotation(OneToOne.class).mappedBy())
				);
				Scanner.get().getComponentFieldsAnnotatedBy(entityClass, ManyToOne.class).stream().forEach(
					manyToOneRelationship->registerRelationship(manyToOneRelationship, null)
				);
				Scanner.get().getComponentFieldsAnnotatedBy(entityClass, OneToMany.class).stream().forEach(
					oneToManyRelationship->registerRelationshipCollection(oneToManyRelationship,
						oneToManyRelationship.getAnnotation(OneToMany.class).mappedBy())
				);
				Scanner.get().getComponentFieldsAnnotatedBy(entityClass, ManyToMany.class).stream().forEach(
					manyToManyRelationship->registerRelationshipCollection(manyToManyRelationship,
						manyToManyRelationship.getAnnotation(ManyToMany.class).mappedBy())
				);
			}
		);
		log.info("Entity relationships processed...");
	}
	
	static Map<Field, Field> relationshipReverse = new HashMap<>();
	
	static void registerRelationship(Field field, String mappedBy, Class<?> targetClass) {
		if (!relationshipReverse.containsKey(field)) {
			Field reverseField=null;
			if (mappedBy!=null) {
				reverseField = ReflectUtil.getField(targetClass, mappedBy);
				relationshipReverse.put(reverseField, field);
			}
			relationshipReverse.put(field, reverseField);
		}
	}

	static void registerRelationship(Field field, String mappedBy) {
		registerRelationship(field, mappedBy, field.getClass());
	}

	static void registerRelationshipCollection(Field field, String mappedBy) {
        ParameterizedType targetType = (ParameterizedType) field.getGenericType();
        Class<?> targetClass = (Class<?>) targetType.getActualTypeArguments()[0];
		registerRelationship(field, mappedBy, targetClass);
	}
	
	public static Field getReverseRelationship(Field relationship) {
		return relationshipReverse.get(relationship);
	}
	
}
