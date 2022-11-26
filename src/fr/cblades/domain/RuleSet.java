package fr.cblades.domain;

import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(indexes=@Index(name="idx_ruleset", unique=true, columnList="category, ruleSetVersion"))
public class RuleSet extends BaseEntity {

    String category;
    String ruleSetVersion;
    boolean published;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    List<Sheet> sheets = new ArrayList<>();

    public String getCategory() {
        return this.category;
    }
    public RuleSet setCategory(String category) {
        this.category = category;
        return this;
    }

    public String getRuleSetVersion() {
        return this.ruleSetVersion;
    }
    public RuleSet setRuleSetVersion(String ruleSetVersion) {
        this.ruleSetVersion = ruleSetVersion;
        return this;
    }

    public boolean isPublished() { return this.published; }
    public RuleSet setPublished(boolean published) {
        this.published = published;
        return this;
    }

    public List<Sheet> getSheets() {
        return Collections.unmodifiableList(this.sheets);
    }
    public Sheet getSheet(int ordinal) {
        for (Sheet sheet : sheets) {
            if (sheet.getOrdinal()==ordinal) return sheet;
        }
        return null;
    }
    public RuleSet addSheet(Sheet sheet) {
        this.sheets.add(sheet);
        return this;
    }
    public RuleSet removeSheet(Sheet sheet) {
        this.sheets.remove(sheet);
        return this;
    }

}
