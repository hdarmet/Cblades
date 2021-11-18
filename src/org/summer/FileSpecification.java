package org.summer;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

public class FileSpecification {
	
	String name;
	String fileName;
	String type;
	InputStream stream;
	
	public FileSpecification(String name, String fileName, String type, InputStream stream) {
		this.name = name;
		this.fileName = fileName;
		this.type = type;
		this.stream = stream;
	}
	
	public FileSpecification(String name, String fileName, InputStream stream) {
		this(name, fileName, getTypeFromExtension(fileName), stream);
	}
	
	public FileSpecification(String name, InputStream stream, String type) {
		this(name, getFileNameFromName(name, type), stream);
	}
	
	public FileSpecification(String filePath) {
		this(getNameFromPath(filePath), getFileStreamFromPath(filePath), getTypeFromExtension(filePath));
	}
	
	public String getName() {
		return name;
	}
	
	public String getFileName() {
		return fileName;
	}
	
	public String getType() {
		return type;
	}
	
	public InputStream getStream() {
		return stream;
	}
	
	static public String getTypeFromExtension(String fileName) {
		int index = fileName.lastIndexOf(".");
		if (index==-1 || index>=fileName.length()-1) {
			return null;
		}
		String extension = fileName.substring(index+1);
		return mimeTypes.get(extension);
	}
	
	static public String getNameFromPath(String filePath) {
		int sindex = filePath.lastIndexOf("/");
		if (sindex==-1 || sindex>=filePath.length()-1) {
			return null;
		}
		int eindex = filePath.lastIndexOf(".");
		if (eindex<1 || eindex>=filePath.length()-1 || sindex>eindex) {
			return null;
		}
		return filePath.substring(sindex+1, eindex);
	}
	
	
	public static String getPath() {
		try {
			String path = FileSpecification.class.getClassLoader().getResource("").getPath();
			String fullPath;
			fullPath = URLDecoder.decode(path, "UTF-8");
			String pathArr[] = fullPath.split("/WEB-INF/classes/");
			return pathArr[0];
		} catch (UnsupportedEncodingException e) {
			throw new SummerException(e);
		}
	}

	static public InputStream getFileStreamFromPath(String filePath) {
		try {
			return new FileInputStream(new File(getPath() + File.separatorChar + filePath));
		} catch (FileNotFoundException e) {
			throw new SummerException(e);
		}
	}
	
	static public String getFileNameFromName(String name, String type) {
		String extension = extensions.get(type);
		return extension==null ? name : name+"."+extension;
	}
	
	static Map<String, String> mimeTypes;
	static Map<String, String> extensions;
	
	static {
		mimeTypes = new HashMap<String, String>();
		mimeTypes.put("aac", "audio/aac");
		mimeTypes.put("abw", "application/x-abiword");
		mimeTypes.put("arc", "application/octet-stream");
		mimeTypes.put("avi", "video/x-msvideo");
		mimeTypes.put("azw", "application/vnd.amazon.ebook");
		mimeTypes.put("bin", "application/octet-stream");
		mimeTypes.put("bmp", "image/bmp");
		mimeTypes.put("bz", "application/x-bzip");
		mimeTypes.put("bz2", "application/x-bzip2");
		mimeTypes.put("csh", "application/x-csh");
		mimeTypes.put("css", "text/css");
		mimeTypes.put("csv", "text/csv");
		mimeTypes.put("doc", "application/msword");
		mimeTypes.put("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
		mimeTypes.put("eot", "application/vnd.ms-fontobject");
		mimeTypes.put("epub", "application/epub+zip");
		mimeTypes.put("es", "application/ecmascript");
		mimeTypes.put("gif", "image/gif");
		mimeTypes.put("htm", "text/html");
		mimeTypes.put("html", "text/html");
		mimeTypes.put("ico", "image/x-icon");
		mimeTypes.put("ics", "text/calendar");
		mimeTypes.put("jar", "application/java-archive");
		mimeTypes.put("jpeg", "image/jpeg");
		mimeTypes.put("jpg", "image/jpeg");
		mimeTypes.put("js", "application/javascript");
		mimeTypes.put("json", "application/json");
		mimeTypes.put("mid", "audio/midi");
		mimeTypes.put("midi", "audio/midi");
		mimeTypes.put("mpeg", "video/mpeg");
		mimeTypes.put("mpkg", "application/vnd.apple.installer+xml");
		mimeTypes.put("odp", "application/vnd.oasis.opendocument.presentation");
		mimeTypes.put("ods", "application/vnd.oasis.opendocument.spreadsheet");
		mimeTypes.put("odt", "application/vnd.oasis.opendocument.text");
		mimeTypes.put("oga", "audio/ogg");
		mimeTypes.put("ogv", "video/ogg");
		mimeTypes.put("ogx", "application/ogg");
		mimeTypes.put("otf", "font/otf");
		mimeTypes.put("png", "image/png");
		mimeTypes.put("pdf", "application/pdf");
		mimeTypes.put("ppt", "application/vnd.ms-powerpoint");
		mimeTypes.put("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
		mimeTypes.put("rar", "application/x-rar-compressed");
		mimeTypes.put("rtf", "application/rtf");
		mimeTypes.put("sh", "application/x-sh");
		mimeTypes.put("svg", "image/svg+xml");
		mimeTypes.put("swf", "application/x-shockwave-flash");
		mimeTypes.put("tar", "application/x-tar");
		mimeTypes.put("tif", "image/tiff");
		mimeTypes.put("tiff", "image/tiff");
		mimeTypes.put("ts", "application/typescript");
		mimeTypes.put("ttf", "font/ttf");
		mimeTypes.put("txt", "text/plain");
		mimeTypes.put("vsd", "application/vnd.visio");
		mimeTypes.put("wav", "audio/wav");
		mimeTypes.put("weba", "audio/webm");
		mimeTypes.put("webm", "video/webm");
		mimeTypes.put("webp", "image/webp");
		mimeTypes.put("woff", "font/woff");
		mimeTypes.put("woff2", "font/woff2");
		mimeTypes.put("xhtml", "application/xhtml+xml");
		mimeTypes.put("xls", "application/vnd.ms-excel");
		mimeTypes.put("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		mimeTypes.put("xml", "application/xml");
		mimeTypes.put("xul", "application/vnd.mozilla.xul+xml");
		mimeTypes.put("zip", "application/zip");
		mimeTypes.put("3gp", "video/3gpp");
		mimeTypes.put("3g2", "video/3gpp2");
		mimeTypes.put("7z", "application/x-7z-compressed");
		
		extensions = new HashMap<String, String>();
		mimeTypes.forEach((key, value)->{
			String existing = extensions.get(value);
			if (existing==null || existing.length()<key.length()) {
				extensions.put(value, key);
			}
		});
	}

	public static FileSpecification getFile(FileSpecification[] files, String fileName) {
		for (FileSpecification file : files) {
			if (fileName.equals(file.getName())) {
				return file;
			}
		}
		return null;
	}
}
