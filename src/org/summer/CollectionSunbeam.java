package org.summer;

import java.util.Collections;
import java.util.List;
import java.util.ArrayList;

public interface CollectionSunbeam {

    default <T> List<T> arrayList(T ... values) {
        List<T> list = new ArrayList<>();
        Collections.addAll(list, values);
        return list;
    }

}
