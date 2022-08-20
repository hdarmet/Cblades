package org.summer.controller;

import org.summer.data.BaseEntity;
import org.summer.data.Synchronizer;

import java.util.Map;

public interface ControllerSunbeam {

	static ControllerSunbeam INSTANCE = new ControllerSunbeam() {};

	public static final String MULTIPART_FILES = "multipart-files";
	
	default Verifier verify(Json json) {
		return new Verifier(json);
	}

	default Synchronizer sync(Json json, BaseEntity target) {
		return new Synchronizer(json, target);
	}

	default int getIntegerParam(Map<String, String> params, String paramName, String message) {
		String param = params.get(paramName);
		try {
			return Integer.parseInt(param);
		} catch (NumberFormatException nfe) {
			throw new SummerControllerException(400, message, param, null);
		}
	}

}
