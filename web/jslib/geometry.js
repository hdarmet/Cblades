'use strict';

/**
 * round a number to its 10000e decimal
 */
function round(v) {
    return Math.round(v*10000)/10000;
}

/**
 * Atan2 method with some rounding to make angle comparison easier
 */
export function atan2(dx, dy) {
    let angle = Math.round(Math.atan2(dx, -dy)*180/Math.PI*100)/100;
    return angle<0 ? angle+360 : angle;
}

/**
 * Comapre two numbers and return true if there are very similar, even if not strictly equal.
 */
export function same(v1, v2) {
    if (v1===v2) return true;
    if (v1!==0 && v2!==0 && (!v1 || !v2)) return false;
    return v1-v2>-0.0001 && v1-v2<0.0001;
}

/**
 * Convert angle degree value to radian value
 */
export function radian(deg) {
    return ((deg % 360) * Math.PI) / 180;
}

/**
 * Convert angle radian value to degree value
 */
export function degree(rad) {
    return ((rad * 180) / Math.PI) % 360;
}

/**
 * Set the angle value between
 */
export function canonizeAngle(angle) {
    while (angle<360) angle+=360;
    return (angle + 360)%360;
}

/**
 * Compute the addition of two angles
 */
export function sumAngle(angle1, angle2) {
    angle1<0&&(angle1+=360);
    angle2<0&&(angle2+=360);
    return (angle2 + angle1)%360;
}

/**
 * Compute the difference between two angles
 */
export function diffAngle(angle1, angle2) {
    let diff = angle2 - angle1;
    return diff<-180 ? diff+360 : diff>180 ? diff-360 : diff;
}

/**
 * Compute the average of two angles
 */
export function moyAngle(angle1, angle2) {
    return (360 + angle1 + diffAngle(angle1, angle2) / 2)%360
}

/**
 * Compute the opposite angle
 */
export function invertAngle(angle) {
    return (angle + 180)%360
}

/**
 * Checks if an angle is comprised in a range (clockwise)
 */
export function isAngleBetween(angle, bounds) {
    if (bounds[0]>bounds[1]) {
        return angle>=bounds[0] || angle<=bounds[1];
    }
    else {
        return angle>=bounds[0] && angle<=bounds[1];
    }
}

/**
 * Checks if a point is inside a polygon
 */
