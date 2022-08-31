package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.Account;
import fr.cblades.domain.Login;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.platform.MailService;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class LoginController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/login/create", method=Method.POST)
	public Json create(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Login newLogin = writeToLogin(request, new Login());
					persist(em, newLogin);
					result.set(readFromLogin(newLogin));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Login with this login (%s) already exists",
					request.get("login"), null
				);
			}
		}, ADMIN);
	}
	
	@REST(url="/api/login/all", method=Method.POST)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				Collection<Login> logins = findLogins(em.createQuery("select l from Login l"));
				result.set(readFromLogins(logins));
			});
			return result.get();
		}, ADMIN);
	}
	
	@REST(url="/api/login/find/:id", method=Method.POST)
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				Login login = findLogin(em, new Long(id));
				result.set(readFromLogin(login));
			});
			return result.get();
		}, ADMIN);
	}
	
	@REST(url="/api/login/delete/:id", method=Method.POST)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Login login = findLogin(em, new Long(id));
					remove(em, login);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}
	
	@REST(url="/api/login/update/:id", method=Method.POST)
	public Json update(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = params.get("id");
					Login login = findLogin(em, new Long(id));
					writeToLogin(request, login);
					flush(em);
					result.set(readFromLogin(login));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}
	
	@REST(url="/api/login/login", method=Method.POST)
	public Json login(Map<String, String> params, Json request) {
		try {
			verify(request)
				.checkRequired("login")
				.checkMaxSize("login", 20)
				.checkRequired("password")
				.checkMaxSize("password", 20)
				.ensure();
			inTransaction(em->{
				String login = request.get("login");
				String password = request.get("password");
				Collection<Login> logins = findLogins(
					em.createQuery("select l from Login l where l.login=:login and l.password=:password"),
					"login", login, "password", Login.encrypt(password));
				if (logins.isEmpty()) {
					throw new SummerControllerException(401, "Bad credentials");
				}
				else {
					connect(login, 30*60*1000);
				}
			});
			Json response = Json.createJsonObject();
			return response;
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}
	
	@REST(url="/api/login/disconnect", method=Method.POST)
	public Json disconnect(Map<String, String> params, Json request) {
		return (Json)ifConnected(user->{
			disconnect();
			Json response = Json.createJsonObject();
			return response;
		});
	}

	@REST(url="/api/login/forgot-password", method=Method.GET)
	public Json forgotPassword(Map<String, String> params, Json request) {
		try {
			verify(params)
				.checkRequired("login")
				.checkMaxSize("login", 20)
				.ensure();
			inTransaction(em->{
				String login = params.get("login");
				Collection<Account> accounts = findAccounts(
					em.createQuery("select a from Account a, Login l where a.access = l and l.login=:login"),
						"login", login);
				if (accounts.isEmpty()) {
					throw new SummerControllerException(404, "Unknown Login");
				}
				else {
					Account account = accounts.iterator().next();
					use(MailService.class, mailService->{
						mailService.sendEmail(account.getEmail(), "Forget Password", "Reniew Password");
					});
				}
			});
			Json response = Json.createJsonObject();
			return response;
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}

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

	Login writeToLogin(Json json, Login login) {
		verify(json)
			.checkRequired("login")
			.checkMinSize("login", 2)
			.checkMaxSize("login", 20)
			.checkRequired("password")
			.checkMinSize("password", 4)
			.checkMaxSize("password", 20)
			.ensure();
		sync(json, login)
			.write("version")
			.write("login")
			.write("password", password->Login.encrypt((String)password))
			.write("admin");
		return login;
	}

	Json readFromLogin(Login login) {
		Json lJson = Json.createJsonObject();
		sync(lJson, login)
			.read("id")
			.read("version")
			.read("login")
			.read("password")
			.read("admin");
		return lJson;
	}

	Collection<Login> findLogins(Query query, Object... params) {
		setParams(query, params);
		List<Login> logins = getResultList(query);
		return logins.stream().distinct().collect(Collectors.toList());
	}

	Collection<Account> findAccounts(Query query, Object... params) {
		setParams(query, params);
		List<Account> accounts = getResultList(query);
		return accounts.stream().distinct().collect(Collectors.toList());
	}

	Json readFromLogins(Collection<Login> logins) {
		Json list = Json.createJsonArray();
		logins.stream().forEach(login->list.push(readFromLogin(login)));
		return list;
	}
	
}
