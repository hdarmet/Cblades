package org.summer.data;

public interface DataManipulatorSunbeam {

    default BaseEntity setEntityId(BaseEntity entity, long id) {
        entity.id = id;
        return entity;
    }
}
