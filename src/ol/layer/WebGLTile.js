/**
 * @module ol/layer/WebGLTile
 */
import BaseTileLayer from './BaseTile.js';
import WebGLTileLayerRenderer, {
  Attributes,
  Uniforms,
} from '../renderer/webgl/TileLayer.js';
import {
  ValueTypes,
  expressionToGlsl,
  getStringNumberEquivalent,
  uniformNameForVariable,
} from '../style/expressions.js';
import {assign} from '../obj.js';

/**
 * @typedef {Object} Style
 * @property {Object<string, number>} [variables] Style variables.  Each variable must hold a number.
 * @property {import("../style/expressions.js").ExpressionValue} [color] An expression applied to color values.
 * @property {import("../style/expressions.js").ExpressionValue} [brightness=0] Value used to decrease or increase
 * the layer brightness.  Values range from -1 to 1.
 * @property {import("../style/expressions.js").ExpressionValue} [contrast=0] Value used to decrease or increase
 * the layer contrast.  Values range from -1 to 1.
 * @property {import("../style/expressions.js").ExpressionValue} [exposure=0] Value used to decrease or increase
 * the layer exposure.  Values range from -1 to 1.
 * @property {import("../style/expressions.js").ExpressionValue} [saturation=0] Value used to decrease or increase
 * the layer saturation.  Values range from -1 to 1.
 * @property {import("../style/expressions.js").ExpressionValue} [gamma=1] Apply a gamma correction to the layer.
 * Values range from 0 to infinity.
 */

/**
 * @typedef {Object} Options
 * @property {Style} [style] Style to apply to the layer.
 * @property {string} [className='ol-layer'] A CSS class name to set to the layer element.
 * @property {number} [opacity=1] Opacity (0, 1).
 * @property {boolean} [visible=true] Visibility.
 * @property {import("../extent.js").Extent} [extent] The bounding extent for layer rendering.  The layer will not be
 * rendered outside of this extent.
 * @property {number} [zIndex] The z-index for layer rendering.  At rendering time, the layers
 * will be ordered, first by Z-index and then by position. When `undefined`, a `zIndex` of 0 is assumed
 * for layers that are added to the map's `layers` collection, or `Infinity` when the layer's `setMap()`
 * method was used.
 * @property {number} [minResolution] The minimum resolution (inclusive) at which this layer will be
 * visible.
 * @property {number} [maxResolution] The maximum resolution (exclusive) below which this layer will
 * be visible.
 * @property {number} [minZoom] The minimum view zoom level (exclusive) above which this layer will be
 * visible.
 * @property {number} [maxZoom] The maximum view zoom level (inclusive) at which this layer will
 * be visible.
 * @property {number} [preload=0] Preload. Load low-resolution tiles up to `preload` levels. `0`
 * means no preloading.
 * @property {import("../source/Tile.js").default} [source] Source for this layer.
 * @property {import("../PluggableMap.js").default} [map] Sets the layer as overlay on a map. The map will not manage
 * this layer in its layers collection, and the layer will be rendered on top. This is useful for
 * temporary layers. The standard way to add a layer to a map and have it managed by the map is to
 * use {@link module:ol/Map#addLayer}.
 * @property {boolean} [useInterimTilesOnError=true] Use interim tiles on error.
 */

/**
 * @typedef {Object} ParsedStyle
 * @property {string} vertexShader The vertex shader.
 * @property {string} fragmentShader The fragment shader.
 * @property {Object<string,import("../webgl/Helper.js").UniformValue>} uniforms Uniform definitions.
 */

/**
 * @param {Style} style The layer style.
 * @param {number} bandCount The number of bands.
 * @return {ParsedStyle} Shaders and uniforms generated from the style.
 */
