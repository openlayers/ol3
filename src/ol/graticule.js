goog.provide('ol.Graticule');

goog.require('ol');
goog.require('ol.extent');
goog.require('ol.geom.GeometryLayout');
goog.require('ol.geom.LineString');
goog.require('ol.geom.Point');
goog.require('ol.geom.flat.geodesic');
goog.require('ol.math');
goog.require('ol.proj');
goog.require('ol.render.EventType');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Text');


/**
 * Render a grid for a coordinate system on a map.
 * @constructor
 * @param {olx.GraticuleOptions=} opt_options Options.
 * @api
 */
ol.Graticule = function(opt_options) {

  var options = opt_options || {};

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = null;

  /**
   * @type {ol.proj.Projection}
   * @private
   */
  this.projection_ = null;

  /**
   * @type {number}
   * @private
   */
  this.maxLat_ = Infinity;

  /**
   * @type {number}
   * @private
   */
  this.maxLon_ = Infinity;

  /**
   * @type {number}
   * @private
   */
  this.minLat_ = -Infinity;

  /**
   * @type {number}
   * @private
   */
  this.minLon_ = -Infinity;

  /**
   * @type {number}
   * @private
   */
  this.maxLatP_ = Infinity;

  /**
   * @type {number}
   * @private
   */
  this.maxLonP_ = Infinity;

  /**
   * @type {number}
   * @private
   */
  this.minLatP_ = -Infinity;

  /**
   * @type {number}
   * @private
   */
  this.minLonP_ = -Infinity;

  /**
   * @type {number}
   * @private
   */
  this.targetSize_ = options.targetSize !== undefined ?
      options.targetSize : 100;

  /**
   * @type {number}
   * @private
   */
  this.maxLines_ = options.maxLines !== undefined ? options.maxLines : 100;
  ol.DEBUG && console.assert(this.maxLines_ > 0,
      'this.maxLines_ should be more than 0');

  /**
   * @type {Array.<ol.geom.LineString>}
   * @private
   */
  this.meridians_ = [];

  /**
   * @type {Array.<Object>}
   * @private
   */
  this.meridiansLabels_ = [];

  /**
   * @type {Array.<ol.geom.LineString>}
   * @private
   */
  this.parallels_ = [];

  /**
   * @type {Array.<Object>}
   * @private
   */
  this.parallelsLabels_ = [];
	  
  /**
   * @type {ol.TransformFunction|undefined}
   * @private
   */
  this.fromLonLatTransform_ = undefined;

  /**
   * @type {ol.TransformFunction|undefined}
   * @private
   */
  this.toLonLatTransform_ = undefined;

  /**
   * @type {ol.Coordinate}
   * @private
   */
  this.projectionCenterLonLat_ = null;

  /**
   * @type {boolean}
   * @private
   */
  this.showLabels_ = options.showLabels !== undefined ?
      options.showLabels : false;

  /**
   * @type {?Function}
   * @private
   */
  this.lonLabelFormatter_ = options.lonLabelFormatter !== undefined ?
      options.lonLabelFormatter : null;

  /**
   * @type {number} between 0.0 and 1.0
   * @private
   */
  this.lonLabelPosition_ = options.lonLabelPosition !== undefined ?
      ol.math.clamp(options.lonLabelPosition, 0.0, 1.0) : 0.0;

  /**
   * @type {?Function}
   * @private
   */
  this.latLabelFormatter_ = options.latLabelFormatter !== undefined ?
      options.latLabelFormatter : null;

  /**
   * @type {number} between 0.0 and 1.0
   * @private
   */
  this.latLabelPosition_ = options.latLabelPosition !== undefined ?
      ol.math.clamp(options.latLabelPosition, 0.0, 1.0) : 1.0;
      
  /**
   * @type {number} between 0.0 and 1.0
   * @private
   */
  this.latLabelPositionUser_ = this.latLabelPosition_;
  
  /**
   * @type {ol.style.Stroke}
   * @private
   */
  this.defaultStrokeStyle_ = new ol.style.Stroke({
	color: 'rgba(0,0,0,0.2)'
  });
  
  /**
   * @type {ol.style.Stroke}
   * @private
   */
  this.strokeStyle_ = options.strokeStyle !== undefined ?
      options.strokeStyle : this.defaultStrokeStyle_;

  /**
   * @type {ol.style.Text}
   * @private
   */
  this.defaultLatLabelStyle_ = new ol.style.Text({
    font: '12px Calibri,sans-serif',
	textBaseline: 'middle',
    fill: new ol.style.Fill({
      color: 'rgba(0,0,0,1)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(255,255,255,1)',
      width: 3
    })
  });

  /**
   * @type {ol.style.Text}
   * @private
   */  
  this.latLabelStyle_ = options.latLabelStyle !== undefined ?
      options.latLabelStyle : this.defaultLatLabelStyle_;

	  
  /**
   * @type {ol.style.Text}
   * @private
   */
  this.defaultLonLabelStyle_ = new ol.style.Text({
    font: '12px Calibri,sans-serif',
    fill: new ol.style.Fill({
      color: 'rgba(0,0,0,1)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(255,255,255,1)',
      width: 3
    })
  });	  
	  
  /**
   * @type {ol.style.Text}
   * @private
   */  
  this.lonLabelStyle_ = options.lonLabelStyle !== undefined ?
      options.lonLabelStyle : this.defaultLonLabelStyle_;	  

  this.setMap(options.map !== undefined ? options.map : null);
};

