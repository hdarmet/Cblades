package org.summer.controller;

import org.summer.data.BaseEntity;
import org.summer.data.Synchronizer;

public interface ControllerSunbeam {

	static ControllerSunbeam INSTANCE = new ControllerSunbeam() {};

	public static final String MULTIPART_FILES = "multipart-files";
	
	default Verifier verify(Json json) {
		return new Verifier(json);
	}

	default Synchronizer sync(Json json, BaseEntity target) {
		return new Synchronizer(json, target);
	}
}
