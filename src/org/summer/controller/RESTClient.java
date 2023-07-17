package org.summer.controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import org.summer.SummerException;

public class RESTClient {
	static final Logger log = Logger.getLogger("summer");

	static class Param {
		Param(String name, Object value) {
			this.name = name;
			this.value = value;
		}
		
		String name;
		Object value;
	}
	
	public static class Request {
		String url;
		List<Param> params = new ArrayList<Param>();
		Json json;
		
		public Request(String url) {
			this.url = url;
		}
		
		public Request addParam(String name, Object value) {
			this.params.add(new Param(name, value));
			return this;
		}
		
		public Request setJson(Json json) {
			this.json = json;
			return this;
		}
	}
	
	public static class Response {
		public Response(int httpStatus, Json content) {
			this.httpStatus = httpStatus;
			this.content = content;
		}
		
		public int getHttpStatus() {
			return httpStatus;
		}
		public Json getContent() {
			return content;
		}

		int httpStatus;
		Json content;
	}

	static Response sendGetStyleRequest(String httpMethod, String url) {
		try {
			URL urlObject = new URL(url);
			HttpURLConnection conn = (HttpURLConnection) urlObject.openConnection();
			conn.setRequestMethod(httpMethod);
			conn.setRequestProperty("Content-Type", "application/json");
			int statusPart = conn.getResponseCode();
			Json contentPart = (statusPart>=200 && statusPart<=299) ? 
				getResponseContent(conn.getInputStream()):
				getResponseContent(conn.getErrorStream());
			conn.disconnect();
			return new Response(statusPart, contentPart);
		} 
		catch (IOException e) {
			throw new SummerException("IOException", e);
		}
	}

	static Response sendGetStyleRequest(String httpMethod, Request request) {
		try {
			String charset = "UTF-8";
			String url = request.url;
			if (request.params.size()>0) {
				StringBuilder paramsOnURL = new StringBuilder(
					"?"+request.params.get(0).name+"="+ 
							URLEncoder.encode(String.valueOf(request.params.get(0).value), charset));
				for (int index=1; index<request.params.size(); index++) {
					paramsOnURL.append("&"+request.params.get(index).name+"="+ 
							URLEncoder.encode(""+request.params.get(index).value, charset));
				}
				url+=paramsOnURL.toString();
			}
			return sendGetStyleRequest(httpMethod, url);
		} 
		catch (IOException e) {
			throw new SummerException("IOException", e);
		}
	}

	static Json getResponseContent(InputStream responseFromServer) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(
				responseFromServer));
		StringBuilder output = new StringBuilder();
		String line;
		while ((line = br.readLine()) != null) {
			output.append(line);
		}
		log.info("Received:"+output.toString());
		return Json.createJsonFromString(output.toString());	
	}

	static Response sendPostStyleRequest(String httpMethod, String url, String content) {
		try {
			URL urlObject = new URL(url);
			HttpURLConnection conn = (HttpURLConnection) urlObject.openConnection();
			conn.setDoOutput(true);
			conn.setRequestMethod(httpMethod);
			conn.setRequestProperty("Content-Type", "application/json");
			OutputStream outputStream = conn.getOutputStream();
			outputStream.write(content.getBytes());
			outputStream.flush();
			int statusPart = conn.getResponseCode();
			Json contentPart = (statusPart>=200 && statusPart<=299) ? 
				getResponseContent(conn.getInputStream()):
				getResponseContent(conn.getErrorStream());
			conn.disconnect();
			return new Response(statusPart, contentPart);
		} 
		catch (IOException e) {
			throw new SummerException("IOException", e);
		}
	}

	static Response sendPostStyleRequest(String httpMethod, Request request) {
		return sendPostStyleRequest(httpMethod, request.url, request.json.toString());
	}
	
	public static Response get(Request request) {
		return sendGetStyleRequest("GET", request);
	}

	public static Response get(String url) {
		return sendGetStyleRequest("GET", url);
	}

	public static Response head(Request request) {
		return sendGetStyleRequest("HEAD", request);
	}

	public static Response head(String url) {
		return sendGetStyleRequest("HEAD", url);
	}

	public static Response delete(Request request) {
		return sendGetStyleRequest("DELETE", request);
	}

	public static Response delete(String url) {
		return sendGetStyleRequest("DELETE", url);
	}

	public static Response post(Request request) {
		return sendPostStyleRequest("POST", request);
	}

	public static Response post(String url, String content) {
		return sendPostStyleRequest("POST", url, content);
	}

	public static Response put(Request request) {
		return sendPostStyleRequest("PUT", request);
	}

	public static Response put(String url, String content) {
		return sendPostStyleRequest("PUT", url, content);
	}

	public static Response patch(Request request) {
		return sendPostStyleRequest("PATCH", request);
	}

	public static Response patch(String url, String content) {
		return sendPostStyleRequest("PATCH", url, content);
	}
	
}
