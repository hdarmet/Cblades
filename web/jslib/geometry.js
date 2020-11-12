'use strict';

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
function radian(deg) {
    return ((deg % 360) * Math.PI) / 180;
}

/**
 * Convert angle radian value to degree value
 */
function degree(rad) {
    return ((rad * 180) / Math.PI) % 360;
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

    equalsTo(point) {
        return this.x===point.x && this.y===point.y;
    }

    sameTo(point) {
        return same(point.x, this.x) && same(point.y, this.y);
    }

    toString() {
        return "point("+this.x+", "+this.y+")";
    }

    clone() {
        return new Point2D(this.x, this.y);
    }
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
        return "matrix("+this.a+", "+this.b+", "+this.c+", "+this.d+", "+this.e+", "+this.f+")";
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
Matrix2D.getIdentity = function() {
    return new Matrix2D();
};
