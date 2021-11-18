package org.summer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import java.util.logging.Logger;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;

import org.summer.annotation.REST;
import org.summer.controller.SummerControllerException;

@MultipartConfig
public class SummerServlet extends HttpServlet {
	static final long serialVersionUID = 1L;
	static final Logger log = Logger.getLogger("summer");
	static final String ROOT_FOR_LOOKUP = "root-for-lookup";
	static final String ACTIVE_PROFILES = "active-profiles";
	static final String REQUEST_PART = "request-part";
	
	@Override
	public void init(ServletConfig config) throws ServletException {
		super.init(config);
		String rootForLookup=config.getInitParameter(ROOT_FOR_LOOKUP);
		Set<String> profiles = retrieveProfiles(config);
		ApplicationManager.set(new ApplicationManagerImpl(rootForLookup, profiles));
		ApplicationManager.get().start();
	}
	
	Set<String> retrieveProfiles(ServletConfig config) {
		Set<String> result = new HashSet<>();
		String profileParameter = config.getInitParameter(ACTIVE_PROFILES);
		if (profileParameter==null) {
			log.info("No profile defined.");
			return Collections.emptySet();
		}
		else {
			String[] profiles = profileParameter.split(",");
			for (int index=0; index<profiles.length; index++) {
				String profile=profiles[index].trim();
				if (profile.length()>0) {
					result.add(profile);
				}
			}
			return result;
		}
	}

	static class SummerRequest {
		SummerRequest(
			HttpServletRequest request,
			HttpServletResponse response) {
			this.request = request;
			this.response = response;
		}
		
		HttpServletRequest request;
		HttpServletResponse response;
	}
	
	static ThreadLocal<SummerRequest> summerRequest = new ThreadLocal<SummerRequest>();
	
	public static HttpServletRequest getRequest() {
		return summerRequest.get().request;
	}
	
	public static HttpServletResponse getResponse() {
		return summerRequest.get().response;
	}
	
	static public void processRESTRequest(
			REST.Method httpMethod,
			HttpServletRequest request, HttpServletResponse response,
			Consumer<String> processor)
			throws ServletException, IOException 
	{
		String uri = request.getRequestURI();
		response.setContentType("application/json");
		try {
			String contextPath = request.getContextPath();
			String contextualUri = uri.substring(contextPath.length());
			log.info("Received: "+httpMethod.toString()+" "+uri.toLowerCase());
			processor.accept(contextualUri);
		}
		catch(SummerControllerException controllerException) {
			response.setStatus(controllerException.getStatus());
			PrintWriter writer = response.getWriter();
			writer.print(controllerException.getMessage());
			writer.flush();
			writer.close();
		}
	}

	protected void processRequest(
			HttpServletRequest request, 
			HttpServletResponse response, 
			BufferedReader requestContent,
			List<FileSpecification> files)
			throws ServletException, IOException {
		String method = request.getMethod();
		REST.Method httpMethod = REST.Method.valueOf(method);
		if (httpMethod!=null) {
			processRESTRequest(httpMethod, request, response, 
				contextualUri->
					ApplicationManager.get()
						.getControllerManager()
						.processRequest(contextualUri, httpMethod, request, response, requestContent, files)
				);
		}
		response.setStatus(404);
	}

	void processRequest(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		summerRequest.set(new SummerRequest(request, response));
		if (request.getContentType()!=null&&request.getContentType().contains("multipart/form-data")) {
			List<FileSpecification> files = new ArrayList<>();
			for (Part part : request.getParts()) {
				if (part.getName()==null||!part.getName().equals(REQUEST_PART)) {
					files.add(new FileSpecification(part.getName(), getFileName(part), part.getInputStream()));
				}
			}
			for (Part part : request.getParts()) {
				if (part.getName()!=null&&part.getName().equals(REQUEST_PART)) {
					BufferedReader reader = new BufferedReader(new InputStreamReader(part.getInputStream()));
					this.processRequest(request, response, reader, files);
				}
			}
		}
		else {
			this.processRequest(request, response, request.getReader(), Collections.emptyList());
		}
	}
	
	String getFileName(final Part part) {
		final String partHeader = part.getHeader("content-disposition");
		log.info(String.format("Part Header = %s", partHeader));
		for (String content : part.getHeader("content-disposition").split(";")) {
			if (content.trim().startsWith("filename")) {
				return content.substring(content.indexOf('=') + 1).trim().replace("\"", "");
			}
		}
		return null;
	}
	
	@Override
	protected void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		this.processRequest(request, response);
	}
	
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		this.processRequest(request, response);

	}

	@Override
	protected void doPut(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		this.processRequest(request, response);
	}
	
	@Override
	protected void doDelete(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		this.processRequest(request, response);
	}
}
