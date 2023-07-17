package org.summer.controller;

import java.io.BufferedReader;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.summer.ApplicationManager;
import org.summer.FileSpecification;
import org.summer.Scanner;
import org.summer.annotation.Controller;
import org.summer.annotation.MIME;
import org.summer.annotation.REST;
import org.summer.controller.RouteManager.Route;
import org.summer.controller.RouteManager.RouteInvocation;

public class ControllerManagerImpl implements ControllerManager {
	static final Logger log = Logger.getLogger("summer");

	@Override
	public void installControllers() {
		Scanner.get().getClassesAnnotatedBy(Controller.class).stream()
		.forEach(componentClass->this.deployControllerClass(componentClass));
	}
	
	void deployControllerClass(Class<?> componentClass) {
		Arrays.asList(componentClass.getMethods()).stream()
		.forEach(method->{
			REST restRoute = method.getAnnotation(REST.class);
			if (restRoute!=null && Scanner.get().profilesMatch(Arrays.asList(restRoute.profile()))) {
				RouteManager routeManager = getRouteManager(restRoute.method());
				routeManager.prepareRoute(restRoute.url(), new RouteManager.RESTRoute(componentClass, method));
				return;
			}
			MIME mimeRoute = method.getAnnotation(MIME.class);
			if (mimeRoute!=null && Scanner.get().profilesMatch(Arrays.asList(mimeRoute.profile()))) {
				RouteManager routeManager = getRouteManager(REST.Method.GET);
				routeManager.prepareRoute(mimeRoute.url(), new RouteManager.MIMERoute(
						componentClass, method, mimeRoute.contentDisposition()==MIME.Type.INLINE));
				return;
			}
		});
	}

	RouteManager getRouteManager(REST.Method method) {
		RouteManager routeManager = this.routeManagers.get(method);
		if (routeManager==null) {
			routeManager = new RouteManager();
			this.routeManagers.put(method, routeManager);
		}
		return routeManager;
	}

	void processRequest(
			String contextualUri,
			REST.Method httpMethod,
			HttpServletRequest request, 
			HttpServletResponse response,
			Consumer<RouteInvocation> executor) 
	{
		RouteManager routeManager = this.routeManagers.get(httpMethod);
		if (routeManager!=null) {
			RouteInvocation routeInvocation = routeManager.getRoute(contextualUri);
			if (routeInvocation!=null) {
				HttpSession session = request.getSession(true);
				ApplicationManager.get().getInjector().startThread(session);
				try {
					executor.accept(routeInvocation);
				}
				finally {
					ApplicationManager.get().getInjector().finishThread();
				}
			}
		}
	}

	@Override
	public void processRequest(
			String contextualUri,
			REST.Method httpMethod,
			HttpServletRequest request, 
			HttpServletResponse response,
			BufferedReader reader,
			List<FileSpecification> files) 
	{
		processRequest(contextualUri, httpMethod, request, response, 
			routeInvocation->{
				Route route = routeInvocation.getRoute();
				Map<String, Object> params = routeInvocation.getParams();
				fillParams(request, params);
				if (files!=null) {
					params.put(ControllerSunbeam.MULTIPART_FILES, files.toArray(new FileSpecification[files.size()]));
				}
				route.processRequest(request, response, params, reader);
			});
	}
	
	void fillParams(HttpServletRequest request, Map<String, Object> params) {
		Enumeration<String> paramNames = request.getParameterNames();
		while (paramNames.hasMoreElements()) {
			String paramName = paramNames.nextElement();
			params.put(paramName, request.getParameter(paramName));
		}
	}
	
	Map<REST.Method, RouteManager> routeManagers = new HashMap<>();
	
	static class RESTRouteRecord {
		String url;
		REST.Method httpMethod;
		Class<?> componentClass;
		Method method;
		
		RESTRouteRecord(
				String url, 
				REST.Method httpMethod, 
				Class<?> componentClass, 
				Method method) 
		{
			super();
			this.url = url;
			this.httpMethod = httpMethod;
			this.componentClass = componentClass;
			this.method = method;
		}

		boolean accept(HttpServletRequest request) {
			String uri = request.getRequestURI();
			String contextPath = request.getContextPath();
			String method = request.getMethod();
			log.info((contextPath+this.url).toLowerCase()+" "+uri.toLowerCase()+" "+method+" "+this.httpMethod.toString());
			return (contextPath+this.url).toLowerCase().equals(uri.toLowerCase())
					&& this.httpMethod.toString().equals(method);
		}
	}
			
}
