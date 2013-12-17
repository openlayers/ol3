// FIXME add rotation

goog.provide('ol.render.DragBox');

goog.require('goog.Disposable');
goog.require('goog.events');
goog.require('ol.geom.Polygon');
goog.require('ol.render.EventType');
goog.require('ol.style.Fill');
goog.require('ol.style.Style');



/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {ol.style.Style=} opt_style Style.
 */
ol.render.DragBox = function(opt_style) {

  /**
   * @private
   * @type {ol.Map}
   */
  this.map_ = null;

  /**
   * @private
   * @type {goog.events.Key|undefined}
   */
  this.postComposeListenKey_ = undefined;

  /**
   * @private
   * @type {ol.Coordinate}
   */
  this.startCoordinate_ = null;

  /**
   * @private
   * @type {ol.Coordinate}
   */
  this.endCoordinate_ = null;

  /**
   * @private
   * @type {ol.style.Style}
   */
  this.style_ = goog.isDef(opt_style) ? opt_style : new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0,0,0,0.5)'
    }),
    image: null,
    stroke: null,
    text: null,
    zIndex: 0
  });

};
goog.inherits(ol.render.DragBox, goog.Disposable);


/**
 * @inheritDoc
 */
ol.render.DragBox.prototype.disposeInternal = function() {
  this.setMap(null);
};


/**
 * @param {ol.render.Event} event Event.
 * @private
 */
ol.render.DragBox.prototype.handleMapPostCompose_ = function(event) {
  var render = event.getRender();
  var startCoordinate = this.startCoordinate_;
  var endCoordinate = this.endCoordinate_;

  var extent = event.getFrameState().extent;
  var coordinates = [
    // outer ring
    [
      [extent[0], extent[1]],
      [extent[0], extent[3]],
      [extent[2], extent[3]],
      [extent[2], extent[1]]
    ],
    // inner ring
    [
      startCoordinate,
      [startCoordinate[0], endCoordinate[1]],
      endCoordinate,
      [endCoordinate[0], startCoordinate[1]]
    ]
  ];
  var geometry = new ol.geom.Polygon(coordinates);
  var style = this.style_;
  render.setFillStrokeStyle(style.fill, style.stroke);
  render.drawPolygonGeometry(geometry, null);
};


/**
 * @private
 */
ol.render.DragBox.prototype.requestMapRenderFrame_ = function() {
  if (!goog.isNull(this.map_) &&
      !goog.isNull(this.startCoordinate_) &&
      !goog.isNull(this.endCoordinate_)) {
    this.map_.requestRenderFrame();
  }
};


/**
 * @param {ol.Map} map Map.
 */
ol.render.DragBox.prototype.setMap = function(map) {
  if (goog.isDef(this.postComposeListenKey_)) {
    goog.events.unlistenByKey(this.postComposeListenKey_);
    this.postComposeListenKey_ = undefined;
    this.map_.requestRenderFrame();
    this.map_ = null;
  }
  this.map_ = map;
  if (!goog.isNull(this.map_)) {
    this.postComposeListenKey_ = goog.events.listen(
        map, ol.render.EventType.POSTCOMPOSE, this.handleMapPostCompose_, false,
        this);
    this.requestMapRenderFrame_();
  }
};


/**
 * @param {ol.Coordinate} startCoordinate Start coordinate.
 * @param {ol.Coordinate} endCoordinate End coordinate.
 */
ol.render.DragBox.prototype.setCoordinates =
    function(startCoordinate, endCoordinate) {
  this.startCoordinate_ = startCoordinate;
  this.endCoordinate_ = endCoordinate;
  this.requestMapRenderFrame_();
};
