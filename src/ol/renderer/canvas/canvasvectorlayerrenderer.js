goog.provide('ol.renderer.canvas.VectorLayer');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.vec.Mat4');
goog.require('ol.Pixel');
goog.require('ol.TileCache');
goog.require('ol.TileCoord');
goog.require('ol.ViewHint');
goog.require('ol.extent');
goog.require('ol.filter.Extent');
goog.require('ol.filter.Geometry');
goog.require('ol.filter.Logical');
goog.require('ol.filter.LogicalOperator');
goog.require('ol.geom.GeometryType');
goog.require('ol.layer.Vector');
goog.require('ol.renderer.canvas.Layer');
goog.require('ol.renderer.canvas.VectorRenderer');
goog.require('ol.tilegrid.TileGrid');



/**
 * @constructor
 * @extends {ol.renderer.canvas.Layer}
 * @param {ol.renderer.Map} mapRenderer Map renderer.
 * @param {ol.layer.Vector} layer Vector layer.
 */
ol.renderer.canvas.VectorLayer = function(mapRenderer, layer) {

  goog.base(this, mapRenderer, layer);

  /**
   * Final canvas made available to the map renderer.
   * @private
   * @type {HTMLCanvasElement}
   */
  this.canvas_ = /** @type {HTMLCanvasElement} */
      (goog.dom.createElement(goog.dom.TagName.CANVAS));

  /**
   * @private
   * @type {CanvasRenderingContext2D}
   */
  this.context_ =  /** @type {CanvasRenderingContext2D} */
      (this.canvas_.getContext('2d'));

  /**
   * @private
   * @type {!goog.vec.Mat4.Number}
   */
  this.transform_ = goog.vec.Mat4.createNumber();

  /**
   * Interim canvas for drawing newly visible features.
   * @private
   * @type {HTMLCanvasElement}
   */
  this.sketchCanvas_ = /** @type {HTMLCanvasElement} */
      (goog.dom.createElement(goog.dom.TagName.CANVAS));

  /**
   * @private
   * @type {!goog.vec.Mat4.Number}
   */
  this.sketchTransform_ = goog.vec.Mat4.createNumber();

  /**
   * Tile cache entries are arrays. The first item in each array is the tile
   * itself, the second are the symbol sizes, and the third is the maximum
   * symbol size.
   *
   * @private
   * @type {ol.TileCache}
   */
  this.tileCache_ = new ol.TileCache(
      ol.renderer.canvas.VectorLayer.TILECACHE_SIZE);
  // TODO: this is far too coarse, we want extent of added features
  goog.events.listenOnce(layer, goog.events.EventType.CHANGE,
      this.handleLayerChange_, false, this);

  /**
   * @private
   * @type {HTMLCanvasElement}
   */
  this.tileArchetype_ = null;

  /**
   * Geometry filters in rendering order.
   * TODO: these will go away shortly (in favor of one call per symbolizer type)
   * @private
   * @type {Array.<ol.filter.Geometry>}
   */
  this.geometryFilters_ = [
    new ol.filter.Geometry(ol.geom.GeometryType.POINT),
    new ol.filter.Geometry(ol.geom.GeometryType.MULTIPOINT),
    new ol.filter.Geometry(ol.geom.GeometryType.LINESTRING),
    new ol.filter.Geometry(ol.geom.GeometryType.MULTILINESTRING),
    new ol.filter.Geometry(ol.geom.GeometryType.POLYGON),
    new ol.filter.Geometry(ol.geom.GeometryType.MULTIPOLYGON)
  ];

  /**
   * @private
   * @type {number}
   */
  this.renderedResolution_;

  /**
   * @private
   * @type {ol.Extent}
   */
  this.renderedExtent_ = null;

  /**
   * Flag to be set internally when we know something has changed that suggests
   * we need to re-render.
   * TODO: discuss setting this for all layers when something changes before
   * calling map.render().
   * @private
   * @type {boolean}
   */
  this.dirty_ = false;

  /**
   * @private
   * @type {boolean}
   */
  this.pendingCachePrune_ = false;

  /**
   * Grid used for internal generation of canvas tiles.  This is created
   * lazily so we have access to the view projection.
   *
   * @private
   * @type {ol.tilegrid.TileGrid}
   */
  this.tileGrid_ = null;

  /**
   * @private
   * @type {function()}
   */
  this.requestMapRenderFrame_ = goog.bind(function() {
    this.dirty_ = true;
    mapRenderer.getMap().requestRenderFrame();
  }, this);

};
goog.inherits(ol.renderer.canvas.VectorLayer, ol.renderer.canvas.Layer);