/**
 * TODO can be configurable
 * @type {Array.<number>}
 * @private
 */
ol.Graticule.intervals_ = [90, 45, 30, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05,
  0.01, 0.005, 0.002, 0.001];


/**
 * @param {number} lon Longitude.
 * @param {number} minLat Minimal latitude.
 * @param {number} maxLat Maximal latitude.
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @return {number} Index.
 * @private
 */
ol.Graticule.prototype.addMeridian_ = function(lon, minLat, maxLat, squaredTolerance, extent, index) {
  var lineString = this.getMeridian_(lon, minLat, maxLat,
      squaredTolerance, index);
  if (ol.extent.intersects(lineString.getExtent(), extent)) {
    this.meridians_[index++] = lineString;
  }
  return index;
};

/**
 * @param {ol.style.Text} style
 * @return {ol.style.Text} cloned style
 * @private
 */  
ol.Graticule.prototype.configureTextStyle_ = function(style){
	var s = new ol.style.Text();
	s.setFill(style.getFill());
	s.setFont(style.getFont());
	s.setOffsetX(style.getOffsetX());
	s.setOffsetY(style.getOffsetY());
	s.setRotation(style.getRotation());
	s.setScale(style.getScale());
	s.setStroke(style.getStroke());
	s.setText(style.getText());
	s.setTextAlign(style.getTextAlign());
	s.setTextBaseline(style.getTextBaseline());
	return s;
}

/**
 *
 * @param {number} lon Longitude
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @return {number} Index.
 * @private
 */
ol.Graticule.prototype.addMeridianLabel_ =
    function(lon, squaredTolerance, extent, index) {
  var textPoint = this.getMeridianPoint_(lon, squaredTolerance, extent, index);
  var style = this.configureTextStyle_(this.lonLabelStyle_);
  style.setText(this.lonLabelFormatter_ ?
      this.lonLabelFormatter_(lon) : lon.toString());
  style.setTextBaseline('bottom');
  style.setTextAlign('center');
  this.meridiansLabels_[index++] = { geom: textPoint, style: style };
  return index;
};


/**
 *
 * @param {number} lon Longitude
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @private
 */
ol.Graticule.prototype.checkLatLabelPosition_ =
	function(lon, squaredTolerance, extent, index) {
  var textPoint = this.getMeridianPoint_(lon, squaredTolerance, extent, index);
  var textLon = textPoint.getCoordinates()[0];
  if(extent[2] > textLon) {	
    if(textLon < 0) textLon = Math.abs(textLon);
	this.latLabelPosition_ = Math.abs(extent[0] - textLon)
		/ Math.abs(extent[0] - extent[2]) - (1 - this.latLabelPositionUser_);
  }else{
	this.latLabelPosition_ = this.latLabelPositionUser_;
  }
};
	
/**
 *
 * @param {number} lon Longitude
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @return {ol.geom.Point}
 * @private
 */
