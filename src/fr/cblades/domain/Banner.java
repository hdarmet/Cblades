package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;

@Entity
public class Banner extends BaseEntity {

    String name;
    String path;

    public String getName() { return this.name; }
    public Banner setName(String name) {
        this.name = name;
        return this;
    }

    public String getPath() { return this.path; }
    public Banner setPath(String path) {
        this.path = path;
        return this;
    }

}
