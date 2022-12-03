package org.summer.data;

import org.summer.SummerException;

import javax.persistence.PersistenceException;

public class SummerPersistenceException extends SummerException {

    public SummerPersistenceException(PersistenceException pe) {
        super(pe);
    }

}
