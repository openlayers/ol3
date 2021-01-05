/**
 * @module ol/renderer/webgl/TileLayer
 */
import LRUCache from '../../structs/LRUCache.js';
import State from '../../source/State.js';
import TileRange from '../../TileRange.js';
import TileState from '../../TileState.js';
import TileTexture from '../../webgl/TileTexture.js';
import WebGLArrayBuffer from '../../webgl/Buffer.js';
import WebGLLayerRenderer from './Layer.js';
import {AttributeType} from '../../webgl/Helper.js';
import {ELEMENT_ARRAY_BUFFER, STATIC_DRAW} from '../../webgl.js';
import {
  compose as composeTransform,
  create as createTransform,
} from '../../transform.js';
import {
  create as createMat4,
  fromTransform as mat4FromTransform,
} from '../../vec/mat4.js';
import {
  createOrUpdate as createTileCoord,
  getKeyZXY,
  getKey as getTileCoordKey,
} from '../../tilecoord.js';
import {fromUserExtent} from '../../proj.js';
import {getIntersection} from '../../extent.js';
import {getUid} from '../../util.js';
import {numberSafeCompareFunction} from '../../array.js';
import {toSize} from '../../size.js';

export const Uniforms = {
  TILE_TEXTURE_PREFIX: 'u_tileTexture',
  TILE_TRANSFORM: 'u_tileTransform',
  TRANSITION_ALPHA: 'u_transitionAlpha',
  DEPTH: 'u_depth',
};

export const Attributes = {
  TEXTURE_COORD: 'a_textureCoord',
};

/**
 * @type {Array<import('../../webgl/Helper.js').AttributeDescription>}
 */
const attributeDescriptions = [
  {
    name: Attributes.TEXTURE_COORD,
    size: 2,
    type: AttributeType.FLOAT,
  },
];

/**
 * Transform a zoom level into a depth value ranging from -1 to 1.
 * @param {number} z A zoom level.
 * @return {number} A depth value.
 */
function depthForZ(z) {
  return 2 * (1 - 1 / (z + 1)) - 1;
}

/**
 * Add a tile texture to the lookup.
 * @param {Object<string, Array<import("../../webgl/TileTexture.js").default>>} tileTexturesByZ Lookup of
 * tile textures by zoom level.
 * @param {import("../../webgl/TileTexture.js").default} tileTexture A tile texture.
 * @param {number} z The zoom level.
 */
function addTileTextureToLookup(tileTexturesByZ, tileTexture, z) {
  if (!(z in tileTexturesByZ)) {
    tileTexturesByZ[z] = [];
  }
  tileTexturesByZ[z].push(tileTexture);
}

/**
 * @typedef {Object} Options
 * @property {string} vertexShader Vertex shader source.
 * @property {string} fragmentShader Fragment shader source.
 * @property {Object<string, import("../../webgl/Helper").UniformValue>} [uniforms] Additional uniforms
 * made available to shaders.
 * @property {string} [className='ol-layer'] A CSS class name to set to the canvas element.
 */

/**
 * @classdesc
 * WebGL renderer for tile layers.
 * @api
 */