ol.Graticule.prototype.getMeridianPoint_ =
    function(lon, squaredTolerance, extent, index) {
  goog.asserts.assert(lon >= this.minLon_,
      'lon should be larger than or equal to this.minLon_');
  goog.asserts.assert(lon <= this.maxLon_,
      'lon should be smaller than or equal to this.maxLon_');
  var flatCoordinates = ol.geom.flat.geodesic.meridian(lon,
      this.minLat_, this.maxLat_, this.projection_, squaredTolerance);
  goog.asserts.assert(flatCoordinates.length > 0,
      'flatCoordinates cannot be empty');
  var lat = extent[1] +
      Math.abs(extent[1] - extent[3]) * this.lonLabelPosition_;
  var coordinate = [flatCoordinates[0], lat];
  var point = this.meridiansLabels_[index] !== undefined ?
      this.meridiansLabels_[index].geom : new ol.geom.Point(null);
  point.setCoordinates(coordinate);
  return point;
};


/**
 * @param {number} lat Latitude.
 * @param {number} minLon Minimal longitude.
 * @param {number} maxLon Maximal longitude.
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @return {number} Index.
 * @private
 */
ol.Graticule.prototype.addParallel_ = function(lat, minLon, maxLon, squaredTolerance, extent, index) {
  var lineString = this.getParallel_(lat, minLon, maxLon, squaredTolerance,
      index);
  if (ol.extent.intersects(lineString.getExtent(), extent)) {
    this.parallels_[index++] = lineString;
  }
  return index;
};


/**
 * @param {number} lat Latitude
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @return {number} Index.
 * @private
 */
ol.Graticule.prototype.addParallelLabel_ =
    function(lat, squaredTolerance, extent, index) {
  var textPoint = this.getParallelPoint_(
      lat, squaredTolerance, extent, index);
  var style = this.configureTextStyle_(this.latLabelStyle_);
  style.setText(this.latLabelFormatter_ ?
      this.latLabelFormatter_(lat) : lat.toString());
  style.setTextAlign('right');
  this.parallelsLabels_[index++] = { geom: textPoint, style: style };
  return index;
};


/**
 * @param {number} lat Latitude
 * @param {number} squaredTolerance Squared tolerance.
 * @param {ol.Extent} extent Extent.
 * @param {number} index Index.
 * @return {ol.geom.Point}
 * @private
 */
ol.Graticule.prototype.getParallelPoint_ =
    function(lat, squaredTolerance, extent, index) {
  goog.asserts.assert(lat >= this.minLat_,
      'lat should be larger than or equal to this.minLat_');
  goog.asserts.assert(lat <= this.maxLat_,
      'lat should be smaller than or equal to this.maxLat_');
  var flatCoordinates = ol.geom.flat.geodesic.parallel(lat,
      this.minLon_, this.maxLon_, this.projection_, squaredTolerance);
  goog.asserts.assert(flatCoordinates.length > 0,
      'flatCoordinates cannot be empty');
  var lon = extent[0] +
      Math.abs(extent[0] - extent[2]) * this.latLabelPosition_;
  var coordinate = [lon, flatCoordinates[1]];
  var point = this.parallelsLabels_[index] !== undefined ?
      this.parallelsLabels_[index].geom : new ol.geom.Point(null);
  point.setCoordinates(coordinate);
  return point;
};


/**
 * @param {ol.Extent} extent Extent.
 * @param {ol.Coordinate} center Center.
 * @param {number} resolution Resolution.
 * @param {number} squaredTolerance Squared tolerance.
 * @private
 */
