/**
 * @module ol/source/GlTiles
 */

import Tile from '../Tile.js';
import TileState from '../TileState.js';
import {createCanvasContext2D} from '../dom.js';
import {toSize} from '../size.js';
import XYZ from './XYZ.js';
import TileImage from './TileImage.js';
import GlTiledTextureAbstract from './GlTiledTexture/GlTiledTextureAbstract.js';
import {getKeyZXY} from '../tilecoord.js';
import EventType from '../events/EventType.js';
import {listenOnce} from '../events.js';

class GlTile extends Tile {
  /**
   * @param {import("../tilecoord.js").TileCoord} tileCoord Tile coordinate.
   * @param {import("../size.js").Size} tileSize Tile size.
   * @param {import("../extent.js").Extent} tileExtent BBox of the tile, in the map's display CRS.
   *
   * @param {WebGLContext} gl The GL context from the parent GlTiles source
   * @param {Promise[]} texFetches An array of `Promise`s for each of the textures to be fetched for this tile.
   * @param {WbGLTexture[]} textures An array of already-instantiated `WebGLTexture`s
   */
  constructor(tileCoord, tileSize, tileExtent, gl, texFetches = [], textures = []) {

    super(tileCoord, TileState.LOADING);

    /**
    * @private
    * @type {import("../size.js").Size}
    */
    this.tileSize_ = tileSize;

    this.ctx2d_ = createCanvasContext2D(tileSize[0], tileSize[1]);

    /**
    * @private
    * @type {HTMLCanvasElement}
    */
    this.canvas_ = this.ctx2d_.canvas;

    this.gl = gl;

    // Placeholder for the raster data for this tile.
    this.fetchedTexts_ = false;

    this.textures_ = textures;

    Promise.all(texFetches).then(fetchedTexts =>{
      this.fetchedTexts_ = fetchedTexts;
      this.render();
      this.setState(TileState.LOADED);
    }).catch(()=>{
      this.setState(TileState.ERROR);
    });
  }

  /**
  * Get the image element for this tile.
  * @return {HTMLCanvasElement} Image.
  */
  getImage() {
    return this.canvas_;
  }

  /**
  * @override
  */
  load() {}

  /**
   * (Re-)renders the tile, using the GlTiles context.
   * This is a synchronous operation, which assumes that the texture fetches
   * for thsi tile have been completed already.
   * @return {HTMLCanvasElement} Image.
   */
  render() {
    if (!this.fetchedTexts_) { return; }

    const gl = this.gl;
    const tileSize = this.tileSize_;

    // Attach textures to the tile source's already-defined texture buffers
    for (const i in this.fetchedTexts_) {
      if (this.fetchedTexts_[i] instanceof HTMLImageElement ||
        this.fetchedTexts_[i] instanceof ImageData
      ) {
        bindTextureImageData(gl, this.textures_[i], Number(i), this.fetchedTexts_[i]);
      } else if (this.fetchedTexts_[i].BYTES_PER_ELEMENT) {
        // This looks like a TypedArray, from GlTiledTexture
        bindTextureTypedArray(gl, this.textures_[i], Number(i), this.fetchedTexts_[i], tileSize[0], tileSize[1]);
      } else {
        throw new Error('Could not attach texture ' + i + ': not an HTMLImageElement or a TypedArray');
      }
    }

    // TODO: copy-paste code from Leaflet.TileLayerGL's render() method
    // to update the per-tile attributes, if those are needed/wanted

    // Use only the top-left part of the canvas as the GL viewport
    // (for TileGrids with more than one TileSize).
    // Note that GL inverts the Y coordinate here.
    gl.viewport(
      0,
      gl.drawingBufferHeight - tileSize[1],
      tileSize[0],
      tileSize[1]
    );
    gl.clearColor(0.5, 0.5, 0.5, 0.5);
    gl.enable(gl.BLEND);

    // Trigger draw call. Magic happens here.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    /// Copy gl canvas over tile's canvas
    this.ctx2d_.drawImage(gl.canvas, 0, 0);

    return this.canvas_;
  }
}


