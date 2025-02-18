package org.summer;

import java.util.List;

public interface Mockable {

    List<CallRecord> getCalls();

    default void register(
            String functionName,
            Object returnValue,
            Throwable exception,
            Object ... parameters)
    {
        getCalls().add(new CallRecord(functionName, returnValue, exception, parameters));
    }

    default CallRecord peekCall() {
        if (!getCalls().isEmpty()) {
            return getCalls().remove(0);
        }
        else {
            throw new SummerTestException("No request available");
        }
    }

    default CallRecord expects(String functionName) {
        CallRecord record = new CallRecord(functionName, null, null, null);
        getCalls().add(record);
        return record;
    }

    default void hasFinished() {
        if (!getCalls().isEmpty()) throw new SummerTestException("Request(s) still pending");
    }

    default void clear() {
        getCalls().clear();
    }

}
