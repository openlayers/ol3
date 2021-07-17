/**
 * @module ol/source/OGCMapTile
 */
import SourceState from './State.js';
import TileGrid from '../tilegrid/TileGrid.js';
import TileImage from './TileImage.js';
import {assign} from '../obj.js';
import {get as getProjection} from '../proj.js';

/**
 * See https://github.com/opengeospatial/OGC-API-Tiles.
 */

/**
 * @typedef {Object} TilesInfo
 * @property {string} name The tileset id.
 * @property {Array<Link>} links The links.
 * @property {Array<TileMatrixSetLink>} tileMatrixSetLinks Tile matrix set links.
 */

/**
 * @typedef {Object} Link
 * @property {string} rel The link rel attribute.
 * @property {string} href The link URL.
 * @property {string} type The link type.
 */

/**
 * @typedef {Object} TileMatrixSetLink
 * @property {string} tileMatrixSet The tile matrix set id.
 * @property {string} tileMatrixSetURI The tile matrix set URI.
 * @property {Array<TileMatrixSetLimit>} [tileMatrixSetLimits] Tile matrix set limits.
 */

/**
 * @typedef {Object} TileMatrixSetLimit
 * @property {string} tileMatrix The tile matrix id.
 * @property {number} minTileRow The minimum tile row.
 * @property {number} maxTileRow The maximum tile row.
 * @property {number} minTileCol The minimum tile column.
 * @property {number} maxTileCol The maximum tile column.
 */

/**
 * @typedef {Object} TileMatrixSet
 * @property {string} title The tile matrix set title.
 * @property {string} identifier The tile matrix set id.
 * @property {string} supportedCRS The coordinate reference system.
 * @property {Array<TileMatrix>} tileMatrix Array of tile matrices.
 */

/**
 * @typedef {Object} TileMatrix
 * @property {string} identifier The tile matrix id.
 * @property {number} cellSize The pixel resolution (map units per pixel).
 * @property {Array<number>} pointOfOrigin The map location of the matrix origin.
 * @property {string} [cornerOfOrigin='topLeft'] The corner of the matrix that represents the origin ('topLeft' or 'bottomLeft').
 * @property {number} matrixWidth The number of columns.
 * @property {number} matrixHeight The number of rows.
 * @property {number} tileWidth The pixel width of a tile.
 * @property {number} tileHeight The pixel height of a tile.
 */

const BOTTOM_LEFT_ORIGIN = 'bottomLeft';

/**
 * @typedef {Object} Options
 * @property {string} url URL to the OGC Map Tile endpoint.
 * @property {string} tileMatrixSet Identifier for the tile matrix set to use.
 * @property {Object} [context] A lookup of values to use in the tile URL template.
 * @property {import("../proj.js").ProjectionLike} [projection] Projection. By default, the projection
 * will be derived from the `supportedCRS` of the `tileMatrixSet`.  You can override this by supplying
 * a projection to the constructor.
 * @property {import("./Source.js").AttributionLike} [attributions] Attributions.
 * @property {number} [cacheSize] Tile cache size. The default depends on the screen size. Will be ignored if too small.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {boolean} [imageSmoothing=true] Enable image smoothing.
 * @property {number} [reprojectionErrorThreshold=0.5] Maximum allowed reprojection error (in pixels).
 * Higher values can increase reprojection performance, but decrease precision.
 * @property {import("../Tile.js").LoadFunction} [tileLoadFunction] Optional function to load a tile given a URL. The default is
 * ```js
 * function(imageTile, src) {
 *   imageTile.getImage().src = src;
 * };
 * ```
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * @property {number} [transition] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 */

/**
 * @classdesc
 * Layer source for map tiles from an OGC API - Tiles service.
 * @api
 */
class OGCMapTile extends TileImage {
  /**
   * @param {Options} options OGC map tile options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize,
      crossOrigin: options.crossOrigin,
      imageSmoothing: options.imageSmoothing,
      projection: options.projection,
      reprojectionErrorThreshold: options.reprojectionErrorThreshold,
      state: SourceState.LOADING,
      tileLoadFunction: options.tileLoadFunction,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
      transition: options.transition,
    });

    /**
     * @private
     * @type {string}
     */
    this.tileMatrixSet = options.tileMatrixSet;

    /**
     * @private
     * @type {Array<TileMatrixSetLimit>}
     */
    this.tileMatrixSetLimits = null;

    /**
     * @private
     * @type {string}
     */
    this.tileUrlTemplate;

    /**
     * @private
     * @type {Object}
     */
    this.context = options.context || null;

