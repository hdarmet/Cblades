package org.summer.data;

import java.lang.reflect.Field;
import java.util.Collection;

import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;

import org.summer.ReflectUtil;
import org.summer.SummerException;

public interface RelationshipOwnerSeawave {

	default <T> Class<?> getType(T thisEntity, String thisFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		return thisField.getType();
	}

	default <T, E> void setOneToOne(T thisEntity, String thisFieldName, E entity, String reverseFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = reverseFieldName==null ? null : ReflectUtil.getField(entity.getClass(), reverseFieldName);
		setOneToOne(thisEntity, thisField, entity, reverseField);
	}
	
	default <T, E> void setManyToOne(T thisEntity, String thisFieldName, E entity, String reverseFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = reverseFieldName==null ? null : ReflectUtil.getField(entity.getClass(), reverseFieldName);
		setManyToOne(thisEntity, thisField, entity, reverseField);
	}

	default <T, E> void addOneToMany(T thisEntity, String thisFieldName, E entity, String reverseFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = reverseFieldName==null ? null : ReflectUtil.getField(entity.getClass(), reverseFieldName);
		addOneToMany(thisEntity, thisField, entity, reverseField);
	}

	default <T, E> void removeOneToMany(T thisEntity, String thisFieldName, E entity, String reverseFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = reverseFieldName==null ? null : ReflectUtil.getField(entity.getClass(), reverseFieldName);
		removeOneToMany(thisEntity, thisField, entity, reverseField);
	}

	default <T,E> void addManyToMany(T thisEntity, String thisFieldName, E entity, String reverseFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = reverseFieldName==null ? null : ReflectUtil.getField(entity.getClass(), reverseFieldName);
		addManyToMany(thisEntity, thisField, entity, reverseField);
	}

	default <T,E> void removeManyToMany(T thisEntity, String thisFieldName, E entity, String reverseFieldName) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = reverseFieldName==null ? null : ReflectUtil.getField(entity.getClass(), reverseFieldName);
		removeManyToMany(thisEntity, thisField, entity, reverseField);
	}

	default <T, E> void setOneToOne(T thisEntity, Field thisField, E entity, Field reverseField) {
		E thatEntity = ReflectUtil.get(thisEntity, thisField);
		if (thatEntity!=null && reverseField!=null) {
			ReflectUtil.set(thatEntity, reverseField, null);
		}
		ReflectUtil.set(thisEntity, thisField, entity);
		if (entity!=null && reverseField!=null) {
			thatEntity = ReflectUtil.get(entity, reverseField);
			if (thatEntity!=null) {
				ReflectUtil.set(thatEntity, thisField, null);
			}
			ReflectUtil.set(entity, reverseField, thisEntity);
		}
	}
	
	default <T, E> void setManyToOne(T thisEntity, Field thisField, E entity, Field reverseField) {
		E thatEntity = ReflectUtil.get(thisEntity, thisField);
		if (thatEntity!=entity) {
			if (thatEntity!=null && reverseField!=null) {
				Collection<T> thatField = ReflectUtil.get(thatEntity, reverseField);
				thatField.remove(thisEntity);
			}
			if (entity!=null && reverseField!=null) {
				Collection<T> thatField = ReflectUtil.get(entity, reverseField);
				thatField.add(thisEntity);
			}
			ReflectUtil.set(thisEntity, thisField, entity);
		}
	}

	default <T, E> void addOneToMany(T thisEntity, Field thisField, E entity, Field reverseField) {
		Collection<E> thisCollection = ReflectUtil.get(thisEntity, thisField);
		if (!thisCollection.contains(entity)) {
			if (reverseField!=null) {
				T thatEntity = ReflectUtil.get(entity, reverseField);
				if (thatEntity!=null) {
					Collection<E> thatCollection = ReflectUtil.get(thatEntity, thisField);
					thatCollection.remove(entity);
				}
				ReflectUtil.set(entity, reverseField, thisEntity);
			}
			thisCollection.add(entity);
		}
	}

	default <T, E> void removeOneToMany(T thisEntity, Field thisField, E entity, Field reverseField) {
		Collection<E> thisCollection = ReflectUtil.get(thisEntity, thisField);
		if (thisCollection.contains(entity)) {
			thisCollection.remove(entity);
			if (reverseField!=null) {
				ReflectUtil.set(entity, reverseField, null);
			}
		}
	}

	default <T,E> void addManyToMany(T thisEntity, Field thisField, E entity, Field reverseField) {
		Collection<E> thisCollection = ReflectUtil.get(thisEntity, thisField);
		if (!thisCollection.contains(entity)) {
			thisCollection.add(entity);
			if (reverseField!=null) {
				Collection<T> thatCollection = ReflectUtil.get(entity, reverseField);
				thatCollection.add(thisEntity);
			}
		}
	}

	default <T,E> void removeManyToMany(T thisEntity, Field thisField, E entity, Field reverseField) {
		Collection<E> thisCollection = ReflectUtil.get(thisEntity, thisField);
		if (thisCollection.contains(entity)) {
			thisCollection.remove(entity);
			if (reverseField!=null) {
				Collection<T> thatCollection = ReflectUtil.get(entity, reverseField);
				thatCollection.remove(thisEntity);
			}
		}
	}
	
	default <T, U> void set(T thisEntity, String thisFieldName, U entity) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = RelationshipRegistry.getReverseRelationship(thisField);
		if (thisField.getAnnotation(OneToOne.class)!=null) {
			setOneToOne(thisEntity, thisField, entity, reverseField);
		}
		else if (thisField.getAnnotation(ManyToOne.class)!=null) {
			setManyToOne(thisEntity, thisField, entity, reverseField);
		}
		else {
			throw new SummerException("Not a simple relationship : "+thisEntity.getClass()+"."+thisFieldName);
		}
	}

	default <T, U> void add(T thisEntity, String thisFieldName, U entity) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = RelationshipRegistry.getReverseRelationship(thisField);
		if (thisField.getAnnotation(OneToMany.class)!=null) {
			addOneToMany(thisEntity, thisField, entity, reverseField);
		}
		else if (thisField.getAnnotation(ManyToMany.class)!=null) {
			addManyToMany(thisEntity, thisField, entity, reverseField);
		}
		else {
			throw new SummerException("Not a collection relationship : "+thisEntity.getClass()+"."+thisFieldName);
		}
	}
	
	default <T, U> void remove(T thisEntity, String thisFieldName, U entity) {
		Field thisField = ReflectUtil.getField(thisEntity.getClass(), thisFieldName);
		Field reverseField = RelationshipRegistry.getReverseRelationship(thisField);
		if (thisField.getAnnotation(OneToMany.class)!=null) {
			removeOneToMany(thisEntity, thisField, entity, reverseField);
		}
		else if (thisField.getAnnotation(ManyToMany.class)!=null) {
			removeManyToMany(thisEntity, thisField, entity, reverseField);
		}
		else {
			throw new SummerException("Not a collection relationship : "+thisEntity.getClass()+"."+thisFieldName);
		}
	}
	
}