ol.Graticule.prototype.createGraticule_ = function(extent, center, resolution, squaredTolerance) {

  var interval = this.getInterval_(resolution);
  if (interval == -1) {
    this.meridians_.length = this.parallels_.length = 0;
    this.meridiansLabels_.length = this.parallelsLabels_.length = 0;
    return;
  }

  var centerLonLat = this.toLonLatTransform_(center);
  var centerLon = centerLonLat[0];
  var centerLat = centerLonLat[1];
  var maxLines = this.maxLines_;
  var cnt, idx, lat, lon, idxLabels = 0;

  var validExtent = [
    Math.max(extent[0], this.minLonP_),
    Math.max(extent[1], this.minLatP_),
    Math.min(extent[2], this.maxLonP_),
    Math.min(extent[3], this.maxLatP_)
  ];

  validExtent = ol.proj.transformExtent(validExtent, this.projection_,
      'EPSG:4326');
  var maxLat = validExtent[3];
  var maxLon = validExtent[2];
  var minLat = validExtent[1];
  var minLon = validExtent[0];

  // Create meridians

  centerLon = Math.floor(centerLon / interval) * interval;
  lon = ol.math.clamp(centerLon, this.minLon_, this.maxLon_);

  idx = this.addMeridian_(lon, minLat, maxLat, squaredTolerance, extent, 0);
  if (this.showLabels_) {
    idxLabels = this.addMeridianLabel_(lon, squaredTolerance, extent, 0);
  }

  cnt = 0;
  while (lon != this.minLon_ && cnt++ < maxLines) {
    lon = Math.max(lon - interval, this.minLon_);
    idx = this.addMeridian_(lon, minLat, maxLat, squaredTolerance, extent, idx);
    if (this.showLabels_) {
	  this.checkLatLabelPosition_(lon, squaredTolerance, extent, idxLabels);
      idxLabels = this.addMeridianLabel_(
          lon, squaredTolerance, extent, idxLabels);
    }
  }

  lon = ol.math.clamp(centerLon, this.minLon_, this.maxLon_);

  cnt = 0;
  while (lon != this.maxLon_ && cnt++ < maxLines) {
    lon = Math.min(lon + interval, this.maxLon_);
    idx = this.addMeridian_(lon, minLat, maxLat, squaredTolerance, extent, idx);
    if (this.showLabels_) {
	  this.checkLatLabelPosition_(lon, squaredTolerance, extent, idxLabels);
      idxLabels = this.addMeridianLabel_(
          lon, squaredTolerance, extent, idxLabels);
    }
  }

  this.meridians_.length = idx;
  this.meridiansLabels_.length = idxLabels;

  // Create parallels

  centerLat = Math.floor(centerLat / interval) * interval;
  lat = ol.math.clamp(centerLat, this.minLat_, this.maxLat_);
  idxLabels = 0;

  idx = this.addParallel_(lat, minLon, maxLon, squaredTolerance, extent, 0);
  if (this.showLabels_) {
    idxLabels = this.addParallelLabel_(lat, squaredTolerance, extent, 0);
  }

  cnt = 0;
  while (lat != this.minLat_ && cnt++ < maxLines) {
    lat = Math.max(lat - interval, this.minLat_);
    idx = this.addParallel_(lat, minLon, maxLon, squaredTolerance, extent, idx);
    if (this.showLabels_) {
      idxLabels = this.addParallelLabel_(
          lat, squaredTolerance, extent, idxLabels);
    }
  }

  lat = ol.math.clamp(centerLat, this.minLat_, this.maxLat_);

  cnt = 0;
  while (lat != this.maxLat_ && cnt++ < maxLines) {
    lat = Math.min(lat + interval, this.maxLat_);
    idx = this.addParallel_(lat, minLon, maxLon, squaredTolerance, extent, idx);
    if (this.showLabels_) {
      idxLabels = this.addParallelLabel_(
          lat, squaredTolerance, extent, idxLabels);
    }
  }

  this.parallels_.length = idx;
  this.parallelsLabels_.length = idxLabels;

};


/**
 * @param {number} resolution Resolution.
 * @return {number} The interval in degrees.
 * @private
 */
ol.Graticule.prototype.getInterval_ = function(resolution) {
  var centerLon = this.projectionCenterLonLat_[0];
  var centerLat = this.projectionCenterLonLat_[1];
  var interval = -1;
  var i, ii, delta, dist;
  var target = Math.pow(this.targetSize_ * resolution, 2);
  /** @type {Array.<number>} **/
  var p1 = [];
  /** @type {Array.<number>} **/
  var p2 = [];
  for (i = 0, ii = ol.Graticule.intervals_.length; i < ii; ++i) {
    delta = ol.Graticule.intervals_[i] / 2;
    p1[0] = centerLon - delta;
    p1[1] = centerLat - delta;
    p2[0] = centerLon + delta;
    p2[1] = centerLat + delta;
    this.fromLonLatTransform_(p1, p1);
    this.fromLonLatTransform_(p2, p2);
    dist = Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2);
    if (dist <= target) {
      break;
    }
    interval = ol.Graticule.intervals_[i];
  }
  return interval;
};


