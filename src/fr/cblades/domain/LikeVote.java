package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;

@Entity
public class LikeVote extends BaseEntity {

    LikeVoteOption option;
    @ManyToOne
    LikePoll poll;
    @ManyToOne
    Account voter;

    public LikeVoteOption getOption() {
        return this.option;
    }
    public LikeVote setOption(LikeVoteOption option) {
        this.option = option;
        return this;
    }

    public LikePoll getPoll() {
        return this.poll;
    }
    public LikeVote setPoll(LikePoll poll) {
        this.poll = poll;
        return this;
    }

    public Account getVoter() {
        return this.voter;
    }
    public LikeVote setVoter(Account author) {
        this.voter = author;
        return this;
    }

}

