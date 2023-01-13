package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.Map;
import java.util.*;

@Entity
public class PlayerMatch extends BaseEntity {

    @ManyToOne
    Account playerAccount;
    @ManyToOne
    PlayerIdentity playerIdentity;

    public Account getPlayerAccount() {
        return this.playerAccount;
    }
    public PlayerMatch setPlayerAccount(Account playerAccount) {
        this.playerAccount = playerAccount;
        return this;
    }

    public PlayerIdentity getPlayerIdentity() {
        return this.playerIdentity;
    }
    public PlayerMatch setPlayerAccount(PlayerIdentity playerIdentity) {
        this.playerIdentity = playerIdentity;
        return this;
    }

}
