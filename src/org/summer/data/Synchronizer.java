package org.summer.data;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Map;
import java.util.function.*;

import javax.persistence.EntityManager;
import javax.persistence.EntityNotFoundException;

import org.summer.ReflectUtil;
import org.summer.SummerException;
import org.summer.controller.Json;
import org.summer.controller.Verifier;

public class Synchronizer implements DataSunbeam {

	Json json;
	BaseEntity target;
	RelationshipOwnerSeawave relationshipWave = new RelationshipOwnerSeawave() {};
	
	public Synchronizer(Json json, BaseEntity target) {
		this.json = json;
		this.target = target;
	}

	@SuppressWarnings("unchecked")
	public <E extends BaseEntity> Synchronizer process(BiConsumer<Json, E> processor) {
		processor.accept(this.json, (E)this.target);
		return this;
	}
	
	public <T, V> Synchronizer copy(Supplier<T> supplier, Consumer<V> consumer, Function<T, V> converter) {
		T readValue = supplier.get();
		if (readValue!=null) {
			V convertedValue = converter.apply(readValue);
			consumer.accept(convertedValue);
		}
		return this;
	}

	public <E extends BaseEntity> Synchronizer syncWhen(BiPredicate<Json, E> predicate, BiConsumer<Json, E> updater) {
		if (predicate.test(this.json, (E)this.target)) {
			updater.accept(this.json, (E)this.target);
		}
		return this;
	}

	@SuppressWarnings({ "unchecked", "rawtypes" })
	public Synchronizer write(String jsonFieldName, String targetFieldName, Function ... functions) {
		Object readValue = this.json.search(jsonFieldName);
		for (Function function: functions) {
			readValue = function.apply(readValue);
		}
		if (readValue!=null) {
			ReflectUtil.set(this.target, targetFieldName, readValue);
		}
		return this;
	}
	
	@SafeVarargs
	final public <T, R> Synchronizer write(String fieldName, Function<T, R> ... functions) {
		return write(fieldName, fieldName, functions);
	}

	public <E extends BaseEntity, P> Synchronizer writeRef(
		String jsonFieldName, String targetFieldName,
		Function<P, E> entityGetter)
	{
		assert(jsonFieldName!=null && !jsonFieldName.isEmpty() && targetFieldName!=null && !targetFieldName.isEmpty());
		P value = this.json.search(jsonFieldName);
		if (value == null) {
			relationshipWave.set(this.target, targetFieldName, null);
		}
		else {
			E targetEntity = entityGetter.apply(value);
			if (targetEntity == null) {
				Class<?> clazz = relationshipWave.getType(this.target, targetFieldName);
				throw new EntityNotFoundException(String.format("%s not found for value: %s", clazz.getSimpleName(), value.toString()));
			} else {
				E entity = ReflectUtil.get(this.target, targetFieldName);
				if (entity != targetEntity) {
					relationshipWave.set(this.target, targetFieldName, targetEntity);
				}
			}
		}
		return this;
	}

	public <E extends BaseEntity, P> Synchronizer writeRef(
			String fieldName,
			Function<P, E> entityGetter)
	{
		return this.writeRef(fieldName, fieldName, entityGetter);
	}

	public <E extends BaseEntity> Synchronizer writeLink(
			String jsonFieldName, String targetFieldName,
			Function<Json, Long> idGetter,
			Function<Json, E> creator, 
			BiConsumer<Json, E> updater)
	{
		assert(jsonFieldName!=null && !jsonFieldName.isEmpty() && targetFieldName!=null && !targetFieldName.isEmpty());
		Json json = this.json.search(jsonFieldName);
		if (json==null) {
			relationshipWave.set(this.target, targetFieldName, null);
		}
		else {
			Long id = idGetter.apply(json);
			E entity;
			if (id == null) {
				entity = creator.apply(json);
				if (entity==null) {
					throw new EntityNotFoundException();
				}
				relationshipWave.set(this.target, targetFieldName, entity);
			}
			else {
				entity = ReflectUtil.get(this.target, targetFieldName);
			}
			updater.accept(json, entity);
		}
		return this;
	}

	public <E extends BaseEntity> Synchronizer writeLink(
			String fieldName,
			Function<Json, E> creator,
			BiConsumer<Json, E> updater)
	{
		return writeLink(fieldName, fieldName, 
				json->json.getLong("id"), 
				creator,
				updater);
	}
	
	@SuppressWarnings("unchecked")
	public <E extends BaseEntity> Synchronizer writeLink(
			String jsonFieldName, String targetFieldName, 
			BiConsumer<Json, E> updater)
	{
		Class<E> entityClass = (Class<E>)ReflectUtil.getType(this.target, targetFieldName);
		Function<Json, E> creator = new EntityCreator<>(entityClass);
		return writeLink(jsonFieldName, targetFieldName, 
				json->json.getLong("id"), 
				creator,
				updater);
	}

	public <E extends BaseEntity> Synchronizer writeLink(
			String fieldName, 
			BiConsumer<Json, E> updater)
	{
		return writeLink(fieldName, fieldName, updater);
	}
	
