goog.provide('ol.style.Icon');
goog.provide('ol.style.IconLiteral');
goog.provide('ol.style.IconType');

goog.require('goog.asserts');
goog.require('ol.expr');
goog.require('ol.expr.Expression');
goog.require('ol.expr.Literal');
goog.require('ol.style.Point');
goog.require('ol.style.PointLiteral');


/**
 * @typedef {{url: (string),
 *            width: (number|undefined),
 *            height: (number|undefined),
 *            opacity: (number),
 *            rotation: (number)}}
 */
ol.style.IconLiteralOptions;



/**
 * @constructor
 * @extends {ol.style.PointLiteral}
 * @param {ol.style.IconLiteralOptions} options Icon literal options.
 */
ol.style.IconLiteral = function(options) {

  /** @type {string} */
  this.url = options.url;

  /** @type {number|undefined} */
  this.width = options.width;

  /** @type {number|undefined} */
  this.height = options.height;

  /** @type {number} */
  this.opacity = options.opacity;

  /** @type {number} */
  this.rotation = options.rotation;

};
goog.inherits(ol.style.IconLiteral, ol.style.PointLiteral);


/**
 * @inheritDoc
 */
ol.style.IconLiteral.prototype.equals = function(iconLiteral) {
  return this.url == iconLiteral.type &&
      this.width == iconLiteral.width &&
      this.height == iconLiteral.height &&
      this.opacity == iconLiteral.opacity &&
      this.rotation == iconLiteral.rotation;
};



/**
 * @constructor
 * @extends {ol.style.Point}
 * @param {ol.style.IconOptions} options Icon options.
 */
ol.style.Icon = function(options) {

  goog.asserts.assert(options.url, 'url must be set');

  /**
   * @type {ol.expr.Expression}
   * @private
   */
  this.url_ = (options.url instanceof ol.expr.Expression) ?
          options.url : new ol.expr.Literal(options.url);

  /**
   * @type {ol.expr.Expression}
   * @private
   */
  this.width_ = !goog.isDef(options.width) ?
      null :
      (options.width instanceof ol.expr.Expression) ?
          options.width : new ol.expr.Literal(options.width);

  /**
   * @type {ol.expr.Expression}
   * @private
   */
  this.height_ = !goog.isDef(options.height) ?
      null :
      (options.height instanceof ol.expr.Expression) ?
          options.height : new ol.expr.Literal(options.height);

  /**
   * @type {ol.expr.Expression}
   * @private
   */
  this.opacity_ = !goog.isDef(options.opacity) ?
      new ol.expr.Literal(ol.style.IconDefaults.opacity) :
      (options.opacity instanceof ol.expr.Expression) ?
          options.opacity : new ol.expr.Literal(options.opacity);

  /**
   * @type {ol.expr.Expression}
   * @private
   */
  this.rotation_ = !goog.isDef(options.rotation) ?
      new ol.expr.Literal(ol.style.IconDefaults.rotation) :
      (options.rotation instanceof ol.expr.Expression) ?
          options.rotation : new ol.expr.Literal(options.rotation);

};


/**
 * @inheritDoc
 * @return {ol.style.IconLiteral} Literal shape symbolizer.
 */
ol.style.Icon.prototype.createLiteral = function(opt_feature) {

  var url = ol.expr.evaluateFeature(this.url_, opt_feature);
  goog.asserts.assertString(url, 'url must be a string');
  goog.asserts.assert(url != '#', 'url must not be "#"');

  var width;
  if (!goog.isNull(this.width_)) {
    width = ol.expr.evaluateFeature(this.width_, opt_feature);
    goog.asserts.assertNumber(width, 'width must be a number');
  }

  var height;
  if (!goog.isNull(this.height_)) {
    height = ol.expr.evaluateFeature(this.height_, opt_feature);
    goog.asserts.assertNumber(height, 'height must be a number');
  }

  var opacity = ol.expr.evaluateFeature(this.opacity_, opt_feature);
  goog.asserts.assertNumber(opacity, 'opacity must be a number');

  var rotation = ol.expr.evaluateFeature(this.rotation_, opt_feature);
  goog.asserts.assertNumber(rotation, 'rotation must be a number');

  return new ol.style.IconLiteral({
    url: url,
    width: width,
    height: height,
    opacity: opacity,
    rotation: rotation
  });
};


/**
 * @type {ol.style.IconLiteral}
 */
ol.style.IconDefaults = new ol.style.IconLiteral({
  url: '#',
  opacity: 1,
  rotation: 0
});
