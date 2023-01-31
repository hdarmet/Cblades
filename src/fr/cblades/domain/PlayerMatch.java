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
    long lastSequenceCount = -1;

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
    public PlayerMatch setPlayerIdentity(PlayerIdentity playerIdentity) {
        this.playerIdentity = playerIdentity;
        return this;
    }

    public long getLastSequenceCount() {
        return this.lastSequenceCount;
    }
    public PlayerMatch setLastSequenceCount(long lastSequenceCount) {
        this.lastSequenceCount = lastSequenceCount;
        return this;
    }

}
