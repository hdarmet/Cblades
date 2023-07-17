package org.summer;

import java.util.*;

public interface CollectionSunbeam {

    default <T> List<T> arrayList(T ... values) {
        List<T> list = new ArrayList<>();
        Collections.addAll(list, values);
        return list;
    }

    default <K, T> Map<K, T> hashMap(Pair<K, T> ... entries) {
        Map<K, T> map = new HashMap<>();
        for (Pair<K, T> entry : entries) {
            map.put(entry.first, entry.second);
        }
        return map;
    }
     default <F, S> Pair<F, S> pair(F first, S second) {
        return new Pair<>(first, second);
     }
}