    this.loadTilesInfo(options.url);
  }

  /**
   * @private
   * @param {string} url The tiles info URL.
   */
  loadTilesInfo(url) {
    const client = new XMLHttpRequest();
    client.addEventListener('load', this.onTilesInfoLoad.bind(this));
    client.addEventListener('error', this.onTilesInfoError.bind(this));
    client.open('GET', url);
    client.setRequestHeader('Accept', 'application/json');
    client.send();
  }

  /**
   * @private
   * @param {Event} event The load event.
   */
  onTilesInfoLoad(event) {
    const client = /** @type {XMLHttpRequest} */ (event.target);
    // status will be 0 for file:// urls
    if (!client.status || (client.status >= 200 && client.status < 300)) {
      let response;
      try {
        response = /** @type {TilesInfo} */ (JSON.parse(client.responseText));
      } catch (err) {
        this.handleError(err);
        return;
      }
      this.handleTilesInfoResponse(response);
    } else {
      this.handleError(
        new Error(`unexpected status for tiles info: ${client.status}`)
      );
    }
  }

  /**
   * @private
   * @param {Event} event The error event.
   */
  onTilesInfoError(event) {
    this.handleError(new Error('client error loading tiles info'));
  }

  /**
   * @private
   * @param {TilesInfo} info Tiles info.
   */
  handleTilesInfoResponse(info) {
    let tileUrlTemplate;
    for (let i = 0; i < info.links.length; ++i) {
      const link = info.links[i];
      if (link.rel === 'item') {
        tileUrlTemplate = link.href;
        break;
      }
    }
    if (!tileUrlTemplate) {
      this.handleError(new Error('could not find item link'));
      return;
    }
    this.tileUrlTemplate = tileUrlTemplate;

    let tileMatrixSetURI;
    const tileMatrixSetLinks = info.tileMatrixSetLinks;
    for (let i = 0; i < tileMatrixSetLinks.length; ++i) {
      const candidate = tileMatrixSetLinks[i];
      if (candidate.tileMatrixSet === this.tileMatrixSet) {
        tileMatrixSetURI = candidate.tileMatrixSetURI;
        break;
      }
    }

    // TODO: handle optional tileMatrixSetURI
    if (!tileMatrixSetURI) {
      this.handleError(
        new Error(`could not find tileMatrixSet: ${this.tileMatrixSet}`)
      );
      return;
    }

    const client = new XMLHttpRequest();
    client.addEventListener('load', this.onTilesTileMatrixSetLoad.bind(this));
    client.addEventListener('error', this.onTilesTileMatrixSetError.bind(this));
    client.open('GET', tileMatrixSetURI);
    client.setRequestHeader('Accept', 'application/json');
    client.send();
  }

  /**
   * @private
   * @param {Event} event The load event.
   */
  onTilesTileMatrixSetLoad(event) {
    const client = /** @type {XMLHttpRequest} */ (event.target);
    // status will be 0 for file:// urls
    if (!client.status || (client.status >= 200 && client.status < 300)) {
      let response;
      try {
        response = /** @type {TileMatrixSet} */ (JSON.parse(
          client.responseText
        ));
      } catch (err) {
        this.handleError(err);
        return;
      }
      this.handleTileMatrixSetResponse(response);
    } else {
      this.handleError(
        new Error(`Unexpected status for tile matrix set: ${client.status}`)
      );
    }
  }

  /**
   * @private
   * @param {Event} event The error event.
   */
  onTilesTileMatrixSetError(event) {
    this.handleError(new Error('client error loading tile matrix set'));
  }

  /**
   * @private
   * @param {TileMatrixSet} tileMatrixSet Tile matrix set.
   */
  handleTileMatrixSetResponse(tileMatrixSet) {
    let projection = this.getProjection();
    if (!projection) {
      projection = getProjection(tileMatrixSet.supportedCRS);
      if (!projection) {
        this.handleError(
          new Error(`Unsupported CRS: ${tileMatrixSet.supportedCRS}`)
        );
        return;
      }
    }
    const backwards = projection.getAxisOrientation().substr(0, 2) !== 'en';

    // TODO: deal with limits
    const matrices = tileMatrixSet.tileMatrix;
    const length = matrices.length;
    const origins = new Array(length);
    const resolutions = new Array(length);
    const sizes = new Array(length);
    const tileSizes = new Array(length);
    for (let i = 0; i < matrices.length; ++i) {
      const matrix = matrices[i];
      const origin = matrix.pointOfOrigin;
      if (backwards) {
        origins[i] = [origin[1], origin[0]];
      } else {
        origins[i] = origin;
      }
      resolutions[i] = matrix.cellSize;
      sizes[i] = [matrix.matrixWidth, matrix.matrixHeight];
      tileSizes[i] = [matrix.tileWidth, matrix.tileHeight];
    }

    const tileGrid = new TileGrid({
      origins: origins,
      resolutions: resolutions,
      sizes: sizes,
      tileSizes: tileSizes,
    });

    this.tileGrid = tileGrid;

    const tileMatrixSetId = this.tileMatrixSet;
    const tileUrlTemplate = this.tileUrlTemplate;
    const context = this.context;

    this.setTileUrlFunction(function (tileCoord, pixelRatio, projection) {
      if (!tileCoord) {
        return undefined;
      }

      const matrix = matrices[tileCoord[0]];
      const upsideDown = matrix.cornerOfOrigin === BOTTOM_LEFT_ORIGIN;

      const localContext = {
        tileMatrixSetId: tileMatrixSetId,
        tileMatrix: matrix.identifier,
        tileCol: tileCoord[1],
        tileRow: upsideDown ? -tileCoord[2] - 1 : tileCoord[2],
      };
      assign(localContext, context);

      const url = tileUrlTemplate.replace(/\{(\w+?)\}/g, function (m, p) {
        return localContext[p];
      });

      return url;
    }, tileUrlTemplate);

    this.setState(SourceState.READY);
  }

  /**
   * @private
   * @param {Error} error The error.
   */
  handleError(error) {
    console.error(error); // eslint-disable-line
    this.setState(SourceState.ERROR);
  }
}

export default OGCMapTile;
