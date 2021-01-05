/**
 * @module ol/webgl/TileTexture
 */

import EventTarget from '../events/Target.js';
import EventType from '../events/EventType.js';
import ImageTile from '../ImageTile.js';
import TileState from '../TileState.js';
import WebGLArrayBuffer from './Buffer.js';
import {ARRAY_BUFFER, STATIC_DRAW} from '../webgl.js';
import {toSize} from '../size.js';

function bindAndConfigure(gl, texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

/**
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLTexture} texture The texture.
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} image The image.
 */
function uploadImageTexture(gl, texture, image) {
  bindAndConfigure(gl, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}

/**
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {WebGLTexture} texture The texture.
 * @param {import("../DataTile.js").Data} data The pixel data.
 * @param {import("../size.js").Size} size The pixel size.
 * @param {number} bandCount The band count.
 */
function uploadDataTexture(gl, texture, data, size, bandCount) {
  bindAndConfigure(gl, texture);

  let format;
  switch (bandCount) {
    case 1: {
      format = gl.LUMINANCE;
      break;
    }
    case 2: {
      format = gl.LUMINANCE_ALPHA;
      break;
    }
    case 3: {
      format = gl.RGB;
      break;
    }
    case 4: {
      format = gl.RGBA;
      break;
    }
    default: {
      throw new Error(`Unsupported number of bands: ${bandCount}`);
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    format,
    size[0],
    size[1],
    0,
    format,
    gl.UNSIGNED_BYTE,
    data
  );
}

class TileTexture extends EventTarget {
  /**
   * @param {import("../DataTile.js").default|import("../ImageTile.js").default} tile The tile.
   * @param {import("../tilegrid/TileGrid.js").default} grid Tile grid.
   * @param {import("../webgl/Helper.js").default} helper WebGL helper.
   */
  constructor(tile, grid, helper) {
    super();

    this.tile = tile;
    this.size = toSize(grid.getTileSize(tile.tileCoord[0]));
    this.loaded = tile.getState() === TileState.LOADED;

    this.bandCount = NaN;

    this.helper_ = helper;
    this.handleTileChange_ = this.handleTileChange_.bind(this);

    const coords = new WebGLArrayBuffer(ARRAY_BUFFER, STATIC_DRAW);
    coords.fromArray([
      0, // P0
      1,
      1, // P1
      1,
      1, // P2
      0,
      0, // P3
      0,
    ]);
    helper.flushBufferData(coords);
    this.coords = coords;

    /**
     * @type {Array<WebGLTexture>}
     */
    this.textures = [];

    if (this.loaded) {
      this.uploadTile_();
    } else {
      tile.addEventListener(EventType.CHANGE, this.handleTileChange_);
    }
  }

  uploadTile_() {
    const gl = this.helper_.getGL();
    const tile = this.tile;

    if (tile instanceof ImageTile) {
      const texture = gl.createTexture();
      this.textures.push(texture);
      this.bandCount = 4;
      uploadImageTexture(gl, texture, tile.getImage());
      return;
    }

    const data = tile.getData();
    const pixelCount = this.size[0] * this.size[1];
    this.bandCount = data.byteLength / pixelCount;
    const textureCount = Math.ceil(this.bandCount / 4);

    if (textureCount === 1) {
      const texture = gl.createTexture();
      this.textures.push(texture);
      uploadDataTexture(gl, texture, data, this.size, this.bandCount);
      return;
    }

    const textureDataArrays = new Array(textureCount);
    for (let textureIndex = 0; textureIndex < textureCount; ++textureIndex) {
      const texture = gl.createTexture();
      this.textures.push(texture);

      const bandCount =
        textureIndex < textureCount - 1 ? 4 : this.bandCount % 4;
      textureDataArrays[textureIndex] = new Uint8Array(pixelCount * bandCount);
    }

    const valueCount = pixelCount * this.bandCount;
    for (let dataIndex = 0; dataIndex < valueCount; ++dataIndex) {
      const bandIndex = dataIndex % this.bandCount;
      const textureBandIndex = bandIndex % 4;
      const textureIndex = Math.floor(bandIndex / 4);
      const bandCount =
        textureIndex < textureCount - 1 ? 4 : this.bandCount % 4;
      const pixelIndex = Math.floor(dataIndex / this.bandCount);
      textureDataArrays[textureIndex][
        pixelIndex * bandCount + textureBandIndex
      ] = data[dataIndex];
    }

    for (let textureIndex = 0; textureIndex < textureCount; ++textureIndex) {
      const bandCount =
        textureIndex < textureCount - 1 ? 4 : this.bandCount % 4;
      const texture = this.textures[textureIndex];
      const data = textureDataArrays[textureIndex];
      uploadDataTexture(gl, texture, data, this.size, bandCount);
    }
  }

  handleTileChange_() {
    if (this.tile.getState() === TileState.LOADED) {
      this.loaded = true;
      this.uploadTile_();
      this.dispatchEvent(EventType.CHANGE);
    }
  }

  disposeInternal() {
    const gl = this.helper_.getGL();
    this.helper_.deleteBuffer(this.coords);
    for (let i = 0; i < this.textures.length; ++i) {
      gl.deleteTexture(this.textures[i]);
    }
    this.tile.removeEventListener(EventType.CHANGE, this.handleTileChange_);
  }
}

export default TileTexture;
