package org.summer.data;

public interface DataManipulatorSunbeam {

    default <T extends BaseEntity> T setEntityId(T entity, long id) {
        entity.id = id;
        return entity;
    }

}