class WebGLTileLayerRenderer extends WebGLLayerRenderer {
  /**
   * @param {import("../../layer/WebGLTile.js").default} tileLayer Tile layer.
   * @param {Options} options Options.
   */
  constructor(tileLayer, options) {
    super(tileLayer, {
      uniforms: options.uniforms,
      className: options.className,
    });

    /**
     * This transform converts tile i, j coordinates to screen coordinates.
     * @type {import("../../transform.js").Transform}
     * @private
     */
    this.tileTransform_ = createTransform();

    /**
     * @type {Array<number>}
     * @private
     */
    this.tempMat4_ = createMat4();

    /**
     * @type {import("../../TileRange.js").default}
     * @private
     */
    this.tempTileRange_ = new TileRange(0, 0, 0, 0);

    /**
     * @type {import("../../tilecoord.js").TileCoord}
     * @private
     */
    this.tempTileCoord_ = createTileCoord(0, 0, 0);

    /**
     * @type {import("../../size.js").Size}
     * @private
     */
    this.tempSize_ = [0, 0];

    this.program_ = this.helper.getProgram(
      options.fragmentShader,
      options.vertexShader
    );

    /**
     * Tiles are rendered as a quad with the following structure:
     *
     *  [P3]---------[P2]
     *   |`           |
     *   |  `     B   |
     *   |    `       |
     *   |      `     |
     *   |   A    `   |
     *   |          ` |
     *  [P0]---------[P1]
     *
     * Triangle A: P0, P1, P3
     * Triangle B: P1, P2, P3
     */
    const indices = new WebGLArrayBuffer(ELEMENT_ARRAY_BUFFER, STATIC_DRAW);
    indices.fromArray([0, 1, 3, 1, 2, 3]);
    this.helper.flushBufferData(indices);
    this.indices_ = indices;

    this.tileTextureCache_ = new LRUCache(512);

    this.renderedOpacity_ = NaN;
  }

  /**
   * Determine whether render should be called.
   * @param {import("../../PluggableMap.js").FrameState} frameState Frame state.
   * @return {boolean} Layer is ready to be rendered.
   */
  prepareFrame(frameState) {
    const source = this.getLayer().getSource();
    if (!source) {
      return false;
    }
    return source.getState() === State.READY;
  }