/**
 * Get rid cached tiles.  If the optional extent is provided, only tiles that
 * intersect that extent will be removed.
 * @param {ol.Extent=} opt_extent extent Expire tiles within this extent only.
 * @private
 */
ol.renderer.canvas.VectorLayer.prototype.expireTiles_ = function(opt_extent) {
  if (goog.isDef(opt_extent)) {
    // TODO: implement this
  }
  this.tileCache_.clear();
};


/**
 * @inheritDoc
 */
ol.renderer.canvas.VectorLayer.prototype.getImage = function() {
  return this.canvas_;
};


/**
 * @return {ol.layer.Vector} Vector layer.
 */
ol.renderer.canvas.VectorLayer.prototype.getVectorLayer = function() {
  return /** @type {ol.layer.Vector} */ (this.getLayer());
};


/**
 * @inheritDoc
 */
ol.renderer.canvas.VectorLayer.prototype.getTransform = function() {
  return this.transform_;
};


/**
 * @param {ol.Pixel} pixel Pixel coordinate relative to the map viewport.
 * @param {function(string, ol.layer.Layer)} success Callback for
 *     successful queries. The passed arguments are the resulting feature
 *     information and the layer.
 */
ol.renderer.canvas.VectorLayer.prototype.getFeatureInfoForPixel =
    function(pixel, success) {
  var callback = function(features, layer) {
    success(layer.getTransformFeatureInfo()(features), layer);
  };
  this.getFeaturesForPixel(pixel, callback);
};


/**
 * @param {ol.Pixel} pixel Pixel coordinate relative to the map viewport.
 * @param {function(Array.<ol.Feature>, ol.layer.Layer)} success Callback for
 *     successful queries. The passed arguments are the resulting features
 *     and the layer.
 */
ol.renderer.canvas.VectorLayer.prototype.getFeaturesForPixel =
    function(pixel, success) {
  var map = this.getMap();
  var result = [];

  var layer = this.getLayer();
  var location = map.getCoordinateFromPixel(pixel);
  var tileCoord = this.tileGrid_.getTileCoordForCoordAndResolution(
      location, this.getMap().getView().getView2D().getResolution());
  var key = tileCoord.toString();
  if (this.tileCache_.containsKey(key)) {
    var cachedTile = this.tileCache_.get(key);
    var symbolSizes = cachedTile[1];
    var maxSymbolSize = cachedTile[2];
    var halfMaxWidth = maxSymbolSize[0] / 2;
    var halfMaxHeight = maxSymbolSize[1] / 2;
    var locationMin = [location[0] - halfMaxWidth, location[1] - halfMaxHeight];
    var locationMax = [location[0] + halfMaxWidth, location[1] + halfMaxHeight];
    var locationBbox = ol.extent.boundingExtent([locationMin, locationMax]);
    var filter = new ol.filter.Extent(locationBbox);
    var candidates = layer.getFeatures(filter);

    var candidate, geom, type, symbolBounds, symbolSize, halfWidth, halfHeight,
        coordinates, j;
    for (var i = 0, ii = candidates.length; i < ii; ++i) {
      candidate = candidates[i];
      geom = candidate.getGeometry();
      type = geom.getType();
      if (type === ol.geom.GeometryType.POINT ||
          type === ol.geom.GeometryType.MULTIPOINT) {
        // For points, check if the pixel coordinate is inside the candidate's
        // symbol
        symbolSize = symbolSizes[goog.getUid(candidate)];
        halfWidth = symbolSize[0] / 2;
        halfHeight = symbolSize[1] / 2;
        symbolBounds = ol.extent.boundingExtent(
            [[location[0] - halfWidth, location[1] - halfHeight],
              [location[0] + halfWidth, location[1] + halfHeight]]);
        coordinates = geom.getCoordinates();
        if (!goog.isArray(coordinates[0])) {
          coordinates = [coordinates];
        }
        for (j = coordinates.length - 1; j >= 0; --j) {
          if (ol.extent.containsCoordinate(symbolBounds, coordinates[j])) {
            result.push(candidate);
            break;
          }
        }
      } else if (goog.isFunction(geom.containsCoordinate)) {
        // For polygons, check if the pixel location is inside the polygon
        if (geom.containsCoordinate(location)) {
          result.push(candidate);
        }
      } else if (goog.isFunction(geom.distanceFromCoordinate)) {
        // For lines, check if the distance to the pixel location is
        // within the rendered line width
        if (2 * geom.distanceFromCoordinate(location) <=
            symbolSizes[goog.getUid(candidate)][0]) {
          result.push(candidate);
        }
      }
    }
  }
  goog.global.setTimeout(function() { success(result, layer); }, 0);
};


