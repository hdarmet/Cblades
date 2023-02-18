package org.summer.controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.summer.FileSpecification;
import org.summer.SummerException;

public class RouteManager {

	static final Logger log = Logger.getLogger("summer");

	static final String CONTENT_DISPOSITION = "Content-Disposition";
	RouteRecord root = new RouteRecord();
	
	static class RouteRecord {
		String segment;
		Map<String, RouteRecord> next = new HashMap<>();
		Map<String, RouteRecord> params = new HashMap<>();
		Route route;
	}
	
	public static abstract class Route {

		public Route(Class<?> component, Method method) {
			super();
			this.component = component;
			this.method = method;
		}
		
		public abstract void processRequest(
				HttpServletRequest request, 
				HttpServletResponse response, 
				Map<String, Object> params,
				BufferedReader reader);
		

		Class<?> component;
		Method method;
	}
	
	public static class MIMERoute extends Route {
		
		boolean inlineAttachment;
		
		public MIMERoute(Class<?> component, Method method, boolean inlineAttachment) {
			super(component, method);
			this.inlineAttachment = inlineAttachment;
		}

		public void processRequest(
				HttpServletRequest request, 
				HttpServletResponse response, 
				Map<String, Object> params,
				BufferedReader reader) {
			try {
				FileSpecification result = execute(request, response, params);
				if (result!=null) {
					response.setStatus(200);
					response.setContentType(result.getType());
					if (this.inlineAttachment) {
						response.setHeader(CONTENT_DISPOSITION, "inline");
					}
					else {
						response.setHeader(CONTENT_DISPOSITION, "attachment; filename=\""+result.getFileName()+"\"");
					}
					InputStream in = result.getStream();
					OutputStream out = response.getOutputStream();
					byte[] buffer = new byte[1024];
					int len;
					while ((len = in.read(buffer)) != -1) {
					    out.write(buffer, 0, len);
					}
					out.flush();
					out.close();
				}
			} catch (IOException e) {
				throw new SummerException("Unable to retrieve JSON content.", e);
			}	
		}
		
		FileSpecification execute(
				HttpServletRequest request, 
				HttpServletResponse response, 
				Map<String, Object> params) 
		{
			Object component;
			try {
				component = this.component.newInstance();
			} catch (InstantiationException | IllegalAccessException e) {
				throw new InstantiationError("Unable to create : "+this.component);
			}
			try {
				FileSpecification file = (FileSpecification)this.method.invoke(component, params);
				return file;
			} catch (InvocationTargetException e) {
				if (e.getCause() instanceof SummerException) {
					throw (SummerException)e.getCause();
				}
				else {
					throw new SummerException("Unable to invoke : "+this.method, e);
				}
			} catch (IllegalAccessException | IllegalArgumentException e) {
				throw new SummerException("Unable to invoke : "+this.method, e);
			}
		}
		
	}

	public static class RESTRoute extends Route {
		
		public RESTRoute(Class<?> component, Method method) {
			super(component, method);
		}

		public void processRequest(
				HttpServletRequest request, 
				HttpServletResponse response, 
				Map<String, Object> params,
				BufferedReader reader) {
			try {
				Json json = Json.createJsonFromRequest(reader);
				Json result = execute(json, request, response, params);
				if (result!=null) {
					response.setStatus(200);
					PrintWriter writer = response.getWriter();
					writer.print(result.toString());
					writer.flush();
					writer.close();
				}					
			} catch (IOException e) {
				throw new SummerException("Unable to retrieve JSON content.", e);
			}	
		}
		
		Json execute(
				Json json,
				HttpServletRequest request, 
				HttpServletResponse response, 
				Map<String, Object> params) 
		{
			Object component;
			try {
				component = this.component.newInstance();
			} catch (InstantiationException | IllegalAccessException e) {
				throw new InstantiationError("Unable to create : "+this.component);
			}
			try {
				Json reply = (Json)this.method.invoke(component, params, json);
				return reply;
			} catch (InvocationTargetException e) {
				if (e.getCause() instanceof SummerException) {
					throw (SummerException)e.getCause();
				}
				else {
					throw new SummerException("Unable to invoke : "+this.method, e);
				}
			} catch (IllegalAccessException | IllegalArgumentException e) {
				throw new SummerException("Unable to invoke : "+this.method, e);
			}
		}

	}