  /**
   * Render the layer.
   * @param {import("../../PluggableMap.js").FrameState} frameState Frame state.
   * @return {HTMLElement} The rendered element.
   */
  renderFrame(frameState) {
    this.preRender(frameState);

    const layerState = frameState.layerStatesArray[frameState.layerIndex];
    const viewState = frameState.viewState;

    let extent = frameState.extent;
    if (layerState.extent) {
      extent = getIntersection(
        extent,
        fromUserExtent(layerState.extent, viewState.projection)
      );
    }

    const tileLayer = this.getLayer();
    const tileSource = tileLayer.getSource();
    const tileGrid = tileSource.getTileGridForProjection(viewState.projection);
    const z = tileGrid.getZForResolution(
      viewState.resolution,
      tileSource.zDirection
    );

    /**
     * @type {Object<string, Array<import("../../webgl/TileTexture.js").default>>}
     */
    const tileTexturesByZ = {};

    const tileTextureCache = this.tileTextureCache_;
    const tileRange = tileGrid.getTileRangeForExtentAndZ(extent, z);

    const tileSourceKey = getUid(tileSource);
    if (!(tileSourceKey in frameState.wantedTiles)) {
      frameState.wantedTiles[tileSourceKey] = {};
    }

    const wantedTiles = frameState.wantedTiles[tileSourceKey];

    const tileResolution = tileGrid.getResolution(z);

    for (let x = tileRange.minX; x <= tileRange.maxX; ++x) {
      for (let y = tileRange.minY; y <= tileRange.maxY; ++y) {
        const tileCoord = createTileCoord(z, x, y, this.tempTileCoord_);
        const tileCoordKey = getTileCoordKey(tileCoord);

        let tileTexture;
        if (tileTextureCache.containsKey(tileCoordKey)) {
          tileTexture = tileTextureCache.get(tileCoordKey);
        } else {
          const tile = tileSource.getTile(
            z,
            x,
            y,
            frameState.pixelRatio,
            viewState.projection
          );
          tileTexture = new TileTexture(tile, tileGrid, this.helper);
          tileTextureCache.set(tileCoordKey, tileTexture);
        }

        addTileTextureToLookup(tileTexturesByZ, tileTexture, z);

        const tileQueueKey = tileTexture.tile.getKey();
        wantedTiles[tileQueueKey] = true;

        if (tileTexture.tile.getState() === TileState.IDLE) {
          if (!frameState.tileQueue.isKeyQueued(tileQueueKey)) {
            frameState.tileQueue.enqueue([
              tileTexture.tile,
              tileSourceKey,
              tileGrid.getTileCoordCenter(tileCoord),
              tileResolution,
            ]);
          }
        }
      }
    }

    /**
     * A lookup of alpha values for tiles at the target rendering resolution
     * for tiles that are in transition.  If a tile coord key is absent from
     * this lookup, the tile should be rendered at alpha 1.
     * @type {Object<string, number>}
     */
    const alphaLookup = {};

    const uid = getUid(this);
    const time = frameState.time;

    // look for cached tiles to use if a target tile is not ready
    const tileTextures = tileTexturesByZ[z];
    for (let i = 0, ii = tileTextures.length; i < ii; ++i) {
      const tileTexture = tileTextures[i];
      const tile = tileTexture.tile;
      const tileCoord = tile.tileCoord;

      if (tileTexture.loaded) {
        const alpha = tile.getAlpha(uid, time);
        if (alpha === 1) {
          // no need to look for alt tiles
          tile.endTransition(uid);
          continue;
        }
        const tileCoordKey = getTileCoordKey(tileCoord);
        alphaLookup[tileCoordKey] = alpha;
      }

      // first look for child tiles (at z + 1)
      const coveredByChildren = this.findAltTiles_(
        tileGrid,
        tileCoord,
        z + 1,
        tileTexturesByZ
      );

      if (coveredByChildren) {
        continue;
      }

      // next look for parent tiles
      for (let parentZ = z - 1; parentZ >= tileGrid.minZoom; --parentZ) {
        const coveredByParent = this.findAltTiles_(
          tileGrid,
          tileCoord,
          parentZ,
          tileTexturesByZ
        );

        if (coveredByParent) {
          break;
        }
      }
    }

    this.helper.useProgram(this.program_);
    this.helper.prepareDraw(frameState);

    const zs = Object.keys(tileTexturesByZ)
      .map(Number)
      .sort(numberSafeCompareFunction);

    const gl = this.helper.getGL();

    const centerX = viewState.center[0];
    const centerY = viewState.center[1];

    for (let j = 0, jj = zs.length; j < jj; ++j) {
      const tileZ = zs[j];
      const tileResolution = tileGrid.getResolution(tileZ);
      const tileSize = toSize(tileGrid.getTileSize(tileZ), this.tempSize_);
      const tileOrigin = tileGrid.getOrigin(tileZ);

      const centerI =
        (centerX - tileOrigin[0]) / (tileSize[0] * tileResolution);
      const centerJ =
        (tileOrigin[1] - centerY) / (tileSize[1] * tileResolution);

      const tileScale = viewState.resolution / tileResolution;

      const depth = depthForZ(tileZ);
      const tileTextures = tileTexturesByZ[tileZ];
      for (let i = 0, ii = tileTextures.length; i < ii; ++i) {
        const tileTexture = tileTextures[i];
        if (!tileTexture.loaded) {
          continue;
        }
        const tile = tileTexture.tile;
        const tileCoord = tile.tileCoord;
        const tileCoordKey = getTileCoordKey(tileCoord);

        const tileCenterI = tileCoord[1];
        const tileCenterJ = tileCoord[2];

        composeTransform(
          this.tileTransform_,
          0,
          0,
          2 / ((frameState.size[0] * tileScale) / tileSize[0]),
          -2 / ((frameState.size[1] * tileScale) / tileSize[1]),
          viewState.rotation,
          -(centerI - tileCenterI),
          -(centerJ - tileCenterJ)
        );

        this.helper.setUniformMatrixValue(
          Uniforms.TILE_TRANSFORM,
          mat4FromTransform(this.tempMat4_, this.tileTransform_)
        );

        this.helper.bindBuffer(tileTexture.coords);
        this.helper.bindBuffer(this.indices_);
        this.helper.enableAttributes(attributeDescriptions);

        for (
          let textureIndex = 0;
          textureIndex < tileTexture.textures.length;
          ++textureIndex
        ) {
          const textureProperty = 'TEXTURE' + textureIndex;
          const uniformName = Uniforms.TILE_TEXTURE_PREFIX + textureIndex;
          gl.activeTexture(gl[textureProperty]);
          gl.bindTexture(gl.TEXTURE_2D, tileTexture.textures[textureIndex]);
          gl.uniform1i(this.helper.getUniformLocation(uniformName), 0);
        }

        const alpha =
          tileCoordKey in alphaLookup ? alphaLookup[tileCoordKey] : 1;

        if (alpha < 1) {
          frameState.animate = true;
        }

        this.helper.setUniformFloatValue(Uniforms.TRANSITION_ALPHA, alpha);
        this.helper.setUniformFloatValue(Uniforms.DEPTH, depth);

        this.helper.drawElements(0, this.indices_.getSize());
      }
    }

    this.helper.finalizeDraw(frameState);

    const canvas = this.helper.getCanvas();

    const opacity = layerState.opacity;
    if (this.renderedOpacity_ !== opacity) {
      canvas.style.opacity = String(opacity);
      this.renderedOpacity_ = opacity;
    }

    while (tileTextureCache.canExpireCache()) {
      const tileTexture = tileTextureCache.pop();
      tileTexture.dispose();
    }

    // TODO: let the renderers manage their own cache instead of managing the source cache
    if (tileSource.canExpireCache()) {
      /**
       * @param {import("../../PluggableMap.js").default} map Map.
       * @param {import("../../PluggableMap.js").FrameState} frameState Frame state.
       */
      const postRenderFunction = function (map, frameState) {
        const tileSourceKey = getUid(tileSource);
        if (tileSourceKey in frameState.usedTiles) {
          tileSource.expireCache(
            frameState.viewState.projection,
            frameState.usedTiles[tileSourceKey]
          );
        }
      };

      frameState.postRenderFunctions.push(postRenderFunction);
    }

    this.postRender(frameState);
    return canvas;
  }

