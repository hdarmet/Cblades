package org.summer.security;

import java.util.Date;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.bind.DatatypeConverter;

import org.summer.SummerServlet;
import org.summer.controller.SummerControllerException;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.SignatureException;

public class SecurityManagerImpl implements SecurityManager {

	@Override
	public Object executeIfConnected(Executor executor) {
        ClaimSet claimSet = checkAuthentication(SummerServlet.getRequest());
        setAuthentication(SummerServlet.getResponse(), claimSet.subject, claimSet.expiration-claimSet.issuedAt);
		return executor.run(claimSet.subject);
	}
	
	@Override
	public Object executeIfAuthorized(Executor executor, String... roles) {
        ClaimSet claimSet = checkAuthentication(SummerServlet.getRequest());
        String[] userRoles = getRoles(claimSet.subject);
        for (String role : userRoles) {
        	for (String authorizedRole : roles) {
	            if (authorizedRole.equals(role)) {
	                setAuthentication(SummerServlet.getResponse(), 
	                	claimSet.subject, claimSet.expiration-claimSet.issuedAt);
	                return executor.run(claimSet.subject);
	            }
	        }
        }
        throw new SummerControllerException(403, "Not authorized");
	}

	@Override
	public void doConnect(String login, long expire) {
		setAuthentication(SummerServlet.getResponse(), login, expire);
	}
	
	@Override
	public void doDisconnect() {
		removeAuthentication(SummerServlet.getResponse());
	}
	
	@Override
	public void doSetRolesFinder(Finder rolesFinder) {
		this.rolesFinder = rolesFinder;
	}
    
	@Override
	public void doSetXsrfProtect(boolean xsrfProtect) {
		this.xsrfProtect = xsrfProtect;
	}
    
	@Override
	public void doSetSecureHTTP(boolean secureHTTP) {
		this.secureHTTP = secureHTTP;
	}
	
    String issuer = "Summer";
    String secret = UUID.randomUUID().toString();

    static class ClaimSpec{
    	ClaimSpec(String id, String subject, long ttlMillis) {
    		this.id = id;
    		this.subject = subject;
    		this.ttlMillis = ttlMillis;
    	}
    	
		String id;
        String subject;
        long ttlMillis;
    }

    static class ClaimSet {
    	ClaimSet(String id,  String issuer, String subject, long issuedAt, long expiration) {
    		this.id = id;
    		this.issuer = issuer;
    		this.subject = subject;
    		this.issuedAt = issuedAt;
    		this.expiration = expiration;
    	}
    	
        String id;
        String issuer;
        String subject;
        long issuedAt;
        long expiration;
    }
    
    public interface Finder {
    	String[] find(String user);
    }
    
    boolean xsrfProtect = true;
    boolean secureHTTP = true;
    
    Finder rolesFinder = user -> new String[] {user};

    ClaimSet checkAuthentication(HttpServletRequest request) {
        try {
            Cookie jwtCookie = null;
            if (request.getCookies()!=null) {
	            for (Cookie cookie : request.getCookies()) {
	            	if ("jwt".equals(cookie.getName())) {
	            		jwtCookie = cookie;
	            	}
	            }
            }
            if (jwtCookie == null) {
            	throw new SummerControllerException(403, "No authentication found");
            }
            String xsrfToken = request.getHeader("XSRF-TOKEN");
            ClaimSet claimSet = parse(jwtCookie.getValue());
            if (claimSet==null) {
                throw new SummerControllerException(403, "No authentication found");
            }
            if (this.xsrfProtect && !claimSet.id.equals(xsrfToken) || !claimSet.issuer.equals(issuer)) {
                 throw new SummerControllerException(403, "Authentication refused");
            }
            long now = System.currentTimeMillis();
            if (now > claimSet.expiration) {
                throw new SummerControllerException(403, "Authentication has expired");
            }
            return claimSet;
        } catch (SignatureException se) {
            throw new SummerControllerException(403, "Authentication refused");
        } catch (ExpiredJwtException eje) {
            throw new SummerControllerException(403, "Authentication expired");
        }
    }
    
    String setAuthentication(HttpServletResponse response, String login, long expire) {
        String xsrfToken = UUID.randomUUID().toString();
        ClaimSpec claimSpec = new ClaimSpec(xsrfToken, login, expire);
        String jwToken = createToken(claimSpec);
        Cookie jwtCookie = new Cookie("jwt", jwToken);
        jwtCookie.setPath("/");
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(this.secureHTTP);
        jwtCookie.setMaxAge(-1);
        response.addCookie(jwtCookie);
        Cookie xsrfCookie = new Cookie("xsrfToken", xsrfToken);
        xsrfCookie.setPath("/");
        xsrfCookie.setSecure(this.secureHTTP);
        xsrfCookie.setMaxAge(30*60*1000);
        response.addCookie(xsrfCookie);
        return jwToken;
    }

    void removeAuthentication(HttpServletResponse response) {
        Cookie jwtCookie = new Cookie("jwt", "");
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(0);
        response.addCookie(jwtCookie);
        Cookie xsrfCookie = new Cookie("xsrfToken", "");
        xsrfCookie.setPath("/");
        xsrfCookie.setMaxAge(0);
        response.addCookie(xsrfCookie);
    }

    String[] getRoles(String user) {
        return this.rolesFinder.find(user);
    }

    String createToken(ClaimSpec claimSpec) {
        SignatureAlgorithm signatureAlgorithm = SignatureAlgorithm.HS256;
        byte[] apiKeySecretBytes = DatatypeConverter.parseBase64Binary(secret);
        SecretKeySpec signingKey = new SecretKeySpec(apiKeySecretBytes, signatureAlgorithm.getJcaName());
        long now = System.currentTimeMillis();
        JwtBuilder builder = Jwts.builder().setId(claimSpec.id)
                .setIssuedAt(new Date(now))
                .setSubject(claimSpec.subject)
                .setIssuer(issuer)
                .signWith(signatureAlgorithm, signingKey);
        if (claimSpec.ttlMillis >= 0) {
            long expiration = now + claimSpec.ttlMillis;
            builder.setExpiration(new Date(expiration));
        }
        return builder.compact();
    }

    ClaimSet parse(String jwt) {
        Claims claims = Jwts.parser()
                .setSigningKey(DatatypeConverter.parseBase64Binary(secret))
                .parseClaimsJws(jwt).getBody();
        return new ClaimSet(
                claims.getId(),
                claims.getIssuer(),
                claims.getSubject(),
                claims.getIssuedAt().getTime(),
                claims.getExpiration().getTime());
    }
}
