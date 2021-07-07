/**
 * @module ol/source/DataTile
 */
import DataTile from '../DataTile.js';
import EventType from '../events/EventType.js';
import TileEventType from './TileEventType.js';
import TileSource, {TileSourceEvent} from './Tile.js';
import TileState from '../TileState.js';
import {createXYZ, extentFromProjection} from '../tilegrid.js';
import {getKeyZXY} from '../tilecoord.js';
import {getUid} from '../util.js';

/**
 * @typedef {Object} Options
 * @property {function(number, number, number) : Promise<import("../DataTile.js").Data>} [loader] Data loader.  Called with z, x, and y tile coordinates.
 * @property {number} [maxZoom=42] Optional max zoom level. Not used if `tileGrid` is provided.
 * @property {number} [minZoom=0] Optional min zoom level. Not used if `tileGrid` is provided.
 * @property {number|import("../size.js").Size} [tileSize=[256, 256]] The pixel width and height of the tiles.
 * @property {number} [maxResolution] Optional tile grid resolution at level zero. Not used if `tileGrid` is provided.
 * @property {import("../proj.js").ProjectionLike} [projection='EPSG:3857'] Tile projection.
 * @property {import("../tilegrid/TileGrid.js").default} [tileGrid] Tile grid.
 * @property {boolean} [opaque=false] Whether the layer is opaque.
 * @property {import("./State.js").default} [state] The source state.
 * @property {number} [cacheSize] Number of tiles to retain in the cache.
 * @property {number} [tilePixelRatio] Tile pixel ratio.
 * @property {boolean} [wrapX=true] Render tiles beyond the antimeridian.
 * @property {number} [transition] Transition time when fading in new tiles (in miliseconds).
 */

/**
 * @classdesc
 * Base class for sources providing tiles divided into a tile grid over http.
 *
 * @fires import("./Tile.js").TileSourceEvent
 */
class DataTileSource extends TileSource {
  /**
   * @param {Options} options Image tile options.
   */
  constructor(options) {
    const projection =
      options.projection === undefined ? 'EPSG:3857' : options.projection;

    let tileGrid = options.tileGrid;
    if (tileGrid === undefined && projection) {
      tileGrid = createXYZ({
        extent: extentFromProjection(projection),
        maxResolution: options.maxResolution,
        maxZoom: options.maxZoom,
        minZoom: options.minZoom,
        tileSize: options.tileSize,
      });
    }

    super({
      cacheSize: options.cacheSize,
      projection: projection,
      tileGrid: tileGrid,
      opaque: options.opaque,
      state: options.state,
      tilePixelRatio: options.tilePixelRatio,
      wrapX: options.wrapX,
      transition: options.transition,
    });

    /**
     * @private
     * @type {!Object<string, boolean>}
     */
    this.tileLoadingKeys_ = {};

    /**
     * @private
     */
    this.loader_ = options.loader;

    this.handleTileChange_ = this.handleTileChange_.bind(this);
  }

  /**
   * @param {function(number, number, number) : Promise<import("../DataTile.js").Data>} loader The data loader.
   * @protected
   */
  setLoader(loader) {
    this.loader_ = loader;
  }

  /**
   * @abstract
   * @param {number} z Tile coordinate z.
   * @param {number} x Tile coordinate x.
   * @param {number} y Tile coordinate y.
   * @param {number} pixelRatio Pixel ratio.
   * @param {import("../proj/Projection.js").default} projection Projection.
   * @return {!import("../Tile.js").default} Tile.
   */
  getTile(z, x, y, pixelRatio, projection) {
    const tileCoordKey = getKeyZXY(z, x, y);
    if (this.tileCache.containsKey(tileCoordKey)) {
      return this.tileCache.get(tileCoordKey);
    }

    const sourceLoader = this.loader_;
    function loader() {
      return sourceLoader(z, x, y);
    }

    const tile = new DataTile({tileCoord: [z, x, y], loader: loader});
    tile.addEventListener(EventType.CHANGE, this.handleTileChange_);

    this.tileCache.set(tileCoordKey, tile);
    return tile;
  }

  /**
   * Handle tile change events.
   * @param {import("../events/Event.js").default} event Event.
   */
  handleTileChange_(event) {
    const tile = /** @type {import("../Tile.js").default} */ (event.target);
    const uid = getUid(tile);
    const tileState = tile.getState();
    let type;
    if (tileState == TileState.LOADING) {
      this.tileLoadingKeys_[uid] = true;
      type = TileEventType.TILELOADSTART;
    } else if (uid in this.tileLoadingKeys_) {
      delete this.tileLoadingKeys_[uid];
      type =
        tileState == TileState.ERROR
          ? TileEventType.TILELOADERROR
          : tileState == TileState.LOADED
          ? TileEventType.TILELOADEND
          : undefined;
    }
    if (type) {
      this.dispatchEvent(new TileSourceEvent(type, tile));
    }
  }
}

export default DataTileSource;
