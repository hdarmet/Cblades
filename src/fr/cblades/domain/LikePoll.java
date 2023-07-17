package fr.cblades.domain;

import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityManager;
import javax.persistence.ManyToOne;
import java.util.Date;

@Entity
public class LikePoll extends BaseEntity {

    int likes;
    int dislikes;

    public int getLikes() {
        return this.likes;
    }
    public LikePoll setLikes(int likes) {
        this.likes = likes;
        return this;
    }
    public int addLike() { return this.likes++; }
    public int removeLike() {
        return this.likes--;
    }

    public int getDislikes() {
        return this.dislikes;
    }
    public LikePoll setDislikes(int dislikes) {
        this.dislikes = dislikes;
        return this;
    }
    public int addDislike() { return this.dislikes++; }
    public int removeDislike() {
        return this.dislikes--;
    }

    static public LikePoll find(EntityManager em, long id) {
        LikePoll likePoll = em.find(LikePoll.class, id);
        if (likePoll==null) {
            throw new SummerNotFoundException(
                String.format("Unknown Poll with id %d", id)
            );
        }
        return likePoll;
    }

}

