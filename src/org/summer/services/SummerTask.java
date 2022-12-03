package org.summer.services;

import org.summer.data.BaseEntity;

import javax.persistence.Column;
import javax.persistence.Entity;

@Entity
public class SummerTask extends BaseEntity {

    @Column(length = 20000)
    String specification;

    public String getSpecification() {
        return this.specification;
    }
    public SummerTask setSpecification(String specification) {
        this.specification = specification;
        return this;
    }

}
