/**
 * @module ol/Image
 */
import ImageBase from './ImageBase.js';
import ImageState from './ImageState.js';
import {listenOnce, unlistenByKey} from './events.js';
import EventType from './events/EventType.js';
import EventTarget from './events/Target.js';
import {getHeight} from './extent.js';
import {VOID} from './functions.js';


/**
 * A function that takes an {@link module:ol/Image~Image} for the image and a
 * `{string}` for the src as arguments. It is supposed to make it so the
 * underlying image {@link module:ol/Image~Image#getImage} is assigned the
 * content specified by the src. If not specified, the default is
 *
 *     function(image, src) {
 *       image.getImage().src = src;
 *     }
 *
 * Providing a custom `imageLoadFunction` can be useful to load images with
 * post requests or - in general - through XHR requests, where the src of the
 * image element would be set to a data URI when the content is loaded.
 *
 * @typedef {function(ImageWrapper, string): void} LoadFunction
 * @api
 */


class ImageWrapper extends ImageBase {

  /**
   * @param {import("./extent.js").Extent} extent Extent.
   * @param {number|undefined} resolution Resolution.
   * @param {number} pixelRatio Pixel ratio.
   * @param {string} src Image source URI.
   * @param {?string} crossOrigin Cross origin.
   * @param {LoadFunction} imageLoadFunction Image load function.
   */
  constructor(extent, resolution, pixelRatio, src, crossOrigin, imageLoadFunction) {

    super(extent, resolution, pixelRatio, ImageState.IDLE);

    /**
     * @private
     * @type {string}
     */
    this.src_ = src;

    /**
     * @private
     * @type {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement}
     */
    this.image_ = new Image();
    if (crossOrigin !== null) {
      this.image_.crossOrigin = crossOrigin;
    }

    /**
     * @private
     * @type {Array<import("./events.js").EventsKey>}
     */
    this.imageListenerKeys_ = null;

    /**
     * @protected
     * @type {ImageState}
     */
    this.state = ImageState.IDLE;

    /**
     * @private
     * @type {LoadFunction}
     */
    this.imageLoadFunction_ = imageLoadFunction;

  }

  /**
   * @inheritDoc
   * @api
   */
  getImage() {
    return this.image_;
  }

  /**
   * Tracks loading or read errors.
   *
   * @private
   */
  handleImageError_() {
    this.state = ImageState.ERROR;
    this.unlistenImage_();
    this.changed();
  }

  /**
   * Tracks successful image load.
   *
   * @private
   */
  handleImageLoad_() {
    if (this.resolution === undefined) {
      this.resolution = getHeight(this.extent) / this.image_.height;
    }
    this.state = ImageState.LOADED;
    this.unlistenImage_();
    this.changed();
  }

  /**
   * Load the image or retry if loading previously failed.
   * Loading is taken care of by the tile queue, and calling this method is
   * only needed for preloading or for reloading in case of an error.
   * @override
   * @api
   */
  load() {
    if (this.state == ImageState.IDLE || this.state == ImageState.ERROR) {
      this.state = ImageState.LOADING;
      this.changed();
      this.imageLoadFunction_(this, this.src_);
      this.imageListenerKeys_ = listenImage(
        this.image_,
        this.handleImageLoad_.bind(this),
        this.handleImageError_.bind(this)
      );
    }
  }

  /**
   * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} image Image.
   */
  setImage(image) {
    this.image_ = image;
  }

  /**
   * Discards event handlers which listen for load completion or errors.
   *
   * @private
   */
  unlistenImage_() {
    unlistenImage(this.imageListenerKeys_);
  }
}

/**
 * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} image Image element.
 * @param {function():any} loadHandler Load callback function.
 * @param {function():any} errorHandler Error callback function.
 * @return {Array<import("./events.js").EventsKey>} listener keys.
 */
export function listenImage(image, loadHandler, errorHandler) {
  const img = /** @type {HTMLImageElement} */ (image);
  if (img.decode) {
    // create fake event target to be able to cancel the image decoding.
    const target = new EventTarget();
    const listenerKeys = [
      listenOnce(target, EventType.LOAD, VOID),
      listenOnce(target, EventType.ERROR, VOID)
    ];
    img.decode()
      .then(function() {
        if (target.hasListener(EventType.LOAD)) {
          loadHandler();
        }
      })
      .catch(function() {
        if (target.hasListener(EventType.ERROR)) {
          errorHandler();
        }
      })
      .finally(function() {
        listenerKeys.forEach(unlistenByKey);
      });
    return listenerKeys;
  } else {
    const listenerKeys = [
      listenOnce(img, EventType.LOAD, loadHandler),
      listenOnce(img, EventType.ERROR, errorHandler)
    ];
    return listenerKeys;
  }

}

/**
 * @param {Array<import("./events.js").EventsKey>} listenerKeys listener keys.
 */
export function unlistenImage(listenerKeys) {
  if (listenerKeys) {
    listenerKeys.forEach(unlistenByKey);
    listenerKeys = null;
  }
}

export default ImageWrapper;
