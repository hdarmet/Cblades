package fr.cblades.services;

import fr.cblades.domain.Account;
import fr.cblades.domain.LikePoll;
import fr.cblades.domain.LikeVote;
import fr.cblades.domain.LikeVoteOption;
import org.summer.Ref;
import org.summer.annotation.SingletonScoped;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerPersistenceException;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;

@SingletonScoped
public class LikeVoteServiceImpl implements LikeVoteService, SecuritySunbeam, DataSunbeam {

    @Override
    public Votation getPoll(long pollId, String user) {
        Ref<Votation> result = new Ref<>();
        inTransaction(em -> {
            try {
                LikePoll poll = LikePoll.find(em, pollId);
                result.set(getPoll(em, poll, user));
            } catch (PersistenceException pe) {
                throw new SummerPersistenceException(pe);
            }
        });
        return result.get();
    }

    @Override
    public Votation getPoll(EntityManager em, LikePoll poll, String user) {
        String queryString = "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user";
        LikeVote vote = getSingleResult(em, queryString, "poll", poll, "user", user);
        return new Votation(poll, vote);
    }

    @Override
    public Votation vote(long pollId, LikeVoteOption option, String user) {
        Ref<Votation> result = new Ref<>();
        inTransaction(em -> {
            try {
                LikePoll poll = LikePoll.find(em, pollId);
                result.set(vote(em, poll, option, user));
            } catch (PersistenceException pe) {
                throw new SummerPersistenceException(pe);
            }
        });
        return result.get();
    }

    @Override
    public Votation vote(EntityManager em, LikePoll poll, LikeVoteOption option, String user) {
        String queryString = "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:voter";
        LikeVote vote = getSingleResult(em, queryString, "poll", poll, "voter", user);
        if (vote == null) {
            if (option !=LikeVoteOption.NONE) {
                Account voter = Account.find(em, user);
                vote = new LikeVote().setPoll(poll).setVoter(voter).setOption(option);
                applyVote(poll, vote);
                persist(em, vote);
            }
        } else if (option ==LikeVoteOption.NONE) {
            remove(em, vote);
            cancelVote(poll, vote);
        } else {
            if (option !=vote.getOption()) {
                cancelVote(poll, vote);
                vote.setOption(option);
                applyVote(poll, vote);
            }
        }
        return new Votation(poll, vote);
    }

    private void applyVote(LikePoll poll, LikeVote vote) {
        if (vote.getOption() == LikeVoteOption.LIKE) {
            poll.addLike();
        } else {
            poll.addDislike();
        }
    }

    private void cancelVote(LikePoll poll, LikeVote vote) {
        if (vote.getOption() == LikeVoteOption.LIKE) {
            poll.removeLike();
        } else {
            poll.removeDislike();
        }
    }

}
