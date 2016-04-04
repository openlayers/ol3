goog.provide('ol.vec.Mat4');
goog.provide('ol.vec.Mat4.Number');

goog.require('ol.ext.glmatrix');


/**
 * A alias for the goog.vec.Number type.
 * @typedef {goog.vec.Number}
 */
ol.vec.Mat4.Number;


/**
 * @param {!ol.vec.Mat4.Number} mat Matrix.
 * @param {number} translateX1 Translate X1.
 * @param {number} translateY1 Translate Y1.
 * @param {number} scaleX Scale X.
 * @param {number} scaleY Scale Y.
 * @param {number} rotation Rotation.
 * @param {number} translateX2 Translate X2.
 * @param {number} translateY2 Translate Y2.
 * @return {!ol.vec.Mat4.Number} Matrix.
 */
ol.vec.Mat4.makeTransform2D = function(mat, translateX1, translateY1,
    scaleX, scaleY, rotation, translateX2, translateY2) {
  ol.ext.glmatrix.mat4.identity(mat);
  if (translateX1 !== 0 || translateY1 !== 0) {
    ol.ext.glmatrix.mat4.translate(mat, mat, [translateX1, translateY1, 0]);
  }
  if (scaleX != 1 || scaleY != 1) {
    ol.ext.glmatrix.mat4.scale(mat, mat, [scaleX, scaleY, 1]);
  }
  if (rotation !== 0) {
    ol.ext.glmatrix.mat4.rotateZ(mat, mat, rotation);
  }
  if (translateX2 !== 0 || translateY2 !== 0) {
    ol.ext.glmatrix.mat4.translate(mat, mat, [translateX2, translateY2, 0]);
  }
  return mat;
};


/**
 * Returns true if mat1 and mat2 represent the same 2D transformation.
 * @param {ol.vec.Mat4.Number} mat1 Matrix 1.
 * @param {ol.vec.Mat4.Number} mat2 Matrix 2.
 * @return {boolean} Equal 2D.
 */
ol.vec.Mat4.equals2D = function(mat1, mat2) {
  return (
      ol.vec.Mat4.getElement(mat1, 0, 0) ==
      ol.vec.Mat4.getElement(mat2, 0, 0) &&
      ol.vec.Mat4.getElement(mat1, 1, 0) ==
      ol.vec.Mat4.getElement(mat2, 1, 0) &&
      ol.vec.Mat4.getElement(mat1, 0, 1) ==
      ol.vec.Mat4.getElement(mat2, 0, 1) &&
      ol.vec.Mat4.getElement(mat1, 1, 1) ==
      ol.vec.Mat4.getElement(mat2, 1, 1) &&
      ol.vec.Mat4.getElement(mat1, 0, 3) ==
      ol.vec.Mat4.getElement(mat2, 0, 3) &&
      ol.vec.Mat4.getElement(mat1, 1, 3) ==
      ol.vec.Mat4.getElement(mat2, 1, 3));
};


/**
 * Transforms the given vector with the given matrix storing the resulting,
 * transformed vector into resultVec. The input vector is multiplied against the
 * upper 2x4 matrix omitting the projective component.
 *
 * @param {ol.vec.Mat4.Number} mat The matrix supplying the transformation.
 * @param {Array.<number>} vec The 3 element vector to transform.
 * @param {Array.<number>} resultVec The 3 element vector to receive the results
 *     (may be vec).
 * @return {Array.<number>} return resultVec so that operations can be
 *     chained together.
 */
ol.vec.Mat4.multVec2 = function(mat, vec, resultVec) {
  var m00 = ol.vec.Mat4.getElement(mat, 0, 0);
  var m10 = ol.vec.Mat4.getElement(mat, 1, 0);
  var m01 = ol.vec.Mat4.getElement(mat, 0, 1);
  var m11 = ol.vec.Mat4.getElement(mat, 1, 1);
  var m03 = ol.vec.Mat4.getElement(mat, 0, 3);
  var m13 = ol.vec.Mat4.getElement(mat, 1, 3);
  var x = vec[0], y = vec[1];
  resultVec[0] = m00 * x + m01 * y + m03;
  resultVec[1] = m10 * x + m11 * y + m13;
  return resultVec;
};

/**
 * @return {!Array.<number>} newly created array.
 */
ol.vec.Mat4.create = function() {
  var out = ol.ext.glmatrix.mat4.create();
  out[0] = 0;
  out[5] = 0;
  out[10] = 0;
  out[15] = 0;
  return out;
}

/**
 * @param {Array|Float32Array} type type of array
 */
ol.vec.Mat4.setType = function(type) {
  ol.ext.glmatrix.glMatrix.setMatrixArrayType(type);
}

ol.vec.Mat4.getElement = function(mat, row, column) {
  return mat[row + column * 4];
}