function parseStyle(style, bandCount) {
  const vertexShader = `
    attribute vec2 ${Attributes.TEXTURE_COORD};
    uniform mat4 ${Uniforms.TILE_TRANSFORM};
    uniform float ${Uniforms.DEPTH};

    varying vec2 v_textureCoord;

    void main() {
      v_textureCoord = ${Attributes.TEXTURE_COORD};
      gl_Position = ${Uniforms.TILE_TRANSFORM} * vec4(${Attributes.TEXTURE_COORD}, ${Uniforms.DEPTH}, 1.0);
    }
  `;

  /**
   * @type {import("../style/expressions.js").ParsingContext}
   */
  const context = {
    inFragmentShader: true,
    variables: [],
    attributes: [],
    stringLiteralsMap: {},
    bandCount: bandCount,
  };

  const pipeline = [];

  if (style.color !== undefined) {
    const color = expressionToGlsl(context, style.color, ValueTypes.COLOR);
    pipeline.push(`color = ${color};`);
  }

  if (style.contrast !== undefined) {
    const contrast = expressionToGlsl(
      context,
      style.contrast,
      ValueTypes.NUMBER
    );
    pipeline.push(
      `color.rgb = clamp((${contrast} + 1.0) * color.rgb - (${contrast} / 2.0), vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));`
    );
  }

  if (style.exposure !== undefined) {
    const exposure = expressionToGlsl(
      context,
      style.exposure,
      ValueTypes.NUMBER
    );
    pipeline.push(
      `color.rgb = clamp((${exposure} + 1.0) * color.rgb, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));`
    );
  }

  if (style.saturation !== undefined) {
    const saturation = expressionToGlsl(
      context,
      style.saturation,
      ValueTypes.NUMBER
    );
    pipeline.push(`
      float saturation = ${saturation} + 1.0;
      float sr = (1.0 - saturation) * 0.2126;
      float sg = (1.0 - saturation) * 0.7152;
      float sb = (1.0 - saturation) * 0.0722;
      mat3 saturationMatrix = mat3(
        sr + saturation, sr, sr,
        sg, sg + saturation, sg,
        sb, sb, sb + saturation
      );
      color.rgb = clamp(saturationMatrix * color.rgb, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));
    `);
  }

  if (style.gamma !== undefined) {
    const gamma = expressionToGlsl(context, style.gamma, ValueTypes.NUMBER);
    pipeline.push(`color.rgb = pow(color.rgb, vec3(1.0 / ${gamma}));`);
  }

  if (style.brightness !== undefined) {
    const brightness = expressionToGlsl(
      context,
      style.brightness,
      ValueTypes.NUMBER
    );
    pipeline.push(
      `color.rgb = clamp(color.rgb + ${brightness}, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0));`
    );
  }

  /** @type {Object<string,import("../webgl/Helper").UniformValue>} */
  const uniforms = {};

  const numVariables = context.variables.length;
  if (numVariables > 1 && !style.variables) {
    throw new Error(
      `Missing variables in style (expected ${context.variables})`
    );
  }

  for (let i = 0; i < numVariables; ++i) {
    const variableName = context.variables[i];
    if (!(variableName in style.variables)) {
      throw new Error(`Missing '${variableName}' in style variables`);
    }
    const uniformName = uniformNameForVariable(variableName);
    uniforms[uniformName] = function () {
      let value = style.variables[variableName];
      if (typeof value === 'string') {
        value = getStringNumberEquivalent(context, value);
      }
      return value !== undefined ? value : -9999999; // to avoid matching with the first string literal
    };
  }

  const uniformDeclarations = Object.keys(uniforms).map(function (name) {
    return `uniform float ${name};`;
  });

  const textureCount = Math.ceil(bandCount / 4);
  const colorAssignments = new Array(textureCount);
  for (let textureIndex = 0; textureIndex < textureCount; ++textureIndex) {
    const uniformName = Uniforms.TILE_TEXTURE_PREFIX + textureIndex;
    uniformDeclarations.push(`uniform sampler2D ${uniformName};`);
    colorAssignments[
      textureIndex
    ] = `vec4 color${textureIndex} = texture2D(${uniformName}, v_textureCoord);`;
  }

  const fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    varying vec2 v_textureCoord;
    uniform float ${Uniforms.TRANSITION_ALPHA};

    ${uniformDeclarations.join('\n')}

    void main() {
      ${colorAssignments.join('\n')}

      vec4 color = color0;

      ${pipeline.join('\n')}

      if (color.a == 0.0) {
        discard;
      }

      gl_FragColor = color * ${Uniforms.TRANSITION_ALPHA};
    }`;

  return {
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms,
  };
}

/**
 * @classdesc
 * For layer sources that provide pre-rendered, tiled images in grids that are
 * organized by zoom levels for specific resolutions.
 * Note that any property set in the options is set as a {@link module:ol/Object~BaseObject}
 * property on the layer object; for example, setting `title: 'My Title'` in the
 * options means that `title` is observable, and has get/set accessors.
 *
 * @api
 */
class WebGLTileLayer extends BaseTileLayer {
  /**
   * @param {Options} opt_options Tile layer options.
   */
  constructor(opt_options) {
    const options = opt_options ? assign({}, opt_options) : {};

    const style = options.style || {};
    delete options.style;
    super(options);

    const parsedStyle = parseStyle(style || {}, 1); // TODO: get texture count from source

    this.vertexShader_ = parsedStyle.vertexShader;
    this.fragmentShader_ = parsedStyle.fragmentShader;
    this.uniforms_ = parsedStyle.uniforms;
    this.styleVariables_ = style.variables || {};
  }

  /**
   * Create a renderer for this layer.
   * @return {import("../renderer/Layer.js").default} A layer renderer.
   * @protected
   */
  createRenderer() {
    return new WebGLTileLayerRenderer(this, {
      vertexShader: this.vertexShader_,
      fragmentShader: this.fragmentShader_,
      uniforms: this.uniforms_,
    });
  }

  /**
   * Update any variables used by the layer style and trigger a re-render.
   * @param {Object<string, number>} variables Variables to update.
   */
  updateStyleVariables(variables) {
    assign(this.styleVariables_, variables);
    this.changed();
  }
}

export default WebGLTileLayer;
