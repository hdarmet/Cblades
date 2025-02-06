package fr.cblades.domain;

import org.summer.controller.Json;
import org.summer.data.BaseEntity;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
public class SequenceElement extends BaseEntity {

    String type;
    @Column(length = 2000)
    String content;

    public String getType() {return this.type;}
    public SequenceElement setType(String type) {
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
    boolean last;

    @Transient
    Map<String, Object> attributes = null;

    Object buildValue(Object value) {
        if (value instanceof Json) {
            if (((Json)value).isArray()) {
                return buildList((Json) value);
            }
            else {
                return buildMap((Json) value);
            }
        }
        else {
            return value;
        }
    }

    Map<String, Object> buildMap(Json json) {
        Map<String, Object> attrs = new HashMap<>();
        for (String attrName : json.keys()) {
            Object value = json.get(attrName);
            attrs.put(attrName, buildValue(value));
        }
        return attrs;
    }

    List<Object> buildList(Json json) {
        List<Object> attrs = new ArrayList<>();
        for (Object value : json) {
            attrs.add(buildValue(value));
        }
        return attrs;
    }

    Map<String, Object> buildAttributes() {
        Json json = Json.createJsonFromString(this.content);
        return buildMap(json);
    }

    public java.util.Map<String, Object> getAttrs() {
        if (this.attributes == null) this.attributes = buildAttributes();
        return this.attributes;
    }
    public SequenceElement setAttrs(java.util.Map<String, Object> attrs) {
        this.attributes = attrs;
        return this;
    }

    public static Object getAttr(java.util.Map<String, Object> attrs, String path) {
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            attrs = (java.util.Map<String, Object>) attrs.get(names[index]);
            if (attrs==null) return null;
        }
        return attrs.get(names[names.length-1]);
    }

    public void setAttr(java.util.Map<String, Object> attrs, String path, Object value) {
        String[] names = path.split("\\.");
        for (int index=0; index<names.length-1; index++) {
            Map<String, Object> lattrs = (Map<String, Object>) attrs.get(names[index]);
            if (lattrs==null) {
                lattrs=new HashMap<>();
                attrs.put(names[index], lattrs);
            }
            attrs = lattrs;
        }
        attrs.put(names[names.length-1], value);
    }

    public Object getAttr(String path) {
        if (this.attributes == null) this.attributes = buildAttributes();
        return getAttr(this.attributes, path);
    }

    public boolean isTurnClosed() {
        return type.equals(TYPE_NEXT_TURN);
    }

    public SequenceElement setLast(boolean last) {
        this.last = last;
        return this;
    }
    public boolean isLast() {
        return last;
    }

    public static String TYPE_NEXT_TURN = "next-turn";

    public interface SequenceVisitor {

        default void visit(SequenceElement element) {}

    }
}
