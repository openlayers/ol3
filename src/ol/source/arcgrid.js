goog.provide('ol.source.ArcGrid');

goog.require('ol');
goog.require('ol.asserts');
goog.require('ol.extent');
goog.require('ol.RasterBand');
goog.require('ol.RasterType');
goog.require('ol.source.RasterBase');
goog.require('ol.source.State');


if (ol.ENABLE_RASTER) {

  /**
  * @classdesc
  * Layer source for raster data in ArcInfo ASCII Grid format.
  *
  * @constructor
  * @extends {ol.source.RasterBase}
  * @fires ol.source.RasterBase.Event
  * @param {olx.source.ArcGridOptions=} options Options.
  * @api
   */
  ol.source.ArcGrid = function(options) {

    ol.asserts.assert(options.raster || options.url, 63);

    /**
     * @private
     * @type {string|undefined}
     */
    this.raster_ = options.raster;

    /**
     * @private
     * @type {string|undefined}
     */
    this.url_ = options.url;

    /**
     * @private
     * @type {ol.RasterType}
     */
    this.type_ = options.type || ol.RasterType.FLOAT32;

    /**
     * @private
     * @type{function(number):number|undefined}
     */
    this.convert_ = options.convert;

    ol.source.RasterBase.call(this, {
      attributions: options.attributions,
      logo: options.logo,
      projection: options.projection,
      state: ol.source.State.READY,
      wrapX: options.wrapX
    });
  };
  ol.inherits(ol.source.ArcGrid, ol.source.RasterBase);


  /**
   * @inheritDoc
   */
  ol.source.ArcGrid.prototype.getRaster = function(extent, index) {
    var rasterExtent = this.getExtent();
    if (rasterExtent && ol.extent.intersects(extent, rasterExtent)) {
      return this.getBands()[0];
    }
    return null;
  };


  /**
   * @inheritDoc
   */
  ol.source.ArcGrid.prototype.loadBands = function() {
    if (this.url_) {
      this.loadRasterXhr_();
    } else {
      this.parseRaster_();
    }
  };


  /**
   * @private
   */
  ol.source.ArcGrid.prototype.loadRasterXhr_ = function() {
    this.setState(ol.source.State.LOADING);

    var xhr = new XMLHttpRequest();
    var url = /** @type {string} */ (this.url_);
    xhr.open('GET', url, true);
    /**
     * @param {Event} event Event.
     * @private
     */
    xhr.onload = function(event) {
      // status will be 0 for file:// urls
      if (!xhr.status || xhr.status >= 200 && xhr.status < 300) {
        var source = xhr.responseText;
        if (source) {
          this.raster_ = source;
          this.parseRaster_();
        } else {
          this.setState(ol.source.State.ERROR);
        }
      } else {
        this.setState(ol.source.State.ERROR);
      }
    }.bind(this);
    /**
     * @private
     */
    xhr.onerror = function() {
      this.setState(ol.source.State.ERROR);
    }.bind(this);
    xhr.send();
  };


  /**
   * @private
   */
  ol.source.ArcGrid.prototype.parseRaster_ = function() {
    if (this.getState() !== ol.source.State.LOADING) {
      this.setState(ol.source.State.LOADING);
    }

    var source = this.raster_.split('\n');
    var i, ii;

    // Parse the header and check for its validity.
    var header = {};
    for (i = 0; i < 6; ++i) {
      var headerElem = source[i].split(' ');
      var headerName = headerElem[0].toUpperCase();
      header[headerName] = parseFloat(headerElem[1]);
    }
    if (!('NCOLS' in header && 'NROWS' in header && 'XLLCORNER' in header &&
        'YLLCORNER' in header && 'CELLSIZE' in header &&
        'NODATA_VALUE' in header && Object.keys(header).length === 6)) {
      this.setState(ol.source.State.ERROR);
      return;
    }

    // Parse the raster.
    var raster = [];
    for (i = 6, ii = source.length; i < ii; ++i) {
      raster = raster.concat(source[i].split(' ').map(parseFloat));
    }

    // Calculate and set the layer's extent.
    var extent = [header['XLLCORNER'], header['YLLCORNER']];
    extent.push(header['XLLCORNER'] + header['CELLSIZE'] * header['NCOLS']);
    extent.push(header['YLLCORNER'] + header['CELLSIZE'] * header['NROWS']);
    this.setExtent(extent);

    // Create a band from the parsed data.
    var band = new ol.RasterBand({
      convert: this.convert_,
      nullvalue: header['NODATA_VALUE'],
      raster: raster,
      resolution: [header['CELLSIZE'], header['CELLSIZE']],
      stride: header['NCOLS'],
      type: this.type_
    });
    this.addBand(band);

    this.raster_ = undefined;
  };

}
