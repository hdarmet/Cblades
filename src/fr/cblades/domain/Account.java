package fr.cblades.domain;

import org.summer.SummerException;
import org.summer.data.BaseEntity;
import org.summer.data.SummerNotFoundException;

import javax.persistence.*;

@Entity
@Table(indexes=@Index(name="idx_account", unique=true, columnList="email"))
//create index <idx-name>> on Account unsing GIN (to_tsvector('english', firstName || ' ' || lastName));
public class Account extends BaseEntity {

    String firstName="";
    String lastName="";
    String email;
    int rating=0;
    int messageCount=0;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    Login access;
    String avatar;
    @Enumerated(EnumType.STRING)
    AccountStatus status;

    public String getFirstName() {
        return this.firstName;
    }
    public Account setFirstName(String firstName) {
        this.firstName = firstName;
        return this;
    }

    public String getLastName() {
        return this.lastName;
    }
    public Account setLastName(String lastName) {
        this.lastName = lastName;
        return this;
    }

    public String getEmail() {
        return this.email;
    }
    public Account setEmail(String email) {
        this.email = email;
        return this;
    }

    public int getRating() {
        return this.rating;
    }
    public Account setRating(int rating) {
        this.rating = rating;
        return this;
    }

    public int getMessageCount() {
        return this.messageCount;
    }
    public Account setMessageCount(int messageCount) {
        this.messageCount = messageCount;
        return this;
    }

    public Login getAccess() {
        return this.access;
    }
    public Account setAccess(Login access) {
        this.access = access;
        return this;
    }

    public String getAvatar() {
        return this.avatar;
    }
    public Account setAvatar(String avatar) {
        this.avatar = avatar;
        return this;
    }

    public AccountStatus getStatus() {
        return this.status;
    }
    public Account setStatus(AccountStatus status) {
        this.status = status;
        return this;
    }

    public String getLogin() {
        return this.access.getLogin();
    }
    public Account setLogin(String login) {
        this.access.setLogin(login);
        return this;
    }

    public String getPassword() { return this.access.getPassword(); }
    public Account setPassword(String password) {
        this.access.setPassword(password);
        return this;
    }

    public LoginRole getRole() { return this.access.getRole(); }
    public Account setRole(LoginRole role) {
        this.access.setRole(role);
        return this;
    }

    static public Account find(EntityManager em, long id) {
        Account account = em.find(Account.class, id);
        if (account==null) {
            throw new SummerNotFoundException(
                String.format("Unknown Account with id %d", id)
            );
        }
        return account;
    }

    static public Account find(EntityManager em, String user) {
        Account account = Login.findAccountByLogin(em, user);
        if (account==null) {
            throw new SummerNotFoundException(
                String.format("Unknown Account with Login name %s", user)
            );
        }
        return account;
    }

    static public String getRatingLevel(Account account) {
        for (AccountRatingLevel level : AccountRatingLevel.values()) {
            if (account.getRating()>=level.getMinRating() && account.getRating()<=level.getMaxRating()) {
                return level.getLabel();
            }
        }
        throw new SummerException("Unexcepted issue : a rating should be reached.");
    }

}