/**
 * @typedef {Object} Options
 * @property {import("../proj.js").ProjectionLike} [projection='EPSG:3857'] Optional projection.
 * @property {import("../tilegrid/TileGrid.js").default} [tileGrid] Tile grid.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 * @property {number} [zDirection=0] Set to `1` when debugging `VectorTile` sources with
 * a default configuration. Indicates which resolution should be used by a renderer if
 * the view resolution does not match any resolution of the tile source. If 0, the nearest
 * resolution will be used. If 1, the nearest lower resolution will be used. If -1, the
 * nearest higher resolution will be used.
 *
 * @property {array} textureSources An array of texture sources, each element being
 * either a `TileImage` source, or a `GlTiledTexture`.
 * @property {string} fragmentShader A string representing the GLSL fragment shader
 * to be run. This must NOT include defining the variants, nor the texture uniforms,
 * nor user-defined uniforms.
 *
 * @property {object} uniforms A plain object containing a map of uniform names and their
 * initial values. Values must be a `Number` or an `Array` of up to four `Number`s.
 */


/**
 * @classdesc
 * A pseudo tile source which runs a WebGL1 shader on its defined GlTiledTextures.
 *
 * @api
 */
class GlTiles extends XYZ {
  /**
   * @param {Options=} opt_options Debug tile options.
   */
  constructor(opt_options) {
    /**
     * @type {Options}
     */
    const options = opt_options || {};

    super(Object.assign({},{
      opaque: false,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
    }, options));

    this.fragmentShader = options.fragmentShader || 'void main(void) {gl_FragColor = vec4(0.2,0.2,0.2,1.0);}';

    this.uniforms = options.uniforms || {};

    this.texSources = options.textureSources || [];


    /// Check whether the tileGrid has one tile size, or multiple tile sizes (one per
    /// zoom level, as per some WMTS implementations and some hand-tweaked GeoTIFF
    /// tilesets). The temp canvas to do the GL render must be large enough to
    /// accommodate all tileSizes.

    let tileSize = [0, 0];
    if (this.tileGrid.tileSize_) {
      // Only one TileSize for all zoom levels of the TileGrid
      tileSize = toSize(this.tileGrid.getTileSize());
    } else {
      // Several tileSizes for this TileGrid; find the largest dimensions
      this.tileGrid.tileSizes_.forEach((s)=>{
        const size = toSize(s);
        if (size[0] > tileSize[0]) { tileSize[0] = size[0]; }
        if (size[1] > tileSize[1]) { tileSize[1] = size[1]; }
      });
    }

    this._programReady = new Promise((res)=>{
      this._markProgramAsReady = res;
    });

    // Init WebGL context. Mostly copy-pasted from Leaflet.TileLayerGL.
    this._renderer = document.createElement('canvas');
    this._renderer.width = tileSize[0];
    this._renderer.height = tileSize[1];
    this._glError = false;

    this._gl =
      this._renderer.getContext('webgl', {
        premultipliedAlpha: false
      }) ||
      this._renderer.getContext('experimental-webgl', {
        premultipliedAlpha: false
      });
    this._gl.viewportWidth = tileSize[0];
    this._gl.viewportHeight = tileSize[1];

    this._maxTextures = this._gl.getParameter(this._gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    if (this.texSources.length > this._maxTextures) {
      // This might show up when running on a browser+GPU configuration allowing for
      // a maximum of 8 textures, but loading 9 or more, e.g. all samples from a Sentinel-2
      // imagery granule.
      console.warn(`This WebGL implementation allows for a maximum of ${this._maxTextures}, but ${this.texSources.length} are being used. Some textures SHALL be dropped.`);
    }

    // A `Promise` that resolves when all the `GlTiledTexture`s have reported their
    // fetchFunc definition. This is needed to know the fetch function definitions of
    // all GlTiledTextures, which might need some information from the network (e.g.
    // GeoTIFF headers) to be known.
    this._fetchFuncDefs = Promise.all(this.texSources.map((glTex, i)=>{
      if (glTex instanceof GlTiledTextureAbstract) {
        return glTex.getFetchFunctionDef(`uTexture${i}`);
      } else {
        // Any other image-based tile source, e.g. XYZ image tiles, do not have
        // a fetch function
        return "";
      }
    }));

    // Init texture units (before program load) so that early tiles can access them.
    this.textures_ = [];
    for (let i = 0; i < this.texSources.length && i < this._maxTextures; i++) {
      this.textures_[i] = this._gl.createTexture();
    }
    this._fetchFuncDefs.then((defs)=>this.loadGLProgram_(defs));
  }

  /**
  * @inheritDoc
  */
  getTile(z, x, y) {
    const tileCoordKey = getKeyZXY(z, x, y);
    if (this.tileCache.containsKey(tileCoordKey)) {
      return /** @type {!LabeledTile} */ (this.tileCache.get(tileCoordKey));
    } else {
      const tileSize = toSize(this.tileGrid.getTileSize(z));
      const tileCoord = [z, x, y];

      // Get the projected coords for the tile
      const tileExtent = this.getTileGrid().getTileCoordExtent(tileCoord, this.tmpExtent_);
      const texFetches = [];

      for (const i in this.texSources) {
        if (this.texSources[i] instanceof TileImage) {
          // For image-based tile sources, wrap the load/error events into a promise
          texFetches[i] = new Promise((res, rej)=>{
            const tile = this.texSources[i].getTile(z, x, y);

            listenOnce(tile.getImage(), EventType.LOAD, (ev)=>{
              // For whatever reason, some browsers (e.g. Chromium) do not follow the
              // DOM events standard and do not have the ev.target property. Fall back
              // to ev.path[0] in that case.
              res(ev.target || ev.path[0]);
              // console.log('texture source tile loaded: ',ev);
            });
            listenOnce(tile.getImage(), EventType.ERROR, (ev)=>{
              rej(ev.target || ev.path[0]);
              // console.log('texture source errored: ',ev);
            });

            tile.load();
          });
        } else if (this.texSources[i] instanceof GlTiledTextureAbstract) {
          // For GeoTIFFs (and the like), the specific class shall return a Promise
          // to a TypedArray.
          texFetches[i] = this.texSources[i].getTiledData(this.getTileGrid(),tileCoord,tileSize,tileExtent);
        } else {
          throw new Error('GLTiles expected a TileImage source or a GlTiledTexture (e.g. GeoTIFF), got:' + this.texSources[i]);
        }
        // Delay all texture fetching until the fetch function defs are resolved
        const tmp = texFetches[i];
        texFetches[i] = this._programReady.then(()=>tmp);
      }


      // Instantiate tile, pass an array of texfetches for this particular tile,
      // and the instances of WebGLTexture (so they can be re-put into the texture units)
      const tile = new GlTile(tileCoord, tileSize, this.projection_, this._gl, texFetches, this.textures_);

      // Listen to the tile when it has finished loading, mark the tile layer as
      // changed in order to trigger a redraw
      tile.addEventListener(EventType.CHANGE, this.changed.bind(this));

      this.tileCache.set(tileCoordKey, tile);
      return tile;
    }
  }


  // Takes as the only argument the texture fetch function definitions, an array of `String`s
  // Compils the shaders and (re-)attaches the attribute+uniform locations
  loadGLProgram_(defs) {
    // Mostly copy-pasted from Leaflet.TileLayerGL's code.
    const gl = this._gl;

    // Force using this vertex shader.
    // Just copy all attributes to predefined variants and set the vertex positions
    const vertexShaderCode =
      'attribute vec2 aVertexCoords;  ' +
      'attribute vec2 aTextureCoords;  ' +
      'attribute vec2 aCRSCoords;  ' +
      'attribute vec2 aLatLngCoords;  ' +
      'varying vec2 vTextureCoords;  ' +
      'varying vec2 vCRSCoords;  ' +
      'varying vec2 vLatLngCoords;  ' +
      'void main(void) {  ' +
      '	gl_Position = vec4(aVertexCoords , 1.0, 1.0);  ' +
      '	vTextureCoords = aTextureCoords;  ' +
      '	vCRSCoords = aCRSCoords;  ' +
      '	vLatLngCoords = aLatLngCoords;  ' +
      '}';

    // Force using this bit for the fragment shader. All fragment shaders
    // will use the same predefined varyings.
    let fragmentShaderHeader =
      '#line 10001\n' +
      'precision highp float;\n' +
      'uniform float uNow;\n' +
      'varying vec2 vTextureCoords;\n' +
      'varying vec2 vCRSCoords;\n' +
      'varying vec2 vLatLngCoords;\n';

    for (let i = 0; i < this.texSources.length && i < this._maxTextures; i++) {
      fragmentShaderHeader += 'uniform sampler2D uTexture' + i + ';\n';
    }

    fragmentShaderHeader += this.getUniformSizes_();
    fragmentShaderHeader += defs.join("\n");
    fragmentShaderHeader += '\n#line 1\n';

    this._glProgram = gl.createProgram();
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.shaderSource(fragmentShader, fragmentShaderHeader + this.fragmentShader);
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    // @event shaderError
    // Fired when there was an error creating the shaders.
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      this._glError = gl.getShaderInfoLog(vertexShader);
      throw this._glError;
    }
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      this._glError = gl.getShaderInfoLog(fragmentShader);
      throw this._glError;
    }