/**
 * Get the map associated with this graticule.
 * @return {ol.Map} The map.
 * @api
 */
ol.Graticule.prototype.getMap = function() {
  return this.map_;
};


/**
 * @param {number} lon Longitude.
 * @param {number} minLat Minimal latitude.
 * @param {number} maxLat Maximal latitude.
 * @param {number} squaredTolerance Squared tolerance.
 * @return {ol.geom.LineString} The meridian line string.
 * @param {number} index Index.
 * @private
 */
ol.Graticule.prototype.getMeridian_ = function(lon, minLat, maxLat,
                                               squaredTolerance, index) {
  ol.DEBUG && console.assert(lon >= this.minLon_,
      'lon should be larger than or equal to this.minLon_');
  ol.DEBUG && console.assert(lon <= this.maxLon_,
      'lon should be smaller than or equal to this.maxLon_');
  var flatCoordinates = ol.geom.flat.geodesic.meridian(lon,
      minLat, maxLat, this.projection_, squaredTolerance);
  ol.DEBUG && console.assert(flatCoordinates.length > 0,
      'flatCoordinates cannot be empty');
  var lineString = this.meridians_[index] !== undefined ?
      this.meridians_[index] : new ol.geom.LineString(null);
  lineString.setFlatCoordinates(ol.geom.GeometryLayout.XY, flatCoordinates);
  return lineString;
};


/**
 * Get the list of meridians.  Meridians are lines of equal longitude.
 * @return {Array.<ol.geom.LineString>} The meridians.
 * @api
 */
ol.Graticule.prototype.getMeridians = function() {
  return this.meridians_;
};


/**
 * @param {number} lat Latitude.
 * @param {number} minLon Minimal longitude.
 * @param {number} maxLon Maximal longitude.
 * @param {number} squaredTolerance Squared tolerance.
 * @return {ol.geom.LineString} The parallel line string.
 * @param {number} index Index.
 * @private
 */
ol.Graticule.prototype.getParallel_ = function(lat, minLon, maxLon,
                                               squaredTolerance, index) {
  ol.DEBUG && console.assert(lat >= this.minLat_,
      'lat should be larger than or equal to this.minLat_');
  ol.DEBUG && console.assert(lat <= this.maxLat_,
      'lat should be smaller than or equal to this.maxLat_');
  var flatCoordinates = ol.geom.flat.geodesic.parallel(lat,
      this.minLon_, this.maxLon_, this.projection_, squaredTolerance);
  ol.DEBUG && console.assert(flatCoordinates.length > 0,
      'flatCoordinates cannot be empty');
  var lineString = this.parallels_[index] !== undefined ?
      this.parallels_[index] : new ol.geom.LineString(null);
  lineString.setFlatCoordinates(ol.geom.GeometryLayout.XY, flatCoordinates);
  return lineString;
};


/**
 * Get the list of parallels.  Pallels are lines of equal latitude.
 * @return {Array.<ol.geom.LineString>} The parallels.
 * @api
 */
ol.Graticule.prototype.getParallels = function() {
  return this.parallels_;
};


/**
 * @param {ol.render.Event} e Event.
 * @private
 */
