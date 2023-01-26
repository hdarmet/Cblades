package fr.cblades.game;

import fr.cblades.domain.SequenceElement;

public interface SequenceVisitor {

    default void defaultVisit(SequenceElement element) {
    }

    default void visit(SequenceElement.MoveSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.RotateSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.ReorientSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.TurnSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.NextTurnSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.RestSequenceElement element) {
        defaultVisit(element);
    }

}
