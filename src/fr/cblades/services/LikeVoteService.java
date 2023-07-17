package fr.cblades.services;

import fr.cblades.domain.Account;
import fr.cblades.domain.LikePoll;
import fr.cblades.domain.LikeVote;
import fr.cblades.domain.LikeVoteOption;

import javax.persistence.EntityManager;

public interface LikeVoteService {

    public class Votation {
        LikePoll poll;
        LikeVote vote;

        Votation(LikePoll poll, LikeVote vote) {
            this.poll = poll;
            this.vote = vote;
        }

        public LikePoll getPoll() {
            return poll;
        }
        public LikeVote getVote() {
            return vote;
        }

    }

    Votation getPoll(long pollId, String user);

    Votation getPoll(EntityManager em, LikePoll poll, String user);

    Votation vote(long pollId, LikeVoteOption option, String user);

    Votation vote(EntityManager em, LikePoll poll, LikeVoteOption option, String user);

}
