package fr.cblades.domain;

import org.summer.controller.Json;
import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.HashMap;
import java.util.Map;

@Entity
public class SequenceElement extends BaseEntity {

    String type;
    @Column(length = 2000)
    String content;

    public String getType() {
        return this.type;
    }

    public SequenceElement setStory(String type) {
        this.type = type;
        return this;
    }

    public String getContent() {
        return this.content;
    }

    public SequenceElement setContent(String content) {
        this.content = content;
        return this;
    }

    public void accept(SequenceVisitor visitor) {
        visitor.visit(this);
    }

    @Transient
    Map<String, Object> attributes = null;

    Map<String, Object> buildAttributes(Json json) {
        Map<String, Object> attrs = new HashMap<>();
        for (String attrName : json.keys()) {
            Object value = json.get(attrName);
            attrs.put(attrName, value instanceof Json ? buildAttributes((Json)value): value);
        }
        return attrs;
    }

    Map<String, Object> buildAttributes() {
        Json json = Json.createJsonFromString(this.content);
        return buildAttributes(json);
    }

    public java.util.Map<String, Object> getAttrs() {
        if (this.attributes == null) this.attributes = buildAttributes();
        return this.attributes;
    }
    public SequenceElement setAttrs(java.util.Map<String, Object> attrs) {
        this.attributes = attrs;
        return this;
    }
    public Object getAttr(String path) {
        if (this.attributes == null) this.attributes = buildAttributes();
        java.util.Map<String, Object> attrs = this.attributes;
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            attrs = (java.util.Map<String, Object>) attrs.get(names[index]);
            if (attrs==null) return null;
        }
        return attrs.get(names[names.length-1]);
    }
    public SequenceElement setAttr(String path, Object value) {
        if (this.attributes == null) this.attributes = buildAttributes();
        java.util.Map<String, Object> attrs = this.attributes;
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            attrs = (Map<String, Object>) attrs.get(names[index]);
            if (attrs==null) attrs=new HashMap<>();
        }
        attrs.put(names[names.length-1], value);
        return this;
    }

    public boolean isTurnClosed() {
        return type.equals(TYPE_NEXT_TURN);
    }

    public static String TYPE_NEXT_TURN = "next-turn";

    public interface SequenceVisitor {

        default void visit(SequenceElement element) {}

    }
}
