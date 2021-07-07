/**
 * @module ol/DataTile
 */
import Tile from './Tile.js';
import TileState from './TileState.js';

/**
 * Data that can be used with a DataTile.
 * @typedef {Uint8Array|Uint8ClampedArray|DataView} Data
 */

/**
 * @typedef {Object} Options
 * @property {import("./tilecoord.js").TileCoord} tileCoord Tile coordinate.
 * @property {function() : Promise<Data>} loader Data loader.
 * @property {number} [transition=250] A duration for tile opacity
 * transitions in milliseconds. A duration of 0 disables the opacity transition.
 * @api
 */

class DataTile extends Tile {
  /**
   * @param {Options} options Tile options.
   */
  constructor(options) {
    const state = TileState.IDLE;

    super(options.tileCoord, state, {transition: options.transition});

    this.loader_ = options.loader;
    this.data_ = null;
    this.error_ = null;
  }

  /**
   * Get the data for the tile.
   * @return {Data} Tile data.
   * @api
   */
  getData() {
    return this.data_;
  }

  /**
   * Get any loading error.
   * @return {Error} Loading error.
   * @api
   */
  getError() {
    return this.error_;
  }

  /**
   * Load not yet loaded URI.
   * @api
   */
  load() {
    this.state = TileState.LOADING;
    this.changed();

    const self = this;
    this.loader_()
      .then(function (data) {
        self.data_ = data;
        self.state = TileState.LOADED;
        self.changed();
      })
      .catch(function (error) {
        self.error_ = error;
        self.state = TileState.ERROR;
        self.changed();
      });
  }
}

export default DataTile;
