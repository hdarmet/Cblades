package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.platform.FileSunbeam;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

@Controller
public class LikeVoteController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@REST(url = "/api/like-poll/vote/:poll", method = Method.GET)
	public Json getVote(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		long pollId = getIntegerParam(params, "poll", "A valid Poll Id must be provided.");
		inTransaction(em -> {
			ifAuthorized(
				user -> {
					try {
						LikePoll poll = LikePoll.find(em, pollId);
						String queryString = "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user";
						LikeVote vote = getSingleResult(em, queryString, "poll", poll, "user", user);
						Json response = readFromPoll(poll);
						if (vote==null) {
							response.put("option", "none");
						}
						else {
							response.put("option", getVoteOption(vote.getOption()));
						}
						result.set(response);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
	}

	@REST(url = "/api/like-poll/vote/:poll", method = Method.POST)
	public Json vote(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		long pollId = getIntegerParam(params, "poll", "A valid Poll Id must be provided.");
		String option = request.get("option");
		if (!"like".equals(option) && !"dislike".equals(option) && !"none".equals(option)) {
			throw new SummerControllerException(400, "Vote option must be one of these: 'like', 'dislike' or 'none'");
		}
		inTransaction(em -> {
			ifAuthorized(
				user -> {
					try {
						LikePoll poll = LikePoll.find(em, pollId);
						String queryString = "select v from LikeVote v where v.poll=:poll and v.voter.access.login=:user";
						LikeVote vote = getSingleResult(em, queryString, "poll", poll, "user", user);
						if (vote == null) {
							if (!option.equals("none")) {
								Account voter = Account.find(em, user);
								vote = new LikeVote().setPoll(poll).setVoter(voter).setOption(getVoteOption(option));
								applyVote(poll, vote);
								persist(em, vote);
							}
						} else if (option.equals("none")) {
							remove(em, vote);
							cancelVote(poll, vote);
						} else {
							LikeVoteOption voteOption = getVoteOption(option);
							if (voteOption!=vote.getOption()) {
								cancelVote(poll, vote);
								vote.setOption(voteOption);
								applyVote(poll, vote);
							}
						}
						Json response = readFromPoll(poll);
						response.put("option", option);
						result.set(response);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return result.get();
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

	private LikeVoteOption getVoteOption(String option) {
		return option.equals("like") ? LikeVoteOption.LIKE : LikeVoteOption.DISLIKE;
	}

	private String getVoteOption(LikeVoteOption option) {
		return option == LikeVoteOption.LIKE ? "like" : "dislike";
	}

	Json readFromPoll(LikePoll poll) {
		Json json = Json.createJsonObject();
		sync(json, poll)
			.read("likes")
			.read("dislikes");
		return json;
	}

}
