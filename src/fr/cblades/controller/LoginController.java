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
import org.summer.controller.Verifier;
import org.summer.data.DataSunbeam;
import org.summer.services.MailService;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler les identités d'accès
 */
@Controller
public class LoginController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/login/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					Login newLogin = writeToLogin(request, new Login(), true);
					persist(em, newLogin);
					result.set(readFromLogin(newLogin));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Login with this login (%s) already exists",
					request.get("login"), null
				);
			}
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/login/all", method=Method.POST)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				Collection<Login> logins = findLogins(em.createQuery("select l from Login l"));
				result.set(readFromLogins(logins));
			});
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/login/find/:id", method=Method.POST)
	public Json getById(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inTransaction(em->{
				String id = (String)params.get("id");
				Login login = findLogin(em, new Long(id));
				result.set(readFromLogin(login));
			});
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/login/delete/:id", method=Method.POST)
	public Json delete(Map<String, Object> params, Json request) {
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Login login = findLogin(em, new Long(id));
					remove(em, login);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}
	
	@REST(url="/api/login/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = (String)params.get("id");
					Login login = findLogin(em, new Long(id));
					writeToLogin(request, login, false);
					flush(em);
					result.set(readFromLogin(login));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}
	
	@REST(url="/api/login/login", method=Method.POST)
	public Json login(Map<String, Object> params, Json request) {
		try {
			verify(request)
				.checkRequired("login")
				.checkMinSize("login", 4)
				.checkMaxSize("login", 20)
				.checkRequired("password")
				.checkMinSize("password", 4)
				.checkMaxSize("password", 20)
				.ensure();
			inTransaction(em->{
				String login = request.get("login");
				String password = request.get("password");
				Collection<Login> logins = findLogins(
					em.createQuery("select l from Login l where l.login=:login and l.password=:password or l.altPassword=:password"),
					"login", login, "password", Login.encrypt(password));
				if (logins.isEmpty()) {
					throw new SummerControllerException(401, "Bad credentials");
				}
				else {
					Login me = logins.iterator().next();
					if (!me.getPassword().equals(Login.encrypt(password)) &&
						me.getAltPasswordLease()<PlatformManager.get().now()) {
						throw new SummerControllerException(401, "Bad credentials");
					}
					connect(login, 30*60*1000);
				}
			});
			return Json.createJsonObject();
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
		}
	}
	
	@REST(url="/api/login/logout", method=Method.GET)
	public Json disconnect(Map<String, Object> params, Json request) {
		ifConnected(user->{
			disconnect();
		});
		return Json.createJsonObject();
	}

	@REST(url="/api/login/forgot-password", method=Method.GET)
	public Json forgotPassword(Map<String, Object> params, Json request) {
		final long VALIDITY_DELAY = 10*60*1000;
		try {
			verify(params)
				.checkRequired("login")
				.checkMinSize("login", 4)
				.checkMaxSize("login", 20)
				.ensure();
			inTransaction(em->{
				String login = (String)params.get("login");
				Account account = Login.findAccountByLogin(em, login);
				if (account==null) {
					throw new SummerControllerException(404, "No Account for login: "+login);
				}
				String altPassword = generateRandomPassword();
				account.getAccess()
					.setAltPassword(Login.encrypt(altPassword))
					.setAltPasswordLease(PlatformManager.get().now()+VALIDITY_DELAY);
				Notice notice = getSingleResult(em,
						"select n from Notice n where n.category=:category and n.published = true",
						"category", "forgot-password-mail");
				use(MailService.class, mailService->{
					mailService.sendEmail(
						account.getEmail(), notice.getTitle(),
						String.format(notice.getText(), altPassword),
						"blades.cursed@gmail.com"
					);
				});
			});
			return Json.createJsonObject();
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
		}

	}

	public static String generateRandomPassword() {
		final String upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		final String lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
		final String digitChars = "0123456789";
		final String specialChars = "!@#$%^&*.";
		final String allChars = upperCaseChars+lowerCaseChars+digitChars+specialChars;
		final int BASE_SIZE = 6;
		char upperCaseChar = upperCaseChars.charAt((int)(PlatformManager.get().random()*upperCaseChars.length()));
		char lowerCaseChar = lowerCaseChars.charAt((int)(PlatformManager.get().random()*lowerCaseChars.length()));
		char digitChar = digitChars.charAt((int)(PlatformManager.get().random()*digitChars.length()));
		char specialChar = specialChars.charAt((int)(PlatformManager.get().random()*specialChars.length()));
		StringBuilder sb = new StringBuilder();
		for (int index = 0; index < BASE_SIZE; index++) {
			sb.append(allChars.charAt((int)(PlatformManager.get().random()*allChars.length())));
		}
		sb.insert((int)(PlatformManager.get().random()*BASE_SIZE), upperCaseChar);
		sb.insert((int)(PlatformManager.get().random()*(BASE_SIZE+1)), lowerCaseChar);
		sb.insert((int)(PlatformManager.get().random()*(BASE_SIZE+2)), digitChar);
		sb.insert((int)(PlatformManager.get().random()*(BASE_SIZE+3)), specialChar);
		return sb.toString();
	}

	Login findLogin(EntityManager em, long id) {
		Login login = find(em, Login.class, id);
		if (login==null) {
			throw new SummerControllerException(404, 
				"Unknown Login with id %d", id
			);
		}
		return login;
	}

	Login writeToLogin(Json json, Login login, boolean full) {
		Verifier verifier = verify(json);
		verifier
			.checkRequired("login")
			.checkRequired("password")
			.checkRequired("altPassword");
		verifier
			.checkMinSize("login", 2)
			.checkMaxSize("login", 20)
			.checkMinSize("password", 4)
			.checkMaxSize("password", 20)
			.checkMinSize("altPassword", 4)
			.checkMaxSize("altPassword", 20)
			.checkInteger("altPasswordLease")
			.check("role", LoginRole.byLabels().keySet());
		verifier
			.ensure();
		sync(json, login)
			.write("version")
			.write("login")
			.write("password", password->Login.encrypt((String)password))
			.write("altPassword", password->Login.encrypt((String)password))
			.write("altPasswordLease")
			.write("role", label->LoginRole.byLabels().get(label));
			return login;
	}

	Json readFromLogin(Login login) {
		Json lJson = Json.createJsonObject();
		sync(lJson, login)
			.read("id")
			.read("version")
			.read("login")
			.read("password")
			.read("altPassword")
			.read("altPasswordLease")
			.read("role", LoginRole::getLabel);
		return lJson;
	}

	Collection<Login> findLogins(Query query, Object... params) {
		setParams(query, params);
		List<Login> logins = getResultList(query);
		return logins.stream().distinct().collect(Collectors.toList());
	}

	Json readFromLogins(Collection<Login> logins) {
		Json list = Json.createJsonArray();
		logins.stream().forEach(login->list.push(readFromLogin(login)));
		return list;
	}

}
