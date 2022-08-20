package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;

@Entity
@Table(indexes=@Index(name="idx_account", unique=true, columnList="email"))
public class Account extends BaseEntity {

    String firstName="";
    String lastName="";
    String email;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    Login access;
    String avatar;
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

}

