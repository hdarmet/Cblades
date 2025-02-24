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
import org.summer.controller.Verifier;
import org.summer.data.DataSunbeam;
import org.summer.data.Synchronizer;
import org.summer.platform.FileSunbeam;
import org.summer.platform.PlatformManager;
import org.summer.security.SecuritySunbeam;

import javax.persistence.*;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controleur permettant de manipuler des "bannières"
 */
@Controller
public class BannerController
		implements InjectorSunbeam, DataSunbeam, SecuritySunbeam, ControllerSunbeam, StandardUsers, FileSunbeam, CommonEntities
{
	/**
	 * Endpoint (accessible via "/api/banner/images/:imagename") permettant de télécharger depuis le navigateur
	 * une image associée à une bannière.
	 * @param params paramètres de l'URL (on utilisera le paraètre "imagename" qui donne le nom de l'image.
	 * @return une spécification de fichier que Summer exploitera pour retourner l'image au navigateur.
	 */
	@MIME(url="/api/banner/images/:imagename")
	public FileSpecification getImage(Map<String, Object> params) {
		return this.getImage(params, "imagename", "/games/");
	}

	/**
	 * Stocke sur le système de fichiers/blob Cloud,l'image associée à une bannière (il ne peut y en avoir qu'une) et
	 * l'associe à la bannière (en précisant l'URL de l'image dans le champ "path" de la bannière). Le contenu de l'image
	 * a été, au préalable, extrait du message HTTP (par Summer) et passé dans le paramètre params sous l'étiquette
	 * MULTIPART_FILES (un tableau qui ne doit contenir au plus qu'un élément)<br>
	 * L'image sera stockée dans le sous répertoire/blob nommé "/banner" sous un nom qui est la concaténation de
	 * "banner" et l'ID de la bannière.
	 * @param params paramètres d'appel HTTP (l'image a stocker si elle existe, est accessible via l'étiquette
	 *               MULTIPART_FILES)
	 * @param banner bannière à laquelle il faut associer l'image.
	 */
	void storeBannerImages(Map<String, Object> params, Banner banner) {
		FileSpecification[] files = (FileSpecification[]) params.get(MULTIPART_FILES);
		if (files != null) {
			if (files.length!= 1) throw new SummerControllerException(400, "One and only one banner file must be loaded.");
			String fileName = "banner" + banner.getId() + "." + files[0].getExtension();
			String webName = "banner" + banner.getId() + "-" + PlatformManager.get().now() + "." + files[0].getExtension();
			copyStream(files[0].getStream(), PlatformManager.get().getOutputStream("/games/" + fileName));
			banner.setPath("/api/banner/images/" + webName);
		}
	}

	@REST(url="/api/banner/create", method=Method.POST)
	public Json create(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					checkJson(em, request, true);
					Banner newBanner = writeToBanner(em, request, new Banner());
					persist(em, newBanner);
					storeBannerImages(params, newBanner);
					em.flush();
					result.set(readFromBanner(newBanner));
				});
			}
			catch (EntityExistsException pe) {
				throw new SummerControllerException(409,
					"Banner with name (%s) already exists",
					request.get("name"), null
				);
			}
			catch (PersistenceException pe) {
				throw new SummerControllerException(500, pe.getMessage());
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/banner/all", method=Method.GET)
	public Json getAll(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				int pageNo = getIntegerParam(params, "page", "The requested Page Number is invalid (%s)");
				String search = (String)params.get("search");
				String countQuery = "select count(b) from Banner b";
				String queryString = "select b from Banner b ";
				if (search!=null) {
					/*
					search = StringReplacer.replace(search,
							"tester", "test");
					 */
					String whereClause =" where fts('pg_catalog.english', " +
						"b.name||' '||" +
						"b.description ||' '||" +
						"b.status, :search) = true";
					queryString+=whereClause;
					countQuery+=whereClause;
				}
				long bannerCount = (search == null) ?
					getSingleResult(em.createQuery(countQuery)) :
					getSingleResult(em.createQuery(countQuery)
						.setParameter("search", search));
				Collection<Banner> banners = (search == null) ?
					findPagedBanners(em.createQuery(queryString), pageNo):
					findPagedBanners(em.createQuery(queryString), pageNo,
						"search", search);
				result.set(Json.createJsonObject()
					.put("banners", readFromBanners(banners))
					.put("count", bannerCount)
					.put("page", pageNo)
					.put("pageSize", BannerController.BANNERS_BY_PAGE)
				);
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/banner/live", method=Method.GET)
	public Json getLive(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inReadTransaction(em->{
			Collection<Banner> banners = findBanners(
				em.createQuery("select b from Banner b where b.status = :status")
					.setParameter("status", BannerStatus.LIVE));
			result.set(readFromPublishedBanners(banners));
		});
		return result.get();
	}

	@REST(url="/api/banner/by-name/:name", method=Method.POST)
	public Json getByName(Map<String, Object> params, Json request) {
		String name = getStringParam(params, "name", null,"The Announcement ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
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
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/banner/load/:id", method=Method.GET)
	public Json getById(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Banner ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			inReadTransaction(em->{
				Banner banner = findBanner(em, id);
				result.set(readFromBanner(banner));
			});
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/banner/delete/:id", method=Method.GET)
	public Json delete(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Banner ID is missing or invalid (%s)");
		ifAuthorized(user->{
			try {
				inTransactionUntilSuccessful(em->{
					Banner banner = findBanner(em, id);
					remove(em, banner);
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return Json.createJsonObject().put("deleted", "ok");
	}

	@REST(url="/api/banner/update/:id", method=Method.POST)
	public Json update(Map<String, Object> params, Json request) {
		long id = getLongParam(params, "id", "The Banner ID is missing or invalid (%s)");
		Ref<Json> result = new Ref<>();
		ifAuthorized(user->{
			try {
				inTransaction(em->{
					checkJson(em, request, false);
					Banner banner = findBanner(em, id);
					writeToBanner(em, request, banner);
					storeBannerImages(params, banner);
					flush(em);
					result.set(readFromBanner(banner));
				});
			} catch (PersistenceException pe) {
				throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
			}
		}, ADMIN);
		return result.get();
	}

	@REST(url="/api/banner/update-status/:id", method=Method.POST)
	public Json updateStatus(Map<String, Object> params, Json request) {
		Ref<Json> result = new Ref<>();
		inTransactionUntilSuccessful(em-> {
			String id = (String) params.get("id");
			Banner banner = findBanner(em, new Long(id));
			ifAuthorized(
				user -> {
					try {
						writeToBannerStatus(request, banner);
						flush(em);
						result.set(readFromBanner(banner));
					} catch (PersistenceException pe) {
						throw new SummerControllerException(409, "Unexpected issue. Please report : %s", pe);
					}
				},
				ADMIN
			);
		});
		return result.get();
	}

	Banner writeToBannerStatus(Json json, Banner banner) {
		verify(json)
			.checkRequired("id").checkInteger("id", "Not a valid id")
			.checkRequired("status").check("status", BannerStatus.byLabels().keySet())
			.ensure();
		sync(json, banner)
			.write("status", label->BannerStatus.byLabels().get(label));
		return banner;
	}

	void checkJson(EntityManager em, Json json,boolean full) {
		Verifier verifier = verify(json);
		if (full) {
			verifier
				.checkRequired("name");
		}
		verifier
			.checkMinSize("name", 2).checkMaxSize("name", 20)
			.checkPattern("name", "[a-zA-Z0-9_\\-]+")
			.checkMinSize("description", 2).checkMaxSize("description", 2000)
			.check("status", BannerStatus.byLabels().keySet());
		checkComments(verifier, full);
		verifier.ensure();
	}

	Banner writeToBanner(EntityManager em, Json json, Banner banner) {
		Synchronizer synchronizer = sync(json, banner)
			.write("version")
			.write("name")
			.write("description")
			.write("status", label->BannerStatus.byLabels().get(label))
			.writeRef("author.id", "author", (Integer id)-> Account.find(em, id));
		writeComments(synchronizer);
		return banner;
	}

	Json readFromBanner(Banner banner) {
		Json json = Json.createJsonObject();
		Synchronizer synchronizer = sync(json, banner)
			.read("id")
			.read("version")
			.read("name")
			.read("path")
			.read("description")
			.read("status", BannerStatus::getLabel);
		readAuthor(synchronizer);
		readComments(synchronizer);
		return json;
	}

	Json readFromPublishedBanner(Banner banner) {
		Json json = Json.createJsonObject();
		sync(json, banner)
			.read("id")
			.read("version")
			.read("name")
			.read("path")
			.read("description");
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

	Collection<Banner> findPagedBanners(Query query, int page, Object... params) {
		setParams(query, params);
		List<Banner> banners = getPagedResultList(query, page* BannerController.BANNERS_BY_PAGE, BannerController.BANNERS_BY_PAGE);
		return banners.stream().distinct().collect(Collectors.toList());
	}

	Json readFromPublishedBanners(Collection<Banner> banners) {
		Json list = Json.createJsonArray();
		banners.stream().forEach(banner->list.push(readFromPublishedBanner(banner)));
		return list;
	}

	static int BANNERS_BY_PAGE = 16;
}
