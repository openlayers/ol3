goog.provide('ol.Rectangle');

goog.require('goog.asserts');
goog.require('ol.Coordinate');
goog.require('ol.Size');



/**
 * @constructor
 * @param {number} minX Minimum X.
 * @param {number} minY Minimum Y.
 * @param {number} maxX Maximum X.
 * @param {number} maxY Maximum Y.
 */
ol.Rectangle = function(minX, minY, maxX, maxY) {

  /**
   * @type {number}
   */
  this.minX = minX;

  /**
   * @type {number}
   */
  this.minY = minY;

  /**
   * @type {number}
   */
  this.maxX = maxX;

  /**
   * @type {number}
   */
  this.maxY = maxY;

};


/**
 * @param {ol.Rectangle} rectangle Rectangle.
 * @return {boolean} Equals.
 */
ol.Rectangle.prototype.equals = function(rectangle) {
  return this.minX == rectangle.minX && this.minY == rectangle.minY &&
      this.maxX == rectangle.maxX && this.maxY == rectangle.maxY;
};


/**
 * @param {ol.Rectangle} rectangle Rectangle.
 */
ol.Rectangle.prototype.extend = function(rectangle) {
  if (rectangle.minX < this.minX) {
    this.minX = rectangle.minX;
  }
  if (rectangle.minY < this.minY) {
    this.minY = rectangle.minY;
  }
  if (rectangle.maxX > this.maxX) {
    this.maxX = rectangle.maxX;
  }
  if (rectangle.maxY > this.maxY) {
    this.maxY = rectangle.maxY;
  }
};


/**
 * @param {number} x X.
 * @param {number} y Y.
 */
ol.Rectangle.prototype.extendXY = function(x, y) {
  if (x < this.minX) {
    this.minX = x;
  }
  if (y < this.minY) {
    this.minY = y;
  }
  if (x > this.maxX) {
    this.maxX = x;
  }
  if (y > this.maxY) {
    this.maxY = y;
  }
};


/**
 * @return {ol.Coordinate} Center.
 */
ol.Rectangle.prototype.getCenter = function() {
  return new ol.Coordinate(
      (this.minX + this.maxX) / 2, (this.minY + this.maxY) / 2);
};


/**
 * @return {number} Height.
 */
ol.Rectangle.prototype.getHeight = function() {
  return this.maxY - this.minY;
};


/**
 * @return {ol.Size} Size.
 */
ol.Rectangle.prototype.getSize = function() {
  return new ol.Size(this.getWidth(), this.getHeight());
};


/**
 * @return {number} Width.
 */
ol.Rectangle.prototype.getWidth = function() {
  return this.maxX - this.minX;
};


/**
 * @param {ol.Rectangle} rectangle Rectangle.
 * @return {boolean} Intersects.
 */
ol.Rectangle.prototype.intersects = function(rectangle) {
  return this.minX <= rectangle.maxX &&
      this.maxX >= rectangle.minX &&
      this.minY <= rectangle.maxY &&
      this.maxY >= rectangle.minY;
};


/**
 * @return {boolean} Is empty.
 */
ol.Rectangle.prototype.isEmpty = function() {
  return this.maxX < this.minX || this.maxY < this.minY;
};


/**
 * @param {ol.Coordinate} coordinate Coordinate.
 * @return {ol.Coordinate} Coordinate.
 */
ol.Rectangle.prototype.normalize = function(coordinate) {
  return new ol.Coordinate(
      (coordinate.x - this.minX) / this.getWidth(),
      (coordinate.y - this.minY) / this.getHeight());
};


/**
 * @return {string} String.
 */
ol.Rectangle.prototype.toString = function() {
  return '(' + [this.minX, this.minY, this.maxX, this.maxY].join(', ') + ')';
};


/**
 * @param {number} value Value.
 */
ol.Rectangle.prototype.scaleFromCenter = function(value) {
  var deltaX = (this.getWidth() / 2.0) * (value - 1);
  var deltaY = (this.getHeight() / 2.0) * (value - 1);
  this.minX -= deltaX;
  this.minY -= deltaY;
  this.maxX += deltaX;
  this.maxY += deltaY;
};
