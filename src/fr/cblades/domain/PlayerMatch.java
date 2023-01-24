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
    int playedTurns = 0;

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

    public int getPlayedTurns() {
        return this.playedTurns;
    }
    public PlayerMatch setPlayedTurns(int playedTurns) {
        this.playedTurns = playedTurns;
        return this;
    }

}