	public static class RouteInvocation {
		Map<String, Object> params = new HashMap<>();
		Route route;
		
		public Map<String, Object> getParams() {
			return params;
		}
		public Route getRoute() {
			return route;
		}
		
	}
	
	public void prepareRoute(
			String uri, Route route) 
	{
		String[] path = uri.toLowerCase().replace('\\', '/').replace("//",  "/").split("/");
		RouteRecord currentRecord = root;
		for (int index=0; index<path.length; index++) {
			String segment = path[index].trim();
			if (segment.startsWith(":")) {
				segment = segment.substring(1);
				RouteRecord nextRecord = currentRecord.params.get(segment);
				if (nextRecord!=null) {
					currentRecord = nextRecord;
					if (index==path.length-1) {
						currentRecord.route = route;
						return;
					}
				}
				else {
					registerSegment(segment, path, index, route, currentRecord.params);
					log.info("Path : "+uri+" installed.");
					return;
				}
			}
			else {
				RouteRecord nextRecord = currentRecord.next.get(segment);
				if (nextRecord!=null && index<path.length-1) {
					currentRecord = nextRecord;
					if (index==path.length-1) {
						currentRecord.route = route;
						return;
					}
				}
				else {
					registerSegment(segment, path, index, route, currentRecord.next);
					log.info("Path : "+uri+" installed.");
					return;
				}
			}
		}
		throw new InstantiationError("Path : "+uri+" already used.");
	}
	
	void registerSegment(
			String segment, 
			String[] path, 
			int index, 
			Route route,
			Map<String, RouteRecord> where) 
	{
		RouteRecord newRecord = new RouteRecord();
		where.put(segment, newRecord);
		if (++index==path.length) {
			newRecord.route = route;
		}
		else {
			processNextRegistration(newRecord, path[index], path, index, route);
		}
	}
	
	void processNextRegistration(
			RouteRecord currentRecord, 
			String segment, 
			String[] path, 
			int index, 
			Route route) 
	{
		segment = segment.trim();
		if (segment.startsWith(":")) {
			segment = segment.substring(1);
			registerSegment(segment, path, index, route, currentRecord.params);
		}
		else {
			registerSegment(segment, path, index, route, currentRecord.next);
		}		
	}
	
	public RouteInvocation getRoute(String uri) {
		RouteInvocation result = new RouteInvocation(); 
		String[] path = uri.toLowerCase().replace('\\', '/').replace("//",  "/").split("/");
		RouteRecord currentRecord = root;
		return trySubPath(currentRecord, path, 0, result);
	}
	
	RouteInvocation trySubPath(
			RouteRecord currentRecord, 
			String[] path, int index, 
			RouteInvocation currentInvocation) 
	{
		if (index==path.length) {
			return currentRecord.route!=null ? 
					duplicate(currentInvocation, currentRecord.route):null;
		}
		String segment = path[index++].trim();
		RouteRecord nextRecord = currentRecord.next.get(segment);
		RouteInvocation result = null;
		if (nextRecord!=null) {
			result = trySubPath(nextRecord, path, index, currentInvocation);
			if (result!=null) {
				return result;
			}
		}
		for (String paramName : currentRecord.params.keySet()) {
			RouteInvocation otherResult = trySubPath(currentRecord.params.get(paramName), path, index, 
					duplicate(currentInvocation, paramName, segment));
			if (result!=null && otherResult!=null) {
				throw new SummerException("Paths ambiguous.");
			}
			if (otherResult!=null) {
				result = otherResult;
			}
		}
		return result;
	}
	
	RouteInvocation duplicate(RouteInvocation model, Route route) {
		RouteInvocation result = new RouteInvocation();
		result.params = new HashMap<>(model.params);
		result.route = route;
		return result;
	}

	RouteInvocation duplicate(RouteInvocation model, String paramName, String paramValue) {
		RouteInvocation result = new RouteInvocation();
		result.params = new HashMap<>(model.params);
		result.params.put(paramName, paramValue);
		return result;
	}
	
}
