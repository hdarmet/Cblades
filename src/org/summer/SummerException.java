package org.summer;

import java.util.logging.Logger;


public class SummerException extends RuntimeException {
	private static final long serialVersionUID = 1L;
	static final Logger log = Logger.getLogger("summer");

	public SummerException(String message, Throwable exception) {
		super(message, exception);
		log.info("SUMMER: "+message+" : "+exception.getMessage());
		exception.printStackTrace();
	}

	public SummerException(String message) {
		super(message);
		log.info("SUMMER: "+message);
	}

	public SummerException(Throwable exception) {
		super(exception);
		log.info("SUMMER: "+exception.getMessage());
		exception.printStackTrace();
	}

}
