package org.summer.data;

import java.util.*;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

import javax.persistence.EntityManager;
import javax.persistence.EntityNotFoundException;
import javax.persistence.NoResultException;
import javax.persistence.NonUniqueResultException;
import javax.persistence.Query;

import org.summer.SummerException;
import org.summer.data.DataManager.Executor;

public interface DataSunbeam {

	static DataSunbeam INSTANCE = new DataSunbeam() {};
	
	default void inTransaction(String persistenceUnitName, Executor executor) {
		DataManager.inTransaction(persistenceUnitName, executor);
	}

	default void inTransaction(Executor executor) {
		DataManager.inTransaction(executor);
	}

	default <E> E find(EntityManager em, Class<E> entityClass, Object id) {
		try {
			return em.find(entityClass, id);
		}
		catch (EntityNotFoundException e) {
			return null;
		}
	}

	@SuppressWarnings("unchecked")
	default <E> E getSingleResult(Query query) {
		try {
			return (E)query.getSingleResult();
		}
		catch (NoResultException e) {
			return null;
		}
		catch (NonUniqueResultException e) {
			throw new SummerException(e);
		}
	}

	default <E> E getSingleResult(EntityManager em, String queryString, Object ... params) {
		Query query = em.createQuery(queryString);
		setParams(query, params);
		return getSingleResult(query);
	}

	@SuppressWarnings("unchecked")
	default <E> List<E> getResultList(Query query) {
		return (List<E>)query.getResultList();
	}
	
	default <E> List<E> getResultList(EntityManager em, String queryString, Object ... params) {
		Query query = em.createQuery(queryString);
		setParams(query, params);
		return getResultList(query);
	}

	default <E> void persist(EntityManager em, E entity) {
		em.persist(entity);
		em.flush();
	}

	default <E> void remove(EntityManager em, E entity) {
		entity = em.merge(entity);
		em.remove(entity);
		em.flush();
	}

	default void flush(EntityManager em) {
		em.flush();
	}

	default <E extends BaseEntity, D> void syncPersistentCollection(
			Supplier<Collection<E>> entityCollectionGetter,
			Supplier<Collection<E>> targetCollectionGetter,
			Consumer<E> entityAdder,
			Consumer<E> entityRemover)
	{
		Set<E> currentEntities = new HashSet<>(entityCollectionGetter.get());
		for (E targetEntity : targetCollectionGetter.get()) {
			if (!currentEntities.remove(targetEntity)) {
				entityAdder.accept(targetEntity);
			}
		}
		for (E removedEntity : currentEntities) {
			entityRemover.accept(removedEntity);
		}
	}

	default <E extends BaseEntity, D> void syncPersistentCollection(
			Supplier<Collection<E>> entityCollectionGetter,
			Iterable<D> dtos, 
			Function<D, Long> idGetter,
			Function<D, E> entityCreator,
			Consumer<E> entityAdder,
			Consumer<E> entityRemover,
			BiConsumer<D, E> entityUpdater) 
	{
		Map<Long, E> currentEntities = new HashMap<>();
		for (E entity : entityCollectionGetter.get()) {
			currentEntities.put(entity.getId(), entity);
		}
		if (dtos != null) {
			for (D dto : dtos) {
				Long dtoId = idGetter.apply(dto);
				E entity = dtoId==null ? null : currentEntities.remove(dtoId);
				if (entity==null) {
					entity = entityCreator.apply(dto);
					entityAdder.accept(entity);
				}
				if (entityUpdater!=null) {
					entityUpdater.accept(dto, entity);
				}
			}
		}
		for (E removedEntity : currentEntities.values()) {
			entityRemover.accept(removedEntity);
		}	
	}
	
	default void setParams(Query query, Object...params) {
		for (int i=0; i<params.length; i+=2) {
			query.setParameter((String)params[i], params[i+1]);
		}		
	}

}
