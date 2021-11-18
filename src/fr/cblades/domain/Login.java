package fr.cblades.domain;

import org.summer.controller.SummerControllerException;
import org.summer.data.BaseEntity;

import javax.persistence.Entity;
import javax.persistence.Index;
import javax.persistence.Table;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Entity
@Table(indexes=@Index(name="idx_login", unique=true, columnList="login"))
public class Login extends BaseEntity {

    String login="";
    String password="";
    boolean admin=false;
    boolean test=false;

    public String getLogin() {
        return this.login;
    }
    public Login setLogin(String login) {
        this.login = login;
        return this;
    }

    public String getPassword() {
        return password;
    }
    public Login setPassword(String password) {
        this.password = password;
        return this;
    }

    public boolean isAdmin() {
        return this.admin;
    }
    public Login setAdmin(boolean admin) {
        this.admin = admin;
        return this;
    }

    public boolean isTest() {
        return this.test;
    }
    public Login setTest(boolean test) {
        this.test = test;
        return this;
    }

    public static String encrypt(String password) {
        return encrypt(password, "MD5");
    }

    public static String encrypt(String password, String algorithm) {
        try {
            MessageDigest md = MessageDigest.getInstance(algorithm);
            md.update(password.getBytes());
            byte[] bytes = md.digest();
            StringBuilder sb = new StringBuilder();
            for(int i=0; i< bytes.length ;i++) {
                sb.append(Integer.toString((bytes[i] & 0xff) + 0x100, 16).substring(1));
            }
            return sb.toString();
        }
        catch (NoSuchAlgorithmException e)
        {
            throw new SummerControllerException(403, "Unexpected issue. Please report : %s", e.getMessage());
        }
    }

}