    gl.attachShader(this._glProgram, vertexShader);
    gl.attachShader(this._glProgram, fragmentShader);
    gl.linkProgram(this._glProgram);
    gl.useProgram(this._glProgram);

    // There will be four vec2 vertex attributes per vertex - aCRSCoords and
    // aTextureCoords
    this._aVertexPosition = gl.getAttribLocation(this._glProgram, 'aVertexCoords');
    this._aTexPosition = gl.getAttribLocation(this._glProgram, 'aTextureCoords');
    this._aCRSPosition = gl.getAttribLocation(this._glProgram, 'aCRSCoords');
    this._aLatLngPosition = gl.getAttribLocation(this._glProgram, 'aLatLngCoords');

    this.initUniforms_(this._glProgram);

    // Create four data buffer with 8 elements each - the (easting,northing)
    // CRS coords, idem for LatLng coords, the (s,t) texture coords and
    // the (x,y) viewport coords for each of the 4 vertices
    // Data for the texel and viewport coords is totally static, and
    // needs to be declared only once.
    this._CRSBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._CRSBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.STATIC_DRAW);
    if (this._aCRSPosition !== -1) {
      gl.enableVertexAttribArray(this._aCRSPosition);
      gl.vertexAttribPointer(this._aCRSPosition, 2, gl.FLOAT, false, 8, 0);
    }

    this._LatLngBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._LatLngBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.STATIC_DRAW);
    if (this._aLatLngPosition !== -1) {
      gl.enableVertexAttribArray(this._aLatLngPosition);
      gl.vertexAttribPointer(this._aLatLngPosition, 2, gl.FLOAT, false, 8, 0);
    }

    this._TexCoordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._TexCoordsBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      1.0, 0.0,
      0.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ]), gl.STATIC_DRAW);
    if (this._aTexPosition !== -1) {
      gl.enableVertexAttribArray(this._aTexPosition);
      gl.vertexAttribPointer(this._aTexPosition, 2, gl.FLOAT, false, 8, 0);
    }

    this._VertexCoordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._VertexCoordsBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      1, 1,
      -1, 1,
      1, -1,
      -1, -1
    ]), gl.STATIC_DRAW);
    if (this._aVertexPosition !== -1) {
      gl.enableVertexAttribArray(this._aVertexPosition);
      gl.vertexAttribPointer(this._aVertexPosition, 2, gl.FLOAT, false, 8, 0);
    }

    // Init textures
    for (let i = 0; i < this.texSources.length && i < this._maxTextures; i++) {
//       this.textures_[i] = gl.createTexture();  // Done earlier
      gl.uniform1i(gl.getUniformLocation(this._glProgram, 'uTexture' + i), i);
    }

    //console.log("Marking program as ready");
    this._markProgramAsReady();
  }


  // Looks at the size of the default values given for the uniforms.
  // Returns a string valid for defining the uniforms in the header of the
  // fragment shader.
  getUniformSizes_() {
    let defs = '';
    this._uniformSizes = {};
    for (const uniformName in this.uniforms) {
      const defaultValue = this.uniforms[uniformName];
      if (typeof defaultValue === 'number') {
        this._uniformSizes[uniformName] = 0;
        defs += 'uniform float ' + uniformName + ';\n';
      } else if (defaultValue instanceof Array) {
        if (defaultValue.length > 4) {
          throw new Error('Max size for uniform value is 4 elements');
        }
        this._uniformSizes[uniformName] = defaultValue.length;
        if (defaultValue.length === 1) {
          defs += 'uniform float ' + uniformName + ';\n';
        } else {
          defs += 'uniform vec' + defaultValue.length + ' ' + uniformName + ';\n';
        }
      } else {
        throw new Error(
          'Default value for uniforms must be either number or array of numbers'
        );
      }
    }
    return defs;
  }


  // Inits the uNow uniform, and the user-provided uniforms, given the current GL program.
  // TODO: Sets the _isReRenderable property if there are any set uniforms.
  initUniforms_() {
    const gl = this._gl;
    this._uNowPosition = gl.getUniformLocation(this._glProgram, 'uNow');
    // this._isReRenderable = false;

    if (this._uNowPosition) {
      gl.uniform1f(this._uNowPosition, performance.now());
      // this._isReRenderable = true;
    }

    this._uniformLocations = {};
    for (const uniformName in this.uniforms) {
      this._uniformLocations[uniformName] = gl.getUniformLocation(this._glProgram, uniformName);
      this.setUniform(uniformName, this.uniforms[uniformName]);
      // this._isReRenderable = true;
    }
  }

  /**
   * Sets the value for a GL uniform.
   * @param {string} name Name of the GL uniform to update
   * @param {number} value New value for the GL uniform
   * @param {boolean} rerender Whether updating triggers a re-render of all tiles (default true)
   */
  setUniform(name, value, rerender = true) {
    switch (this._uniformSizes[name]) {
      case 0:
        this._gl.uniform1f(this._uniformLocations[name], value);
        break;
      case 1:
        this._gl.uniform1fv(this._uniformLocations[name], value);
        break;
      case 2:
        this._gl.uniform2fv(this._uniformLocations[name], value);
        break;
      case 3:
        this._gl.uniform3fv(this._uniformLocations[name], value);
        break;
      case 4:
        this._gl.uniform4fv(this._uniformLocations[name], value);
        break;
      default:
        throw new Error('Value for setUniform() must be a Number or an Array of up to 4 Numbers');
    }
    if (rerender) {
      this.reRender();
    }
  }

  /**
   * Triggers a re-render of all tiles.
   */
  reRender() {
    // TODO: Do not render tiles currently not visible (out of bounds),
    // try flushing them from cache instead.

    if (this.isReRendering_) {
      console.log("Delaying rerender");
      window.cancelAnimationFrame(this.reRenderAnimFrame_);
      return this.reRenderAnimFrame_ = window.requestAnimationFrame(()=>this.reRender());
    }

    console.time("gltiles re-render");
    this.isReRendering_ = true;

    let i=0;

    const pending = [];

    this.tileCache.forEach((tile, key)=>{
      tile.render();
    });

    this.changed();

    this.isReRendering_ = false;
  }
}


