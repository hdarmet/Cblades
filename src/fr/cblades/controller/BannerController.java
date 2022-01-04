package fr.cblades.controller;

import fr.cblades.StandardUsers;
import fr.cblades.domain.Banner;
import fr.cblades.domain.Board;
import fr.cblades.domain.HexSideType;
import fr.cblades.domain.HexType;
import org.summer.InjectorSunbeam;
import org.summer.Ref;
import org.summer.annotation.Controller;
import org.summer.annotation.REST;
import org.summer.annotation.REST.Method;
import org.summer.controller.ControllerSunbeam;
import org.summer.controller.Json;
import org.summer.controller.SummerControllerException;
import org.summer.data.DataSunbeam;
import org.summer.security.SecuritySunbeam;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class BannerController implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers {
	
	@REST(url="/api/banner/create", method=Method.POST)
	public Json create(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					Banner newBanner = writeToBanner(request, new Banner());
					persist(em, newBanner);
					result.set(readFromBanner(newBanner));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, 
					"Banner with name (%s) already exists",
					request.get("name"), null
				);
			}
		}, ADMIN);
	}

	@REST(url="/api/banner/all", method=Method.POST)
	public Json getAll(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				Collection<Banner> banners = findBanners(em.createQuery("select b from Banner b"));
				result.set(readFromBanners(banners));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/banner/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String name = params.get("name");
				Banner banner = getSingleResult(em,
						"select b from Banner b where b.name = :name",
						"name", name);
				if (banner==null) {
					throw new SummerControllerException(404,
							"Unknown Banner with name %s", name
					);
				}
				result.set(readFromBanner(banner));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/banner/find/:id", method=Method.POST)
	public Json getById(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			Ref<Json> result = new Ref<>();
			inTransaction(em->{
				String id = params.get("id");
				Banner banner = findBanner(em, new Long(id));
				result.set(readFromBanner(banner));
			});
			return result.get();
		}, ADMIN);
	}

	@REST(url="/api/banner/delete/:id", method=Method.POST)
	public Json delete(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				inTransaction(em->{
					String id = params.get("id");
					Banner banner = findBanner(em, new Long(id));
					remove(em, banner);
				});
				return Json.createJsonObject().put("deleted", "ok");
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	@REST(url="/api/banner/update/:id", method=Method.POST)
	public Json update(Map<String, String> params, Json request) {
		return (Json)ifAuthorized(user->{
			try {
				Ref<Json> result = new Ref<>();
				inTransaction(em->{
					String id = params.get("id");
					Banner banner = findBanner(em, new Long(id));
					writeToBanner(request, banner);
					flush(em);
					result.set(readFromBanner(banner));
				});
				return result.get();
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe.getMessage());
			}
		}, ADMIN);
	}

	Banner writeToBanner(Json json, Banner banner) {
		verify(json)
			.checkRequired("name").checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkPattern("name", "[a-zA-Z0-9_\\-]+")
			.checkRequired("path").checkMinSize("path", 2).checkMaxSize("path", 200)
			.ensure();
		sync(json, banner)
			.write("version")
			.write("name")
			.write("path");
		return banner;
	}

	Json readFromBanner(Banner banner) {
		Json json = Json.createJsonObject();
		sync(json, banner)
			.read("id")
			.read("version")
			.read("name")
			.read("path");
		return json;
	}

	Banner findBanner(EntityManager em, long id) {
		Banner banner = find(em, Banner.class, id);
		if (banner==null) {
			throw new SummerControllerException(404,
				"Unknown Banner with id %d", id
			);
		}
		return banner;
	}

	Collection<Banner> findBanners(Query query, Object... params) {
		setParams(query, params);
		List<Banner> banners = getResultList(query);
		return banners.stream().distinct().collect(Collectors.toList());
	}

	Json readFromBanners(Collection<Banner> banners) {
		Json list = Json.createJsonArray();
		banners.stream().forEach(banner->list.push(readFromBanner(banner)));
		return list;
	}

}
