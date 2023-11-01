package org.summer.controller;

import org.summer.SummerException;

public class SummerControllerException extends SummerException {
	private static final long serialVersionUID = 1L;
	
	int status;

	public SummerControllerException(int status, String message, Object... params) {
		super(String.format(message, params));
		this.status = status;
	}

	public SummerControllerException(int status, String message, Exception e) {
		super(String.format(message, e.getMessage()));
		e.printStackTrace();
		this.status = status;
	}

	public SummerControllerException(int status, Json response) {
		super(response==null ? "" :response.toString());
		this.status = status;
	}

	public int getStatus() {
		return status;
	}

}