	@SuppressWarnings("unchecked")
	public <E extends BaseEntity> Synchronizer writeLink(
		String jsonFieldName,
		String targetFieldName,
		EntityManager em)
	{
		Class<E> entityClass = (Class<E>)ReflectUtil.getType(this.target, targetFieldName);
		Function<Json, E> finder = new EntityFinder<>(em, entityClass);
		return writeLink(jsonFieldName, targetFieldName, 
				json->json.getLong("id"), 
				finder,
				null);
	}

	public <E extends BaseEntity> Synchronizer writeLink(
		String collectionName,
		EntityManager em)
	{
		return writeLink(collectionName, collectionName, em);
	}
	
	public <E extends BaseEntity> Synchronizer syncEach(
		String jsonCollName, String targetCollName,
		Function<Json, Long> idGetter,
		Function<Json, E> creator,
		BiConsumer<Json, E> updater)
	{
		Json dtos = this.json.search(jsonCollName);
		Collection<E> entities = ReflectUtil.get(this.target, targetCollName);
		syncPersistentCollection(
				// FIXME
			()->entities, dtos, idGetter, creator,
			entity->relationshipWave.add(this.target, targetCollName, entity),
			entity->relationshipWave.remove(this.target, targetCollName, entity),
			updater);
		return this;
	}

	public <E extends BaseEntity> Synchronizer syncEach(
		String collectionName,
		Function<Json, E> creator,
		BiConsumer<Json, E> updater)
	{
		return syncEach(collectionName, collectionName, 
			json->json.getLong("id"),
			creator,
			updater);
	}

	public <E extends BaseEntity, J> Synchronizer syncEach(
		String jsonCollName, String targetCollName,
		Function<J, E> entityGetter)
	{
		Json dtos = this.json.search(jsonCollName);
		Collection<E> targetEntities = new ArrayList<>();
		for (Object value : dtos) {
			targetEntities.add(entityGetter.apply((J)value));
		}
		Collection<E> entities = ReflectUtil.get(this.target, targetCollName);
		syncPersistentCollection(
			()->entities, ()->targetEntities,
			entity->relationshipWave.add(this.target, targetCollName, entity),
			entity->relationshipWave.remove(this.target, targetCollName, entity));
		return this;
	}

	public <E extends BaseEntity, J> Synchronizer syncEach(
			String collName,
			Function<J, E> entityGetter)
	{
		return syncEach(collName, collName, entityGetter);
	}

	public <E extends BaseEntity> Synchronizer syncEach(
		String collectionName,
		BiConsumer<Json, E> updater)
	{
		@SuppressWarnings("unchecked")
		Class<E> entityClass = (Class<E>)ReflectUtil.getCollectionType(ReflectUtil.getField(this.target.getClass(), collectionName));		
		Function<Json, E> creator = new EntityCreator<>(entityClass);
		return syncEach(collectionName, collectionName, 
				json->json.getLong("id"), 
				creator, 
				updater);
	}

	public <E extends BaseEntity> Synchronizer syncEach(String collectionName, EntityManager em) {
		@SuppressWarnings("unchecked")
		Class<E> entityClass = (Class<E>)ReflectUtil.getCollectionType(ReflectUtil.getField(this.target.getClass(), collectionName));		
		Function<Json, E> finder = new EntityFinder<>(em, entityClass);
		return syncEach(collectionName, collectionName, 
				json->json.getLong("id"), 
				finder, 
				null);
	}

	public <E extends BaseEntity> Synchronizer writeEach(
		String jsonCollName,
		String targetCollName,
		Function<Json, E> creator,
		BiConsumer<Json, E> updater)
	{
		Json dtos = this.json.search(jsonCollName);
		if (dtos!=null) {
			for (Object cJson : dtos) {
				E entity = creator.apply((Json)cJson);
				relationshipWave.add(this.target, targetCollName, entity);
				if (updater!=null) {
					updater.accept((Json)cJson, entity);
				}
			}
		}
		return this;
	}

	public <E extends BaseEntity> Synchronizer writeEach(
			String collectionName, 
			Function<Json, E> creator, 
			BiConsumer<Json, E> updater) 
	{
		return writeEach(collectionName, collectionName, creator, updater);
	}

	@SuppressWarnings("unchecked")
	public <E extends BaseEntity> Synchronizer writeEach(
			String collectionName,
			BiConsumer<Json, E> updater)
	{
		Class<E> entityClass = (Class<E>)ReflectUtil.getCollectionType(
				ReflectUtil.getField(this.target.getClass(), collectionName));	
		Function<Json, E> creator = new EntityCreator<>(entityClass);
		return writeEach(collectionName, collectionName, creator, updater);
	}

	@SuppressWarnings({ "unchecked" })
	public <E extends BaseEntity> Synchronizer writeEach(
			String collectionName,
			EntityManager em)
	{
		Class<E> entityClass = (Class<E>)ReflectUtil.getCollectionType(
				ReflectUtil.getField(this.target.getClass(), collectionName));	
		Function<Json, E> creator = new EntityFinder<>(em, entityClass);
		return writeEach(collectionName, collectionName, creator, null);
	}

