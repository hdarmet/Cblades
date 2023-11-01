package fr.cblades.domain;

import org.summer.controller.SummerControllerException;
import org.summer.data.BaseEntity;
import org.summer.data.DataSunbeam;

import javax.persistence.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(indexes=@Index(name="idx_login", unique=true, columnList="login"))
public class Login extends BaseEntity {

    String login="";
    String password="";
    String altPassword=null;
    long altPasswordLease = Integer.MIN_VALUE;
    @Enumerated(EnumType.STRING)
    LoginRole role = LoginRole.STANDARD;

    public String getLogin() {
        return this.login;
    }
    public Login setLogin(String login) {
        this.login = login;
        return this;
    }

    public String getPassword() { return password; }
    public Login setPassword(String password) {
        this.password = password;
        return this;
    }

    public LoginRole getRole() { return role; }
    public Login setRole(LoginRole role) {
        this.role = role;
        return this;
    }

    public String getAltPassword() { return altPassword; }
    public Login setAltPassword(String altPassword) {
        this.altPassword = altPassword;
        return this;
    }

    public long getAltPasswordLease() { return altPasswordLease; }
    public Login setAltPasswordLease(long altPasswordLease) {
        this.altPasswordLease = altPasswordLease;
        return this;
    }

    public boolean isAdministrator() {
        return this.role==LoginRole.ADMINISTRATOR;
    }
    public Login setAdministrator(boolean admin) {
        if (admin) {
            this.role = LoginRole.ADMINISTRATOR;
        }
        else if (this.role==LoginRole.ADMINISTRATOR) {
            this.role = LoginRole.STANDARD;
        }
        return this;
    }

    public boolean isContributor() {
        return this.role==LoginRole.CONTRIBUTOR;
    }
    public Login setContributor(boolean contrib) {
        if (contrib) {
            this.role = LoginRole.CONTRIBUTOR;
        }
        else if (this.role==LoginRole.CONTRIBUTOR) {
            this.role = LoginRole.STANDARD;
        }
        return this;
    }

    public boolean isTest() {
        return this.role==LoginRole.TEST;
    }
    public Login setTest(boolean test) {
        if (test) {
            this.role = LoginRole.TEST;
        }
        else if (this.role==LoginRole.TEST) {
            this.role = LoginRole.STANDARD;
        }
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
            for (byte aByte : bytes) {
                sb.append(Integer.toString((aByte & 0xff) + 0x100, 16).substring(1));
            }
            return sb.toString();
        }
        catch (NoSuchAlgorithmException e)
        {
            throw new SummerControllerException(403, "Unexpected issue. Please report : %s", e);
        }
    }

    static public Account findAccountByLogin(EntityManager em, String login) {
        Query query = em.createQuery("select a from Account a, Login l where a.access = l and l.login=:login")
            .setParameter("login", login);
        try {
            return (Account)query.getSingleResult();
        }
        catch (NoResultException enf) {
            return null;
        }
    }

}

