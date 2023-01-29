package fr.cblades.game;

import fr.cblades.domain.SequenceElement;

public interface SequenceVisitor {

    default void defaultVisit(SequenceElement element) {}

    default void visit(SequenceElement.MoveSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.StateSequenceElement element) {
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

    default void visit(SequenceElement.RefillSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.RallySequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.ReorganizeSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.LossConsistencySequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.ConfrontSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.CrossingSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.AttackerEngagementSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.DefenderEngagementSequenceElement element) {
        defaultVisit(element);
    }

    default void visit(SequenceElement.DisengagementSequenceElement element) {
        defaultVisit(element);
    }

}
