goog.provide('ol.source.RasterBase');

goog.require('ol');
goog.require('ol.events');
goog.require('ol.events.Event');
goog.require('ol.events.EventType');
goog.require('ol.extent');
goog.require('ol.ObjectEventType');
goog.require('ol.source.Source');


if (ol.ENABLE_RASTER) {

  /**
   * @classdesc
   * Abstract base class; normally only used for creating subclasses and not
   * instantiated in apps.
   * Base class for sources providing a single raster.
   *
   * @constructor
   * @abstract
   * @extends {ol.source.Source}
   * @param {ol.RasterBaseOptions} options Raster source options.
   */
  ol.source.RasterBase = function(options) {
    ol.source.Source.call(this, {
      attributions: options.attributions,
      logo: options.logo,
      projection: options.projection,
      state: options.state,
      wrapX: options.wrapX
    });

    /**
     * @private
     * @type {Array.<ol.RasterBand>}
     */
    this.bands_ = [];

    /**
     * @private
     * @type {string|undefined}
     */
    this.url_ = options.wcs ? this.createWCSGetCoverageURL(options.url,
        options.wcsParams) : options.url;

    if (options.bands) {
      for (var i = 0; i < options.bands.length; ++i) {
        this.addBand(options.bands[i]);
      }
    } else {
      this.loadBands();
    }
  };
  ol.inherits(ol.source.RasterBase, ol.source.Source);


  /**
   * @param {ol.RasterBand} band Raster band.
   */
  ol.source.RasterBase.prototype.addBand = function(band) {
    this.bands_.push(band);
    this.setupChangeEvents_(band);
    this.changed();
  };


  /**
   * @param {ol.RasterBand} band Raster band.
   * @private
   */
  ol.source.RasterBase.prototype.setupChangeEvents_ = function(band) {
    ol.events.listen(band, ol.events.EventType.CHANGE,
        this.handleRasterChange_, this);
    ol.events.listen(band, ol.ObjectEventType.PROPERTYCHANGE,
        this.handleRasterChange_, this);
  };


  /**
   * Get every raster band from this source.
   * @return {Array.<ol.RasterBand>} Raster bands.
   * @api
   */
  ol.source.RasterBase.prototype.getBands = function() {
    return this.bands_.slice();
  };


  /**
   * Get the extent of the bands in this source.
   * @return {ol.Extent|undefined} Extent.
   * @api
   */
  ol.source.RasterBase.prototype.getExtent = function() {
    var bands = this.getBands();
    var extent = ol.extent.createEmpty();
    var i, ii;
    for (i = 0, ii = bands.length; i < ii; ++i) {
      ol.extent.extend(extent, bands[i].getExtent());
    }
    return extent;
  };


  /**
   * Used by the renderer for querying a band in an extent.
   * @abstract
   * @param {ol.Extent} extent Extent.
   * @param {number} index Band index.
   * @return {ol.RasterBand} Single band.
   * @protected
   */
  ol.source.RasterBase.prototype.getRaster = function(extent, index) {};


  /**
   * @inheritDoc
   */
  ol.source.RasterBase.prototype.getResolutions = function() {
    return undefined;
  };


  /**
   * Main function of every raster source responsible for acquiring and parsing
   * raster data.
   * @abstract
   * @protected
   */
  ol.source.RasterBase.prototype.loadBands = function() {};


  /**
   * @param {string} url Base URL.
   * @param {olx.WCSParams} wcsParams WCS parameters.
   * @return {string} WCS GetCoverage URL.
   * @protected
   */
  ol.source.RasterBase.prototype.createWCSGetCoverageURL = function(url, wcsParams) {
    var getCoverageURL = url;

    return getCoverageURL;
  };


  /**
   * Returns the URL associated to this source, if any.
   * @return {string|undefined} URL.
   * @api
   */
  ol.source.RasterBase.prototype.getURL = function() {
    return this.url_;
  };


  /**
   * Handle raster change events.
   * @param {ol.events.Event} event Event.
   * @private
   */
  ol.source.RasterBase.prototype.handleRasterChange_ = function(event) {
    var band = /** @type {ol.RasterBand} */ (event.target);
    this.changed();
    this.dispatchEvent(new ol.source.RasterBase.Event(
        ol.source.RasterBase.EventType_.CHANGEBAND, band));
  };


  /**
   * @classdesc
   * Events emitted by {@link ol.source.RasterBase} instances are instances of this
   * type.
   *
   * @constructor
   * @extends {ol.events.Event}
   * @implements {oli.source.RasterBaseEvent}
   * @param {string} type Type.
   * @param {ol.RasterBand} band The raster band.
   */
  ol.source.RasterBase.Event = function(type, band) {

    ol.events.Event.call(this, type);

    /**
     * The raster band related to the event.
     * @type {ol.RasterBand}
     * @api
     */
    this.band = band;

  };
  ol.inherits(ol.source.RasterBase.Event, ol.events.Event);


  /**
   * @enum {string}
   * @private
   */
  ol.source.RasterBase.EventType_ = {

    /**
     * Triggered when a raster band is changed.
     * @event ol.source.RasterBase.Event#changeband
     * @api
     */
    CHANGEBAND: 'changeband'

  };

}
