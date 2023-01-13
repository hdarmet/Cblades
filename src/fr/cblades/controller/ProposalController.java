package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.*;
import org.summer.FileSpecification;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.MIME;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.data.SummerNotFoundException;
import org.summer.data.SummerPersistenceException;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.*;
import java.util.Map;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

@Controller
public class ProposalController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@REST(url="/api/proposal/propose", method=Method.POST)
	public Json propose(Map<String, Object> params, Json request) {
		inTransaction(em->{
			ifAuthorized(
				user->{
					try {
						Account author = Account.find(em, user);
						checkProposal(request);
						long scenarioId = request.getLong("scenario");
						String armyName = request.get("army");
						Scenario scenario = Scenario.find(em, scenarioId);
						PlayerIdentity army = PlayerIdentity.getByName(em, armyName);
						GameMatch gameMatch = new GameMatch()
							.setGame(scenario.getGame().duplicate(em, new HashMap<>()))
							.addPlayerMatch(
								new PlayerMatch()
									.setPlayerIdentity(army)
									.setPlayerAccount(author)
							);
						persist(em, gameMatch);
					} catch (PersistenceException pe) {
						throw new SummerControllerException(500, pe.getMessage());
					} catch (SummerNotFoundException snfe) {
						throw new SummerControllerException(404, snfe.getMessage());
					}
				}
			);
		});
		return Json.createJsonObject();
	}

	void checkProposal(Json json) {
		verify(json)
			.checkRequired("scenario").checkInteger("scenario")
			.checkRequired("army")
				.checkPattern("army", "[\\d\\s\\w]+")
				.checkMinSize("army", 2)
				.checkMaxSize("army", 200)
			.ensure();
	}

}