/**
  * Helper function. Binds a ImageData (HTMLImageElement, HTMLCanvasElement or
  * ImageBitmap) to a texture, given its index (0 to 7).
  * @param {WebGLContext} gl The GL context to work in
  * @param {WebGLTexture} texture The 0-indexed texture index
  * @param {number} index The 0-indexed texture index
  * @param {ImageData} imageData An instance of ImageData with the 8-bit RGBA data
  * @return {undefined}
  */
function bindTextureImageData(gl, texture, index, imageData) {
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
}


/**
  * Helper function. Binds a TypedArray to a texture, given its index (0 to 7).
  *
  * See https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14.8
  *
  * @param {WebGLContext} gl The GL context to work in
  * @param {WebGLTexture} texture The 0-indexed texture index
  * @param {number} index The 0-indexed texture index
  * @param {TypedArray} arr A TypedArray with 8-bit, 16-bit or 32-bit data
  * @param {number} w Width of the texture
  * @param {number} h Height of the texture
  * @return {undefined}
  */
function bindTextureTypedArray(gl, texture, index, arr, w, h) {
  // TODO: refactor this somehow, so this functionality is paired with the
  // texture fetch function definitions of GlTiledTextures.

  // The only possible `internalformat` is 8-bit: «If pixels is non-null, the type of pixels must match the type of the data to be read. If it is UNSIGNED_BYTE, a Uint8Array or Uint8ClampedArray must be supplied; if it is UNSIGNED_SHORT_5_6_5, UNSIGNED_SHORT_4_4_4_4, or UNSIGNED_SHORT_5_5_5_1, a Uint16Array must be supplied. If the types do not match, an INVALID_OPERATION error is generated.»

  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const castArr = new Uint8Array(arr.buffer);

  if (arr instanceof Uint8Array || arr instanceof Uint8ClampedArray) {
    // For 8-bit data:
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, arr);
  } else if (arr instanceof Int16Array) {
    /// FIXME: investigate negative values
    // For 16-bit int data:
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, w, h, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, castArr);
  } else if (arr instanceof Uint16Array) {
    // For 16-bit int data:
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, w, h, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, castArr);
  } else {
    console.warn("Unimplemented datatype for dumping data into texture, ", arr);
  }

  // TODO: int32, uint32, float32

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
}


export default GlTiles;