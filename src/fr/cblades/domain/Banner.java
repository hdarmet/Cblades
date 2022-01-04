package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
@Table(indexes=@Index(name="idx_banner", unique=true, columnList="name"))
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

    public static Banner getByName(EntityManager em, String name) {
        Query query = em.createQuery("select b from Banner b where b.name = :name");
        query.setParameter("name", name);
        try {
            return (Banner)query.getSingleResult();
        }
        catch (NoResultException nre) {
            return null;
        }
    }

}