export function inside(target, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i].x, yi = polygon[i].y;
        let xj = polygon[j].x, yj = polygon[j].y;
        let intersect = ((yi > target.y) !== (yj > target.y))
            && (target.x < (xj - xi) * (target.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Point object in a 2D space
 */
export class Point2D {

    constructor(x, y) {
        this.x = x;
        this.y = y;
        console.assert(this._isValid());
    }

    _isValid() {
        return !isNaN(this.x+this.y);
    }

    getDistance(point) {
        return Math.sqrt((point.x-this.x)*(point.x-this.x)+(point.y-this.y)*(point.y-this.y));
    }

    translate(dx, dy) {
        return new Point2D(this.x+dx, this.y+dy);
    }

    equalsTo(point) {
        return this.x===point.x && this.y===point.y;
    }

    sameTo(point) {
        return same(point.x, this.x) && same(point.y, this.y);
    }

    toString() {
        return "point("+round(this.x)+", "+round(this.y)+")";
    }

    toArray() {
        return [this.x, this.y];
    }

    clone() {
        return new Point2D(this.x, this.y);
    }

    plus(x, y) {
        return new Point2D(this.x + x, this.y + y);
    }

    minus(x, y) {
        return new Point2D(this.x - x, this.y - y);
    }

    plusPoint(point) {
        return new Point2D(this.x + point.x, this.y + point.y);
    }

    minusPoint(point) {
        return new Point2D(this.x - point.x, this.y - point.y);
    }

    plusDim(dim) {
        return new Point2D(this.x + dim.w, this.y + dim.h);
    }

    minusDim(dim) {
        return new Point2D(this.x - dim.w, this.y - dim.h);
    }

}

/**
 * Gives the absolute location of a point situated on the point1-point2 line according to a distance factor between
 * point1 and point2: factor = 0 => point1, factor = 0.5, center of point1, point2, factor = 1 => point2, etc.
 */
Point2D.location = function(point1, point2, factor) {
    return new Point2D(point2.x*factor+point1.x*(1-factor), point2.y*factor+point1.y*(1-factor));
}
/**
 * Gives the location of a point relatively to point1, situated on the point1-point2 line according to a distance factor
 * between point1 and point2: factor = 0 => point1 (i.e 0,0), factor = 0.5, center of point1, point2,
 * factor = 1 => point2, etc.
 */
Point2D.position = function(point1, point2, factor) {
    return new Point2D(point2.x*factor-point1.x*factor, point2.y*factor-point1.y*factor);
}
Point2D.getEventPoint = function(event) {
    return new Point2D(event.offsetX, event.offsetY);
}

/**
 * Dimension object in a 2D space
 */
export class Dimension2D {

    constructor(w, h) {
        this.w = w;
        this.h = h;
        console.assert(this._isValid());
    }

    _isValid() {
        return !isNaN(this.w+this.h);
    }

    equalsTo(dimension) {
        return this.w===dimension.w && this.h===dimension.h;
    }

    sameTo(dimension) {
        return same(dimension.w, this.w) && same(dimension.h, this.h);
    }

    toString() {
        return "dimension("+round(this.w)+", "+round(this.h)+")";
    }

    toArray() {
        return [this.w, this.h];
    }

    clone() {
        return new Dimension2D(this.w, this.h);
    }

    plusDim(dim) {
        return new Dimension2D(this.w + dim.w, this.h + dim.h);
    }

    minusDim(dim) {
        return new Dimension2D(this.w - dim.w, this.h - dim.h);
    }

    get half() {
        return new Dimension2D(this.w/2, this.h/2);
    }

    get point() {
        return new Point2D(this.w, this.h);
    }

    get minus() {
        return new Dimension2D(-this.w, -this.h);
    }
}

/**
 * Kind of Rect that are defined by a left/top + right/bottom coordinates
 * Used essentially to compute bounding Rects
 */
export class Area2D {

    constructor(left, top, right, bottom) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
    }

    get x() {
        return (this.left+this.right)/2;
    }

    get y() {
        return (this.top+this.bottom)/2;
    }

    get w() {
        return this.right-this.left;
    }

    get h() {
        return this.bottom-this.top;
    }

    get origin() {
        return new Point2D(this.left, this.top);
    }

    get center() {
        return new Point2D(this.x, this.y);
    }

    get dimension() {
        return new Dimension2D(this.w, this.h);
    }

    inside(point) {
        return point.x>=this.left && point.x<=this.right
            && point.y>=this.top && point.y<=this.bottom;
    }

    add(area) {
        return new Area2D(
            this.left<area.left ? this.left : area.left,
            this.top<area.top ? this.top : area.top,
            this.right>area.right ? this.right : area.right,
            this.bottom>area.bottom ? this.bottom : area.bottom
        );
    }

    translate(point) {
        return new Area2D(
            this.left+point.x,
            this.top+point.y,
            this.right+point.x,
            this.bottom+point.y
        );
    }

    intersect(area) {
        return this.left<=area.right && this.right>=area.left
            && this.top<=area.bottom && this.bottom>=area.top;
    }

    contains(area) {
        return this.left<=area.left && this.right>=area.right
            && this.top<=area.top && this.bottom>=area.bottom;
    }

    equalsTo(area) {
        return this.left===area.left && this.top===area.top
            && this.right===area.right && this.bottom===area.bottom;
    }

    sameTo(area) {
        return same(area.left, this.left) && same(area.top, this.top)
            && same(area.right, this.right) && same(area.bottom, this.bottom);
    }

    toString() {
        return "area("+round(this.left)+", "+round(this.top)+", "+round(this.right)+", "+round(this.bottom)+")";
    }

    toArray() {
        return [this.left, this.top, this.right, this.bottom];
    }

    clone() {
        return new Area2D(this.left, this.top, this.right, this.bottom);
    }

    plusPoint(point) {
        return new Area2D(this.left + point.x, this.top + point.y, this.right + point.x, this.bottom + point.y);
    }

    minusPoint(point) {
        return new Area2D(this.left - point.x, this.top - point.y, this.right - point.x, this.bottom - point.y);
    }

    plusDim(dim) {
        return new Area2D(this.left + dim.w, this.top + dim.h, this.right + dim.w, this.bottom + dim.h);
    }

    minusDim(dim) {
        return new Area2D(this.left - dim.w, this.top - dim.h, this.right - dim.w, this.bottom - dim.h);
    }


}
Area2D.create = function(position, dimension) {
    return new Area2D(position.x, position.y, position.x+dimension.w, position.y+dimension.h);
}
Area2D.boundingArea = function(...polygon) {
    let minx = polygon[0].x;
    let maxx = polygon[0].x;
    let miny = polygon[0].y;
    let maxy = polygon[0].y;
    for (let i=1; i<polygon.length; i++) {
        if (polygon[i].x<minx) minx = polygon[i].x;
        if (polygon[i].x>maxx) maxx = polygon[i].x;
        if (polygon[i].y<miny) miny = polygon[i].y;
        if (polygon[i].y>maxy) maxy = polygon[i].y;
    }
    return new Area2D(minx, miny, maxx, maxy);
}
Area2D.rectBoundingArea = function(transform, x, y, w, h) {
    if (!transform) return new Area2D(x, y, x+w, y+h);
    let upLeft = transform.point(new Point2D(x, y));
    let upRight = transform.point(new Point2D(x+w, y));
    let downLeft = transform.point(new Point2D(x, y+h));
    let downRight = transform.point(new Point2D(x+w, y+h));
    return Area2D.boundingArea(upLeft, upRight, downLeft, downRight);
}

/**
 * Affine Matrix in a 2D Space
 */
export class Matrix2D {

    constructor(a=1, b=0, c=0, d=1, e=0, f=0) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
        console.assert(this._isValid());
    }

    get isIdentity() {
        return this.a===1 && this.b===0 && this.c===0 && this.d===1 && this.e===0 && this.f===0;
    }

    _isValid() {
        return !isNaN(this.a+this.b+this.c+this.d+this.e+this.f);
    }

    clone() {
        return new Matrix2D(this.a, this.b, this.c, this.d, this.e, this.f);
    }

    _compute() {

        function _normalize2D(a, b) {
            var d = Math.sqrt(a * a + b * b);
            return {a:a/d, b:b/d};
        }

        function _determinant2D(a, b, c, d) {
            return a * d - b * c;
        }

        if (!this._split) {
            let split = {};
            split.scalex = Math.sqrt(this.a*this.a + this.b*this.b);
            let {a, b} = _normalize2D(this.a, this.b);
            let shear = a * this.c + b * this.d;
            let c = this.c - a * shear;
            let d = this.d - a * shear;
            split.scaley = Math.sqrt(this.c*this.c + this.d*this.d);
            let {a:sin, b:cos} = _normalize2D(c, d);
            sin = -sin;
            if (_determinant2D(this.a, this.b, this.c, this.d) < 0) split.scalex = -split.scalex;
            if (cos < 0) {
                split.angle = degree(Math.acos(cos));
                if (sin < 0) {
                    split.angle = 360 - split.angle;
                }
            } else split.angle = degree(Math.asin(sin));
            if (split.angle<0) split.angle+=360;
            this._split = split;
        }
        return this._split;
    }

    _add(a, b, c, d, e, f) {
        delete this._split;
        let aNew = a * this.a + b * this.c;
        let bNew = a * this.b + b * this.d;
        this.e += e * this.a + f * this.c;
        this.f += e * this.b + f * this.d;
        this.c = c * this.a + d * this.c;
        this.d = c * this.b + d * this.d;
        this.a = aNew;
        this.b = bNew;
        console.assert(this._isValid());
        return this;
    };

    _mult(matrix) {
        delete this._split;
        this._add(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
        return this;
    };

    mult(matrix) {
        return this.clone()._mult(matrix);
    }

    _concat(matrix) {
        delete this._split;
        let aNew = matrix.a * this.a + matrix.c * this.b;
        let cNew = matrix.a * this.c + matrix.c * this.d;
        let eNew = matrix.a * this.e + matrix.c * this.f + matrix.e;

        this.b = matrix.b * this.a + matrix.d * this.b;
        this.d = matrix.b * this.c + matrix.d * this.d;
        this.f = matrix.b * this.e + matrix.d * this.f + matrix.f;

        this.a = aNew;
        this.c = cNew;
        this.e = eNew;
        console.assert(this._isValid());
        return this;
    };

    concat(matrix) {
        return this.clone()._concat(matrix);
    }

    _unconcat(matrix) {
        return this.concat(matrix.invert());
    }

    unconcat(matrix) {
        return this.clone()._unconcat(matrix);
    }

    _invert() {
        delete this._split;
        let x = this.a * this.d - this.b * this.c;
        let a = this.d / x;
        let b = -this.b / x;
        let c = -this.c / x;
        let d = this.a / x;
        let e = (this.c * this.f - this.d * this.e) / x;
        let f = (this.b * this.e - this.a * this.f) / x;
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
        console.assert(this._isValid());
        return this;
    }

    invert() {
        return this.clone()._invert();
    }

    _translate(point) {
        delete this._split;
        this.e += point.x * this.a + point.y * this.c;
        this.f += point.x * this.b + point.y * this.d;
        console.assert(this._isValid());
        return this;
    }

    translate(point) {
        return this.clone()._translate(point);
    }

    _scale(scale, center) {
        delete this._split;
        (center.x || center.y) && this._translate(center);
        this.a *= scale.x;
        this.b *= scale.x;
        this.c *= scale.y;
        this.d *= scale.y;
        (center.x || center.y) && this._translate({x:-center.x, y:-center.y});
        console.assert(this._isValid());
        return this;
    }

    scale(scale, center) {
        return this.clone()._scale(scale, center);
    }

    _rotate(angle, center) {
        delete this._split;
        angle = radian(angle);
        let cx = center.x || 0;
        let cy = center.y || 0;
        let cos = +Math.cos(angle).toFixed(9);
        let sin = +Math.sin(angle).toFixed(9);
        this._add(cos, sin, -sin, cos, cx, cy);
        return this._add(1, 0, 0, 1, -cx, -cy);
    };

    rotate(angle, center) {
        return this.clone()._rotate(angle, center);
    }

    point(point) {
        return new Point2D(this.a*point.x+this.c*point.y+this.e, this.b*point.x+this.d*point.y+this.f);
    }

    get translation() {
        return new Point2D(this.e, this.f);
    }

    get angle() {
        return this._compute().angle;
    }

    get scaling() {
        return new Point2D(this._compute().scalex, this._compute().scaley);
    }

    equalsTo(matrix) {
        return this.a===matrix.a && this.b===matrix.b && this.c===matrix.c &&
            this.d===matrix.d && this.e===matrix.e && this.f===matrix.f;
    }

    sameTo(matrix) {
        return same(matrix.a, this.a) && same(matrix.b, this.b)
            && same(matrix.c, this.c) && same(matrix.d, this.d)
            && same(matrix.e, this.e) && same(matrix.f, this.f);
    }

    toString() {
        return "matrix("+round(this.a)+", "+round(this.b)+", "+
            round(this.c)+", "+round(this.d)+", "+
            round(this.e)+", "+round(this.f)+")";
    }

    toArray() {
        return [this.a, this.b, this.c, this.d, this.e, this.f];
    }

}
Matrix2D.translate = function(point) {
    return new Matrix2D()._translate(point);
};
Matrix2D.scale = function(scale, center) {
    return new Matrix2D()._scale(scale, center);
};
Matrix2D.rotate = function(angle, center) {
    return new Matrix2D()._rotate(angle, center);
};
Matrix2D.IDENTITY = new Matrix2D();