/**
 * @param {goog.events.Event} event Layer change event.
 * @private
 */
ol.renderer.canvas.VectorLayer.prototype.handleLayerChange_ = function(event) {
  // TODO: get rid of this in favor of vector specific events
  this.expireTiles_();
  this.requestMapRenderFrame_();
};


/**
 * @inheritDoc
 */
ol.renderer.canvas.VectorLayer.prototype.renderFrame =
    function(frameState, layerState) {

  // TODO: consider bailing out here if rendered center and resolution
  // have not changed.  Requires that other change listeners set a dirty flag.

  var view2DState = frameState.view2DState,
      resolution = view2DState.resolution,
      extent = frameState.extent,
      layer = this.getVectorLayer(),
      tileGrid = this.tileGrid_;

  if (goog.isNull(tileGrid)) {
    // lazy tile grid creation to match the view projection
    tileGrid = ol.tilegrid.createForProjection(
        view2DState.projection,
        20, // should be no harm in going big here - ideally, it would be ∞
        [512, 512]);
    this.tileGrid_ = tileGrid;
  }

  // set up transform for the layer canvas to be drawn to the map canvas
  var z = tileGrid.getZForResolution(resolution),
      tileResolution = tileGrid.getResolution(z),
      tileRange = tileGrid.getTileRangeForExtentAndResolution(
          extent, tileResolution),
      tileRangeExtent = tileGrid.getTileRangeExtent(z, tileRange),
      tileSize = tileGrid.getTileSize(z),
      sketchOrigin = ol.extent.getTopLeft(tileRangeExtent),
      transform = this.transform_;

  goog.vec.Mat4.makeIdentity(transform);
  goog.vec.Mat4.translate(transform,
      frameState.size[0] / 2,
      frameState.size[1] / 2,
      0);
  goog.vec.Mat4.scale(transform,
      tileResolution / resolution, tileResolution / resolution, 1);
  goog.vec.Mat4.rotateZ(transform, view2DState.rotation);
  goog.vec.Mat4.translate(transform,
      (sketchOrigin[0] - view2DState.center[0]) / tileResolution,
      (view2DState.center[1] - sketchOrigin[1]) / tileResolution,
      0);

  /**
   * Fastest path out of here.  This method is called many many times while
   * there is nothing to do (e.g. while waiting for tiles from every other
   * layer to load.)  Do not put anything above here that is more expensive than
   * necessary.  And look for ways to get here faster.
   */
  if (!this.dirty_ && this.renderedResolution_ === tileResolution &&
      ol.extent.equals(this.renderedExtent_, tileRangeExtent)) {
    return;
  }

  if (goog.isNull(this.tileArchetype_)) {
    this.tileArchetype_ = /** @type {HTMLCanvasElement} */
        (goog.dom.createElement(goog.dom.TagName.CANVAS));
    this.tileArchetype_.width = tileSize[0];
    this.tileArchetype_.height = tileSize[1];
  }

  /**
   * Prepare the sketch canvas.  This covers the currently visible tile range
   * and will have rendered all newly visible features.
   */
  var sketchCanvas = this.sketchCanvas_;
  var sketchWidth = tileSize[0] * tileRange.getWidth();
  var sketchHeight = tileSize[1] * tileRange.getHeight();

  // transform for map coords to sketch canvas pixel coords
  var sketchTransform = this.sketchTransform_;
  var halfWidth = sketchWidth / 2;
  var halfHeight = sketchHeight / 2;
  goog.vec.Mat4.makeIdentity(sketchTransform);
  goog.vec.Mat4.translate(sketchTransform,
      halfWidth,
      halfHeight,
      0);
  goog.vec.Mat4.scale(sketchTransform,
      1 / tileResolution,
      -1 / tileResolution,
      1);
  goog.vec.Mat4.translate(sketchTransform,
      -(sketchOrigin[0] + halfWidth * tileResolution),
      -(sketchOrigin[1] - halfHeight * tileResolution),
      0);

  // clear/resize sketch canvas
  sketchCanvas.width = sketchWidth;
  sketchCanvas.height = sketchHeight;

  var sketchCanvasRenderer = new ol.renderer.canvas.VectorRenderer(
      sketchCanvas, sketchTransform, this.requestMapRenderFrame_);

  // clear/resize final canvas
  var finalCanvas = this.canvas_;
  finalCanvas.width = sketchWidth;
  finalCanvas.height = sketchHeight;
  var finalContext = this.context_;

  var featuresToRender = {};
  var tilesToRender = {};
  var tilesOnSketchCanvas = {};
  // TODO make gutter configurable?
  var tileGutter = 15 * tileResolution;
  var tile, tileCoord, key, tileState, x, y;
  // render features by geometry type
  var filters = this.geometryFilters_,
      numFilters = filters.length,
      deferred = false,
      dirty = false,
      i, geomFilter, tileExtent, extentFilter, type,
      groups, group, j, numGroups;
  for (x = tileRange.minX; x <= tileRange.maxX; ++x) {
    for (y = tileRange.minY; y <= tileRange.maxY; ++y) {
      tileCoord = new ol.TileCoord(z, x, y);
      key = tileCoord.toString();
      if (this.tileCache_.containsKey(key)) {
        tilesToRender[key] = tileCoord;
      } else if (!frameState.viewHints[ol.ViewHint.ANIMATING]) {
        tileExtent = tileGrid.getTileCoordExtent(tileCoord);
        tileExtent[0] -= tileGutter;
        tileExtent[1] += tileGutter;
        tileExtent[2] -= tileGutter;
        tileExtent[3] += tileGutter;
        extentFilter = new ol.filter.Extent(tileExtent);
        for (i = 0; i < numFilters; ++i) {
          geomFilter = filters[i];
          type = geomFilter.getType();
          if (!goog.isDef(featuresToRender[type])) {
            featuresToRender[type] = {};
          }
          goog.object.extend(featuresToRender[type],
              layer.getFeaturesObject(new ol.filter.Logical(
                  [geomFilter, extentFilter], ol.filter.LogicalOperator.AND)));
        }
        tilesOnSketchCanvas[key] = tileCoord;
      } else {
        dirty = true;
      }
    }
  }
  this.dirty_ = dirty;

  renderByGeometryType:
  for (type in featuresToRender) {
    groups = layer.groupFeaturesBySymbolizerLiteral(featuresToRender[type]);
    numGroups = groups.length;
    for (j = 0; j < numGroups; ++j) {
      group = groups[j];
      deferred = sketchCanvasRenderer.renderFeaturesByGeometryType(
          /** @type {ol.geom.GeometryType} */ (type),
          group[0], group[1], group[2]);
      if (deferred) {
        break renderByGeometryType;
      }
    }
  }

  if (!deferred) {
    goog.object.extend(tilesToRender, tilesOnSketchCanvas);
  }

  var symbolSizes = sketchCanvasRenderer.getSymbolSizes(),
      maxSymbolSize = sketchCanvasRenderer.getMaxSymbolSize();
  for (key in tilesToRender) {
    tileCoord = tilesToRender[key];
    if (this.tileCache_.containsKey(key)) {
      tile = /** @type {HTMLCanvasElement} */ (this.tileCache_.get(key)[0]);
    } else {
      tile = /** @type {HTMLCanvasElement} */
          (this.tileArchetype_.cloneNode(false));
      tile.getContext('2d').drawImage(sketchCanvas,
          (tileRange.minX - tileCoord.x) * tileSize[0],
          (tileCoord.y - tileRange.maxY) * tileSize[1]);
      this.tileCache_.set(key, [tile, symbolSizes, maxSymbolSize]);
    }
    finalContext.drawImage(tile,
        tileSize[0] * (tileCoord.x - tileRange.minX),
        tileSize[1] * (tileRange.maxY - tileCoord.y));
  }

  this.renderedResolution_ = tileResolution;
  this.renderedExtent_ = tileRangeExtent;
  if (!this.pendingCachePrune_) {
    this.pendingCachePrune_ = true;
    frameState.postRenderFunctions.push(goog.bind(this.pruneTileCache_, this));
  }

};


/**
 * Get rid of tiles that exceed the cache capacity.
 * TODO: add a method to the cache to handle this
 * @private
 */
ol.renderer.canvas.VectorLayer.prototype.pruneTileCache_ = function() {
  while (this.tileCache_.canExpireCache()) {
    this.tileCache_.pop();
  }
  this.pendingCachePrune_ = false;
};


/**
 * @type {number}
 */
ol.renderer.canvas.VectorLayer.TILECACHE_SIZE = 128;
