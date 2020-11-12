'use strict';

import {
    describe, it, before, assert, executeTimeouts
} from "../jstest/jtest.js";
import {
    Point2D, Matrix2D
} from "../jslib/geometry.js";

describe("Geometry", ()=> {

    it("Checks point class", () => {
        when:
            var point = new Point2D(30, 40);
        then:
            assert(point.x).equalsTo(30);
            assert(point.y).equalsTo(40);
            assert(point.getDistance(0, 0)).equalsTo(50);
            assert(point.equalsTo(new Point2D(30, 40))).isTrue();
            assert(point.equalsTo(new Point2D(40, 30))).isFalse();
            assert(point.sameTo(new Point2D(30.00005, 40.00005))).isTrue();
            assert(point.sameTo(new Point2D(30.00015, 40.00015))).isFalse();
            assert(point.toString()).equalsTo("point(30, 40)");
        when:
            var clonePoint = point.clone();
        then:
            assert(clonePoint.x).equalsTo(30);
            assert(clonePoint.y).equalsTo(40);
    });

    it("Checks Matrix creation and identity", () => {
        when:
            var matrix = new Matrix2D();
        then:
            assert(matrix.isIdentity).isTrue();
    });

    it("Checks Matrix translation", () => {
        when:
            var matrix = new Matrix2D.translate(new Point2D(30, 40));
            var point = new Point2D(15, 25);
        then:
            var tpoint = matrix.point(point);
            assert(tpoint.x).equalsTo(45);
            assert(tpoint.y).equalsTo(65);
        when:
            var tmatrix = matrix.translate(new Point2D(15, -15));
        then:
            tpoint = tmatrix.point(point);
            assert(tpoint.x).equalsTo(60);
            assert(tpoint.y).equalsTo(50);
            assert(tmatrix.translation.equalsTo(new Point2D(45, 25))).isTrue();
    });

    it("Checks Matrix scaling", () => {
        when:
            var matrix = new Matrix2D.scale(new Point2D(2, 2), new Point2D(10, 20));
            var point = new Point2D(15, 30);
        then:
            var tpoint = matrix.point(point);
            assert(tpoint.x).equalsTo(20);
            assert(tpoint.y).equalsTo(40);
        when:
            var tmatrix = matrix.scale(new Point2D(2, 3), new Point2D(10, 20));
        then:
            tpoint = tmatrix.point(point);
            assert(tpoint.x).equalsTo(30);
            assert(tpoint.y).equalsTo(80);
            assert(tmatrix.scaling.equalsTo(new Point2D(4, 6))).isTrue();
    });

    it("Checks Matrix rotation", () => {
        when:
            var matrix = new Matrix2D.rotate(90, new Point2D(10, 20));
            var point = new Point2D(15, 30);
        then:
            var tpoint = matrix.point(point);
            assert(tpoint.x).equalsTo(0);
            assert(tpoint.y).equalsTo(25);
        when:
            var tmatrix = matrix.rotate(90, new Point2D(10, 20));
        then:
            tpoint = tmatrix.point(point);
            assert(tpoint.x).equalsTo(5);
            assert(tpoint.y).equalsTo(10);
            assert(tmatrix.angle).equalsTo(180);
    });

    it("Checks Matrix angle computing", () => {
        when:
            var SQRT2DIV2 = Math.sqrt(2)/2;
            var matrix = new Matrix2D.rotate(0, new Point2D(0, 0));
            var point = new Point2D(1, 0);
        then:
            assert(matrix.point(point).equalsTo(new Point2D(1, 0)));
            assert(matrix.angle).sameTo(0);
        when:
            matrix = new Matrix2D.rotate(45, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(SQRT2DIV2, SQRT2DIV2))).isTrue();
            assert(matrix.angle).sameTo(45);
        when:
            matrix = new Matrix2D.rotate(90, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(0, 1))).isTrue();
            assert(matrix.angle).sameTo(90);
        when:
            matrix = new Matrix2D.rotate(135, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(-SQRT2DIV2, SQRT2DIV2))).isTrue();
            assert(matrix.angle).sameTo(135);
        when:
            matrix = new Matrix2D.rotate(180, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(-1, 0))).isTrue();
            assert(matrix.angle).sameTo(180);
        when:
            matrix = new Matrix2D.rotate(225, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(-SQRT2DIV2, -SQRT2DIV2))).isTrue();
            assert(matrix.angle).sameTo(225);
        when:
            matrix = new Matrix2D.rotate(270, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(0, -1))).isTrue();
            assert(matrix.angle).sameTo(270);
        when:
            matrix = new Matrix2D.rotate(315, new Point2D(0, 0));
        then:
            assert(matrix.point(point).sameTo(new Point2D(SQRT2DIV2, -SQRT2DIV2))).isTrue();
            assert(matrix.angle).sameTo(315);
    });

    it("Checks Matrix inversion", () => {
        when:
            var matrix = new Matrix2D(1, 2, 3, 4, 5, 6);
            var point = new Point2D(10, 15);
            var tpoint = matrix.point(point);
            var imatrix = matrix.invert();
        then:
            var ipoint = imatrix.point(tpoint);
            assert(ipoint.x).equalsTo(10);
            assert(ipoint.y).equalsTo(15);
    });

    it("Checks Matrix equalsTo, toString and identity", () => {
        when:
            var matrix1 = new Matrix2D(1, 2, 3, 4, 5, 6);
            var matrix2 = new Matrix2D(1, 2, 3, 4, 5, 6);
            var dmatrix = new Matrix2D(2, 2, 3, 4, 5, 6);
        then:
            assert(matrix1.equalsTo(matrix2)).isTrue();
            assert(matrix1.equalsTo(dmatrix)).isFalse();
            assert(matrix1.toString()).equalsTo("matrix(1, 2, 3, 4, 5, 6)");
            assert(Matrix2D.getIdentity().isIdentity).isTrue();
        when:
            var smatrix1 = new Matrix2D(1.00005, 2.00005, 3.00005, 4.00005, 5.00005, 6.00005);
            var smatrix2 = new Matrix2D(1, 2, 3, 4, 5, 6.00015);
            assert(matrix1.sameTo(smatrix1)).isTrue();
            assert(matrix1.sameTo(smatrix2)).isFalse();
    });

    it("Checks Matrix concatenation", () => {
        when:
            var matrix1 = new Matrix2D.translate(new Point2D(30, 40));
            var matrix2 = new Matrix2D.scale(new Point2D(2, 2), new Point2D(30, 40));
            var point1 = new Point2D(0, 0);
            var point2 = new Point2D(5, 5);
            var cmatrix = matrix1.concat(matrix2);
            var ipoint1 = cmatrix.point(point1);
            var ipoint2 = cmatrix.point(point2);
        then:
            assert(ipoint1.x).equalsTo(30);
            assert(ipoint1.y).equalsTo(40);
            assert(ipoint2.x).equalsTo(40);
            assert(ipoint2.y).equalsTo(50);
        when:
            var mmatrix = matrix2.mult(matrix1);
        then:
            assert(mmatrix.equalsTo(cmatrix)).isTrue();
        when:
            var fmatrix = cmatrix.unconcat(matrix2);
        then:
            assert(fmatrix.equalsTo(matrix1));
    });

});