	public <V>Synchronizer setInJson(String jsonFieldName, V value) {
		this.json.put(jsonFieldName, value);
		return this;
	}

	@SuppressWarnings({ "rawtypes", "unchecked" })
	@SafeVarargs
	final public <T, R> Synchronizer read(String jsonFieldName, String targetFieldName, Function<T, R> ... functions) {
		Object readValue = ReflectUtil.get(this.target, targetFieldName);
		for (Function function: functions) {
			readValue = function.apply(readValue);
		}
		if (readValue!=null) {
			this.json.put(jsonFieldName, readValue);
		}
		return this;
	}
	
	@SafeVarargs
	final public <T, R> Synchronizer read(String fieldName, Function<T, R> ... functions) {
		return read(fieldName, fieldName, functions);
	}

	public <E extends BaseEntity> Synchronizer readLink(String jsonCollName, String targetCollName, BiConsumer<Json, E> reader) {
		@SuppressWarnings("unchecked")
		E entity = (targetCollName==null || targetCollName.isEmpty()) ? (E)this.target : ReflectUtil.get(this.target, targetCollName);
		if (entity!=null) {
			Json json = (jsonCollName==null || jsonCollName.isEmpty()) ? this.json : this.json.search(jsonCollName);
			if (json==null) {
				json = Json.createJsonObject();
				this.json.put(jsonCollName, json);
			}
			reader.accept(json, entity);
		}
		return this;
	}

	public <E extends BaseEntity> Synchronizer readLink(String collectionName, BiConsumer<Json, E> reader) {
		return readLink(collectionName, collectionName, reader);
	}

	public <E extends BaseEntity, J> Synchronizer readEachRef(String jsonCollName, String targetCollName, Function<E, J> reader) {
		Json dtos = this.json.search(jsonCollName);
		if (dtos==null) {
			dtos = Json.createJsonArray();
			this.json.put(jsonCollName, dtos);
		}
		Collection<E> entities = ReflectUtil.get(this.target, targetCollName);
		for (E entity : entities) {
			J value = reader.apply(entity);
			dtos.push(value);
		}
		return this;
	}

	public <E extends BaseEntity, J> Synchronizer readEachRef(String collName, Function<E, J> reader) {
		return readEachRef(collName, collName, reader);
	}

	public <E extends BaseEntity> Synchronizer readEach(String jsonCollName, String targetCollName, BiConsumer<Json, E> reader) {
		Json dtos = this.json.search(jsonCollName);
		if (dtos==null) {
			dtos = Json.createJsonArray();
			this.json.put(jsonCollName, dtos);
		}
		Collection<E> entities = ReflectUtil.get(this.target, targetCollName);
		for (E entity : entities) {
			Json cJson = Json.createJsonObject();
			dtos.push(cJson);
			reader.accept(cJson, entity);
		}
		return this;
	}

	public <E extends BaseEntity> Synchronizer readEach(String collectionName, BiConsumer<Json, E> reader) {
		return readEach(collectionName, collectionName, reader);
	}
	
	public static class EntityFinder<E extends BaseEntity> implements Function<Json, E> {

		EntityManager em;
		String idField;
		Class<E> klass;
		
		public EntityFinder(EntityManager em, Class<E> klass, String idField) {
			this.em = em;
			this.idField = idField;
			this.klass = klass;
		}
		
		public EntityFinder(EntityManager em, Class<E> klass) {
			this(em, klass, "id");
		}
		
		@Override
		public E apply(Json json) {
			Long id = json.getLong(this.idField);
			return id==null ? null : em.find(this.klass, id);
		}
		
	}

	public static class EntityCreator<E extends BaseEntity> implements Function<Json, E> {

		Class<E> klass;
		
		public EntityCreator(Class<E> klass) {
			this.klass = klass;
		}
		
		@Override
		public E apply(Json json) {
			return ReflectUtil.newInstance(this.klass);
		}
		
	}

	public static class EntityFactory<E extends BaseEntity> implements Function<Json, E> {

		Map<String, Class<? extends E>> classes;
		String type;

		public EntityFactory(Map<String, Class<? extends E>> classes, String type) {
			this.classes = classes;
			this.type = type;
		}

		@Override
		public E apply(Json json) {
			return ReflectUtil.newInstance(classes.get(json.get(this.type)));
		}

	}

	public static class EntityCreatorOrFinder<E extends BaseEntity> implements Function<Json, E> {

		EntityManager em;
		String idField;
		Class<E> klass;
		
		public EntityCreatorOrFinder(EntityManager em, Class<E> klass, String idField) {
			this.em = em;
			this.idField = idField;
			this.klass = klass;
		}
		
		public EntityCreatorOrFinder(EntityManager em, Class<E> klass) {
			this(em, klass, "id");
		}
		
		@Override
		public E apply(Json json) {
			Long id = json.getLong(this.idField);
			return id==null ? ReflectUtil.newInstance(this.klass) : em.find(this.klass, id);
		}
		
	}

}