ol.Graticule.prototype.handlePostCompose_ = function(e) {
  var vectorContext = e.vectorContext;
  var frameState = e.frameState;
  var extent = frameState.extent;
  var viewState = frameState.viewState;
  var center = viewState.center;
  var projection = viewState.projection;
  var resolution = viewState.resolution;
  var pixelRatio = frameState.pixelRatio;
  var squaredTolerance =
      resolution * resolution / (4 * pixelRatio * pixelRatio);

  var updateProjectionInfo = !this.projection_ ||
      !ol.proj.equivalent(this.projection_, projection);

  if (updateProjectionInfo) {
    this.updateProjectionInfo_(projection);
  }

  //Fix the extent if wrapped.
  //(note: this is the same extent as vectorContext.extent_)
  var offsetX = 0;
  if (projection.canWrapX()) {
    var projectionExtent = projection.getExtent();
    var worldWidth = ol.extent.getWidth(projectionExtent);
    var x = frameState.focus[0];
    if (x < projectionExtent[0] || x > projectionExtent[2]) {
      var worldsAway = Math.ceil((projectionExtent[0] - x) / worldWidth);
      offsetX = worldWidth * worldsAway;
      extent = [
        extent[0] + offsetX, extent[1],
        extent[2] + offsetX, extent[3]
      ];
    }
  }

  this.createGraticule_(extent, center, resolution, squaredTolerance);

  // Draw the lines
  vectorContext.setFillStrokeStyle(null, this.strokeStyle_);
  var i, l, line;
  for (i = 0, l = this.meridians_.length; i < l; ++i) {
    line = this.meridians_[i];
    vectorContext.drawLineString(line, null);
  }
  for (i = 0, l = this.parallels_.length; i < l; ++i) {
    line = this.parallels_[i];
    vectorContext.drawLineString(line, null);
  }
  if (this.showLabels_) {
    var point, style;
    for (i = 0, l = this.meridiansLabels_.length; i < l; ++i) {
      point = this.meridiansLabels_[i].geom;
      style = this.meridiansLabels_[i].style;
      vectorContext.setTextStyle(style);
      vectorContext.drawPointGeometry(point, null);
    }
    for (i = 0, l = this.parallelsLabels_.length; i < l; ++i) {
      point = this.parallelsLabels_[i].geom;
      style = this.parallelsLabels_[i].style;
      vectorContext.setTextStyle(style);
      vectorContext.drawPointGeometry(point, null);
    }
  }
};


/**
 * @param {ol.proj.Projection} projection Projection.
 * @private
 */
ol.Graticule.prototype.updateProjectionInfo_ = function(projection) {
  var epsg4326Projection = ol.proj.get('EPSG:4326');

  var extent = projection.getExtent();
  var worldExtent = projection.getWorldExtent();
  var worldExtentP = ol.proj.transformExtent(worldExtent,
      epsg4326Projection, projection);

  var maxLat = worldExtent[3];
  var maxLon = worldExtent[2];
  var minLat = worldExtent[1];
  var minLon = worldExtent[0];

  var maxLatP = worldExtentP[3];
  var maxLonP = worldExtentP[2];
  var minLatP = worldExtentP[1];
  var minLonP = worldExtentP[0];

  ol.DEBUG && console.assert(maxLat !== undefined, 'maxLat should be defined');
  ol.DEBUG && console.assert(maxLon !== undefined, 'maxLon should be defined');
  ol.DEBUG && console.assert(minLat !== undefined, 'minLat should be defined');
  ol.DEBUG && console.assert(minLon !== undefined, 'minLon should be defined');

  ol.DEBUG && console.assert(maxLatP !== undefined,
      'projected maxLat should be defined');
  ol.DEBUG && console.assert(maxLonP !== undefined,
      'projected maxLon should be defined');
  ol.DEBUG && console.assert(minLatP !== undefined,
      'projected minLat should be defined');
  ol.DEBUG && console.assert(minLonP !== undefined,
      'projected minLon should be defined');

  this.maxLat_ = maxLat;
  this.maxLon_ = maxLon;
  this.minLat_ = minLat;
  this.minLon_ = minLon;

  this.maxLatP_ = maxLatP;
  this.maxLonP_ = maxLonP;
  this.minLatP_ = minLatP;
  this.minLonP_ = minLonP;


  this.fromLonLatTransform_ = ol.proj.getTransform(
      epsg4326Projection, projection);

  this.toLonLatTransform_ = ol.proj.getTransform(
      projection, epsg4326Projection);

  this.projectionCenterLonLat_ = this.toLonLatTransform_(
      ol.extent.getCenter(extent));

  this.projection_ = projection;
};


/**
 * Set the map for this graticule.  The graticule will be rendered on the
 * provided map.
 * @param {ol.Map} map Map.
 * @api
 */
ol.Graticule.prototype.setMap = function(map) {
  if (this.map_) {
    this.map_.un(ol.render.EventType.POSTCOMPOSE,
        this.handlePostCompose_, this);
    this.map_.render();
  }
  if (map) {
    map.on(ol.render.EventType.POSTCOMPOSE,
        this.handlePostCompose_, this);
    map.render();
  }
  this.map_ = map;
};