  /**
   * Look for tiles covering the provided tile coordinate at an alternate
   * zoom level.  Loaded tiles will be added to the provided tile texture lookup.
   * @param {import("../../tilegrid/TileGrid.js").default} tileGrid The tile grid.
   * @param {import("../../tilecoord.js").TileCoord} tileCoord The target tile coordinate.
   * @param {number} altZ The alternate zoom level.
   * @param {Object<string, Array<import("../../webgl/TileTexture.js").default>>} tileTexturesByZ Lookup of
   * tile textures by zoom level.
   * @return {boolean} The tile coordinate is covered by loaded tiles at the alternate zoom level.
   * @private
   */
  findAltTiles_(tileGrid, tileCoord, altZ, tileTexturesByZ) {
    const tileRange = tileGrid.getTileRangeForTileCoordAndZ(
      tileCoord,
      altZ,
      this.tempTileRange_
    );

    if (!tileRange) {
      return false;
    }

    let covered = true;
    const tileTextureCache = this.tileTextureCache_;
    for (let x = tileRange.minX; x <= tileRange.maxX; ++x) {
      for (let y = tileRange.minY; y <= tileRange.maxY; ++y) {
        const cacheKey = getKeyZXY(altZ, x, y);
        let loaded = false;
        if (tileTextureCache.containsKey(cacheKey)) {
          const tileTexture = tileTextureCache.get(cacheKey);
          if (tileTexture.loaded) {
            addTileTextureToLookup(tileTexturesByZ, tileTexture, altZ);
            loaded = true;
          }
        }
        if (!loaded) {
          covered = false;
        }
      }
    }
    return covered;
  }
}

/**
 * @function
 * @return {import("../../layer/WebGLTile.js").default}
 */
WebGLTileLayerRenderer.prototype.getLayer;

export default WebGLTileLayerRenderer;
