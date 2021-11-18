package org.summer.controller;

import java.io.BufferedReader;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.summer.ApplicationManager;
import org.summer.FileSpecification;
import org.summer.annotation.REST;

public interface ControllerManager {
	
	void installControllers();
	
	void processRequest(
			String contextualUri,
			REST.Method httpMethod,
			HttpServletRequest request, 
			HttpServletResponse response,
			BufferedReader requestContent,
			List<FileSpecification> files);
	
	public static ControllerManager get() {
		return ApplicationManager.get().getControllerManager();
	}
}
