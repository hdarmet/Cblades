package fr.cblades.domain;

import org.summer.SummerException;
import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
public class Sheet extends BaseEntity {

    int ordinal;
    String name="";
    @Column(length = 20000)
    String description="";
    String path="";
    String icon="";

    public int getOrdinal() {
        return this.ordinal;
    }
    public Sheet setOrdinal(int ordinal) {
        this.ordinal = ordinal;
        return this;
    }

    public String getName() {
        return this.name;
    }
    public Sheet setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return this.description;
    }
    public Sheet setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getPath() {
        return this.path;
    }
    public Sheet setPath(String path) {
        this.path = path;
        return this;
    }

    public String getIcon() {
        return this.icon;
    }
    public Sheet setIcon(String icon) {
        this.icon = icon;
        return this;
    }

}
