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
import org.summer.platform.FileSunbeam;
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
public class AccountController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, FileSunbeam, StandardUsers {

	@MIME(url="/api/account/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		try {
			String imageName = (String)params.get("imagename");
			return new FileSpecification()
			    .setName(imageName)
				.setStream(PlatformManager.get().getInputStream("/avatars/"+imageName));
		} catch (PersistenceException pe) {
			throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
		}
	}

	String storeAvatar (Map<String, Object> params, long id) {
		FileSpecification[] files = (FileSpecification[])params.get(MULTIPART_FILES);
		if (files.length>0) {
			if (files.length>1) throw new SummerControllerException(400, "Only one avatar file may be loaded.");
			String fileName = "avatar"+id+"."+files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/avatars/"+fileName));
			return fileName;
		}
		return null;
	}

	@REST(url="/api/account/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Account newAccount = writeToAccount(request, new Account().setAccess(new Login()));
					persist(em, newAccount);
					result.set(readFromAccount(newAccount));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Account with this login (%s) or email (%s) already exists",
					request.get("login"), request.get("email"), null
				);
			}
		}, ADMIN);
	}
	
	@REST(url="/api/account/all", method=Method.GET)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				long accountCount = getSingleResult(em.createQuery("select count(a) from Account a"));
				Collection<Account> accounts = findAccounts(em.createQuery("select a from Account a left outer join fetch a.access"), pageNo);
				result.set(Json.createJsonObject()
					.put("users", readFromAccounts(accounts))
					.put("count", accountCount)
					.put("page", pageNo)
					.put("pageSize", AccountController.ACCOUNTS_BY_PAGE)
				);
			});
			return result.get();
		}, ADMIN);
	}
	
	@REST(url="/api/account/find/:id", method=Method.POST)
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				Account account = findAccount(em, new Long(id));
				result.set(readFromAccount(account));
			});
			return result.get();
		}, ADMIN);
	}
	
	@REST(url="/api/account/delete/:id", method=Method.GET)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Account account = findAccount(em, new Long(id));
					remove(em, account);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}
	
	@REST(url="/api/account/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = (String)params.get("id");
					Account account = findAccount(em, new Long(id));
					String avatarName = storeAvatar(params, account.getId());
					writeToAccount(request, account);
					account.setAvatar("/api/account/images/"+avatarName);
					flush(em);
					result.set(readFromAccount(account));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}
	
	Account findAccount(EntityManager em, long id) {
		Account account = find(em, Account.class, id);
		if (account==null) {
			throw new SummerControllerException(404, 
				"Unknown Account with id %d", id
			);
		}
		return account;
	}
	
	Account writeToAccount(Json json, Account account) {
		verify(json)
			.checkRequired("firstName")
			.checkMinSize("firstName", 2)
			.checkMaxSize("firstName", 100)
			.checkRequired("lastName")
			.checkMinSize("lastName", 2)
			.checkMaxSize("lastName", 100)
			.checkRequired("email")
			.checkMinSize("email", 2)
			.checkMaxSize("email", 100)
			.checkRequired("avatar")
			.checkMinSize("avatar", 2)
			.checkMaxSize("avatar", 100)
			.check("status", AccountStatus.byLabels().keySet())
			.checkRequired("login")
			.checkMinSize("login", 2)
			.checkMaxSize("login", 20)
			.checkRequired("password")
			.checkMinSize("password", 4)
			.checkMaxSize("password", 20)
			.check("role", LoginRole.byLabels().keySet())
			.ensure();
		sync(json, account)
			.write("version")
			.write("firstName")
			.write("lastName")
			.write("email")
			.write("avatar")
			.write("status", label->AccountStatus.byLabels().get(label))
			.writeSetter("login", account::setLogin)
			.writeSetter("password", account::setPassword, password->Login.encrypt((String)password))
			.writeSetter("role", account::setRole, label->LoginRole.byLabels().get(label));
		return account;
	}

	Json readFromAccount(Account account) {
		Json lJson = Json.createJsonObject();
		sync(lJson, account)
			.read("id")
			.read("version")
			.read("firstName")
			.read("lastName")
			.read("email")
			.read("avatar")
			.read("status", AccountStatus::getLabel)
			.readGetter("login", account::getLogin)
			//.readGetter("password", account::getPassword)
			.readGetter("role", account::getRole, LoginRole::getLabel);
		return lJson;
	}

	Collection<Account> findAccounts(Query query, int page, Object... params) {
		setParams(query, params);
		List<Account> accounts = getPagedResultList(query, page, AccountController.ACCOUNTS_BY_PAGE);
		return accounts.stream().distinct().collect(Collectors.toList());
	}
	
	Json readFromAccounts(Collection<Account> accounts) {
		Json list = Json.createJsonArray();
		accounts.stream().forEach(account->list.push(readFromAccount(account)));
		return list;
	}

	static int ACCOUNTS_BY_PAGE = 20;
}
