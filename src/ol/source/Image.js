/**
 * @module ol/source/Image
 */
import {ENABLE_RASTER_REPROJECTION} from '../reproj/common.js';

import ImageState from '../ImageState.js';
import {linearFindNearest} from '../array.js';
import Event from '../events/Event.js';
import {equals} from '../extent.js';
import {equivalent} from '../proj.js';
import ReprojImage from '../reproj/Image.js';
import Source from '../source/Source.js';


/**
 * @enum {string}
 */
const ImageSourceEventType = {

  /**
   * Triggered when an image starts loading.
   * @event ol/source/Image~ImageSourceEvent#imageloadstart
   * @api
   */
  IMAGELOADSTART: 'imageloadstart',

  /**
   * Triggered when an image finishes loading.
   * @event ol/source/Image~ImageSourceEvent#imageloadend
   * @api
   */
  IMAGELOADEND: 'imageloadend',

  /**
   * Triggered if image loading results in an error.
   * @event ol/source/Image~ImageSourceEvent#imageloaderror
   * @api
   */
  IMAGELOADERROR: 'imageloaderror'

};


/**
 * @classdesc
 * Events emitted by {@link module:ol/source/Image~ImageSource} instances are instances of this
 * type.
 */
class ImageSourceEvent extends Event {
  /**
   * @param {string} type Type.
   * @param {module:ol/Image} image The image.
   */
  constructor(type, image) {

    super(type);

    /**
     * The image related to the event.
     * @type {module:ol/Image}
     * @api
     */
    this.image = image;

  }

}


/**
 * @typedef {Object} Options
 * @property {module:ol/source/Source~AttributionLike} [attributions]
 * @property {module:ol/extent~Extent} [extent]
 * @property {module:ol/proj~ProjectionLike} projection
 * @property {Array.<number>} [resolutions]
 * @property {module:ol/source/State} [state]
 */


/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for sources providing a single image.
 * @api
 */
class ImageSource extends Source {
  /**
   * @param {module:ol/source/Image~Options} options Single image source options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      extent: options.extent,
      projection: options.projection,
      state: options.state
    });

    /**
     * @private
     * @type {Array.<number>}
     */
    this.resolutions_ = options.resolutions !== undefined ?
      options.resolutions : null;


    /**
     * @private
     * @type {module:ol/reproj/Image}
     */
    this.reprojectedImage_ = null;


    /**
     * @private
     * @type {number}
     */
    this.reprojectedRevision_ = 0;

    /**
     * @private
     * @type {HTMLImageElement}
     */
    this.previousImageElement = new Image();
  }

  /**
   * @return {Array.<number>} Resolutions.
   * @override
   */
  getResolutions() {
    return this.resolutions_;
  }

  /**
   * @protected
   * @param {number} resolution Resolution.
   * @return {number} Resolution.
   */
  findNearestResolution(resolution) {
    if (this.resolutions_) {
      const idx = linearFindNearest(this.resolutions_, resolution, 0);
      resolution = this.resolutions_[idx];
    }
    return resolution;
  }

  /**
   * @param {module:ol/extent~Extent} extent Extent.
   * @param {number} resolution Resolution.
   * @param {number} pixelRatio Pixel ratio.
   * @param {module:ol/proj/Projection} projection Projection.
   * @return {module:ol/ImageBase} Single image.
   */
  getImage(extent, resolution, pixelRatio, projection) {
    const sourceProjection = this.getProjection();
    if (!ENABLE_RASTER_REPROJECTION ||
        !sourceProjection ||
        !projection ||
        equivalent(sourceProjection, projection)) {
      if (sourceProjection) {
        projection = sourceProjection;
      }
      return this.getImageInternal(extent, resolution, pixelRatio, projection);
    } else {
      if (this.reprojectedImage_) {
        if (this.reprojectedRevision_ == this.getRevision() &&
            equivalent(
              this.reprojectedImage_.getProjection(), projection) &&
            this.reprojectedImage_.getResolution() == resolution &&
            equals(this.reprojectedImage_.getExtent(), extent)) {
          return this.reprojectedImage_;
        }
        this.reprojectedImage_.dispose();
        this.reprojectedImage_ = null;
      }

      this.reprojectedImage_ = new ReprojImage(
        sourceProjection, projection, extent, resolution, pixelRatio,
        function(extent, resolution, pixelRatio) {
          return this.getImageInternal(extent, resolution,
            pixelRatio, sourceProjection);
        }.bind(this));
      this.reprojectedRevision_ = this.getRevision();

      return this.reprojectedImage_;
    }
  }

  /**
   * @abstract
   * @param {module:ol/extent~Extent} extent Extent.
   * @param {number} resolution Resolution.
   * @param {number} pixelRatio Pixel ratio.
   * @param {module:ol/proj/Projection} projection Projection.
   * @return {module:ol/ImageBase} Single image.
   * @protected
   */
  getImageInternal(extent, resolution, pixelRatio, projection) {}

  /**
   * Handle image change events.
   * @param {module:ol/events/Event} event Event.
   * @protected
   */
  handleImageChange(event) {
    const image = /** @type {module:ol/Image} */ (event.target);
    switch (image.getState()) {
      case ImageState.LOADING:
        this.dispatchEvent(
          new ImageSourceEvent(ImageSourceEventType.IMAGELOADSTART,
            image));
        break;
      case ImageState.LOADED:
        this.dispatchEvent(
          new ImageSourceEvent(ImageSourceEventType.IMAGELOADEND,
            image));
        break;
      case ImageState.ERROR:
        this.dispatchEvent(
          new ImageSourceEvent(ImageSourceEventType.IMAGELOADERROR,
            image));
        break;
      default:
        // pass
    }
  }
}


/**
 * Default image load function for image sources that use module:ol/Image~Image image
 * instances.
 * @param {module:ol/Image} image Image.
 * @param {string} src Source.
 */
export function defaultImageLoadFunction(image, src) {
  this.previousImageElement.onload = () => {
    image.getImage().src = this.previousImageElement.src;
  };
  this.previousImageElement.src = src;
}


export default ImageSource;
