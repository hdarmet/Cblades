package fr.cblades.domain;

import org.summer.controller.SummerControllerException;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;

@Entity
@Table(indexes=@Index(name="idx_player_identity", unique=true, columnList="name"))
public class PlayerIdentity extends BaseEntity {

    String name;
    String path;

    public String getName() { return this.name; }
    public PlayerIdentity setName(String name) {
        this.name = name;
        return this;
    }

    public String getPath() { return this.path; }
    public PlayerIdentity setPath(String path) {
        this.path = path;
        return this;
    }

    public static PlayerIdentity getByName(EntityManager em, String name) {
        Query query = em.createQuery("select pi from PlayerIdentity pi where pi.name = :name");
        query.setParameter("name", name);
        try {
            return (PlayerIdentity)query.getSingleResult();
        }
        catch (NoResultException enf) {
            throw new SummerNotFoundException("PlayerIdentity of name %s not found", name);
        }
    }

}
