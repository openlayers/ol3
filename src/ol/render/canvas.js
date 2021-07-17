/**
 * @module ol/render/canvas
 */
import BaseObject from '../Object.js';
import EventTarget from '../events/Target.js';
import {WORKER_OFFSCREEN_CANVAS} from '../has.js';
import {clear} from '../obj.js';
import {createCanvasContext2D} from '../dom.js';
import {getFontParameters} from '../css.js';

/**
 * @typedef {Object} FillState
 * @property {import("../colorlike.js").ColorLike} fillStyle FillStyle.
 */

/**
 * @typedef Label
 * @property {number} width Width.
 * @property {number} height Height.
 * @property {Array<string|number>} contextInstructions ContextInstructions.
 */

/**
 * @typedef {Object} FillStrokeState
 * @property {import("../colorlike.js").ColorLike} [currentFillStyle] Current FillStyle.
 * @property {import("../colorlike.js").ColorLike} [currentStrokeStyle] Current StrokeStyle.
 * @property {CanvasLineCap} [currentLineCap] Current LineCap.
 * @property {Array<number>} currentLineDash Current LineDash.
 * @property {number} [currentLineDashOffset] Current LineDashOffset.
 * @property {CanvasLineJoin} [currentLineJoin] Current LineJoin.
 * @property {number} [currentLineWidth] Current LineWidth.
 * @property {number} [currentMiterLimit] Current MiterLimit.
 * @property {number} [lastStroke] Last stroke.
 * @property {import("../colorlike.js").ColorLike} [fillStyle] FillStyle.
 * @property {import("../colorlike.js").ColorLike} [strokeStyle] StrokeStyle.
 * @property {CanvasLineCap} [lineCap] LineCap.
 * @property {Array<number>} lineDash LineDash.
 * @property {number} [lineDashOffset] LineDashOffset.
 * @property {CanvasLineJoin} [lineJoin] LineJoin.
 * @property {number} [lineWidth] LineWidth.
 * @property {number} [miterLimit] MiterLimit.
 */

/**
 * @typedef {Object} StrokeState
 * @property {CanvasLineCap} lineCap LineCap.
 * @property {Array<number>} lineDash LineDash.
 * @property {number} lineDashOffset LineDashOffset.
 * @property {CanvasLineJoin} lineJoin LineJoin.
 * @property {number} lineWidth LineWidth.
 * @property {number} miterLimit MiterLimit.
 * @property {import("../colorlike.js").ColorLike} strokeStyle StrokeStyle.
 */

/**
 * @typedef {Object} TextState
 * @property {string} font Font.
 * @property {string} [textAlign] TextAlign.
 * @property {string} textBaseline TextBaseline.
 * @property {string} [placement] Placement.
 * @property {number} [maxAngle] MaxAngle.
 * @property {boolean} [overflow] Overflow.
 * @property {import("../style/Fill.js").default} [backgroundFill] BackgroundFill.
 * @property {import("../style/Stroke.js").default} [backgroundStroke] BackgroundStroke.
 * @property {import("../size.js").Size} [scale] Scale.
 * @property {Array<number>} [padding] Padding.
 */

/**
 * @typedef {Object} SerializableInstructions
 * @property {Array<*>} instructions The rendering instructions.
 * @property {Array<*>} hitDetectionInstructions The rendering hit detection instructions.
 * @property {Array<number>} coordinates The array of all coordinates.
 * @property {!Object<string, TextState>} [textStates] The text states (decluttering).
 * @property {!Object<string, FillState>} [fillStates] The fill states (decluttering).
 * @property {!Object<string, StrokeState>} [strokeStates] The stroke states (decluttering).
 */

/**
 * @typedef {Object<number, import("./canvas/Executor.js").ReplayImageOrLabelArgs>} DeclutterImageWithText
 */

/**
 * @const
 * @type {string}
 */
export const defaultFont = '10px sans-serif';

/**
 * @const
 * @type {import("../colorlike.js").ColorLike}
 */
export const defaultFillStyle = '#000';

/**
 * @const
 * @type {CanvasLineCap}
 */
export const defaultLineCap = 'round';

/**
 * @const
 * @type {Array<number>}
 */
export const defaultLineDash = [];

/**
 * @const
 * @type {number}
 */
export const defaultLineDashOffset = 0;

/**
 * @const
 * @type {CanvasLineJoin}
 */
export const defaultLineJoin = 'round';

/**
 * @const
 * @type {number}
 */
export const defaultMiterLimit = 10;

/**
 * @const
 * @type {import("../colorlike.js").ColorLike}
 */
export const defaultStrokeStyle = '#000';

/**
 * @const
 * @type {string}
 */
export const defaultTextAlign = 'center';

/**
 * @const
 * @type {string}
 */
export const defaultTextBaseline = 'middle';

/**
 * @const
 * @type {Array<number>}
 */
export const defaultPadding = [0, 0, 0, 0];

/**
 * @const
 * @type {number}
 */
export const defaultLineWidth = 1;

/**
 * @type {BaseObject}
 */
export const checkedFonts = new BaseObject();

/**
 * The label cache for text rendering. To change the default cache size of 2048
 * entries, use {@link module:ol/structs/LRUCache~LRUCache#setSize cache.setSize()}.
 * Deprecated - there is no label cache any more.
 * @type {?}
 * @api
 * @deprecated
 */
export const labelCache = new EventTarget();
labelCache.setSize = function () {
  console.warn('labelCache is deprecated.'); //eslint-disable-line
};

/**
 * @type {CanvasRenderingContext2D}
 */
let measureContext = null;

/**
 * @type {string}
 */
let measureFont;

/**
 * @type {!Object<string, number>}
 */
export const textHeights = {};

/**
 * Clears the label cache when a font becomes available.
 * @param {string} fontSpec CSS font spec.
 */
export const registerFont = (function () {
  const retries = 100;
  const size = '32px ';
  const referenceFonts = ['monospace', 'serif'];
  const len = referenceFonts.length;
  const text = 'wmytzilWMYTZIL@#/&?$%10\uF013';
  let interval, referenceWidth;

  /**
   * @param {string} fontStyle Css font-style
   * @param {string} fontWeight Css font-weight
   * @param {*} fontFamily Css font-family
   * @return {boolean} Font with style and weight is available
   */
  function isAvailable(fontStyle, fontWeight, fontFamily) {
    let available = true;
    for (let i = 0; i < len; ++i) {
      const referenceFont = referenceFonts[i];
      referenceWidth = measureTextWidth(
        fontStyle + ' ' + fontWeight + ' ' + size + referenceFont,
        text
      );
      if (fontFamily != referenceFont) {
        const width = measureTextWidth(
          fontStyle +
            ' ' +
            fontWeight +
            ' ' +
            size +
            fontFamily +
            ',' +
            referenceFont,
          text
        );
        // If width and referenceWidth are the same, then the fallback was used
        // instead of the font we wanted, so the font is not available.
        available = available && width != referenceWidth;
      }
    }
    if (available) {
      return true;
    }
    return false;
  }

  function check() {
    let done = true;
    const fonts = checkedFonts.getKeys();
    for (let i = 0, ii = fonts.length; i < ii; ++i) {
      const font = fonts[i];
      if (checkedFonts.get(font) < retries) {
        if (isAvailable.apply(this, font.split('\n'))) {
          clear(textHeights);
          // Make sure that loaded fonts are picked up by Safari
          measureContext = null;
          measureFont = undefined;
          checkedFonts.set(font, retries);
        } else {
          checkedFonts.set(font, checkedFonts.get(font) + 1, true);
          done = false;
        }
      }
    }
    if (done) {
      clearInterval(interval);
      interval = undefined;
    }
  }

  return function (fontSpec) {
    const font = getFontParameters(fontSpec);
    if (!font) {
      return;
    }
    const families = font.families;
    for (let i = 0, ii = families.length; i < ii; ++i) {
      const family = families[i];
      const key = font.style + '\n' + font.weight + '\n' + family;
      if (checkedFonts.get(key) === undefined) {
        checkedFonts.set(key, retries, true);
        if (!isAvailable(font.style, font.weight, family)) {
          checkedFonts.set(key, 0, true);
          if (interval === undefined) {
            interval = setInterval(check, 32);
          }
        }
      }
    }
  };
})();

/**
 * @param {string} font Font to use for measuring.
 * @return {import("../size.js").Size} Measurement.
 */
export const measureTextHeight = (function () {
  /**
   * @type {HTMLDivElement}
   */
  let measureElement;
  return function (fontSpec) {
    let height = textHeights[fontSpec];
    if (height == undefined) {
      if (WORKER_OFFSCREEN_CANVAS) {
        const font = getFontParameters(fontSpec);
        const metrics = measureText(fontSpec, 'Žg');
        const lineHeight = isNaN(Number(font.lineHeight))
          ? 1.2
          : Number(font.lineHeight);
        height =
          lineHeight *
          (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
      } else {
        if (!measureElement) {
          measureElement = document.createElement('div');
          measureElement.innerHTML = 'M';
          measureElement.style.minHeight = '0';
          measureElement.style.maxHeight = 'none';
          measureElement.style.height = 'auto';
          measureElement.style.padding = '0';
          measureElement.style.border = 'none';
          measureElement.style.position = 'absolute';
          measureElement.style.display = 'block';
          measureElement.style.left = '-99999px';
        }
        measureElement.style.font = fontSpec;
        document.body.appendChild(measureElement);
        height = measureElement.offsetHeight;
        document.body.removeChild(measureElement);
      }
      textHeights[fontSpec] = height;
    }
    return height;
  };
})();

/**
 * @param {string} font Font.
 * @param {string} text Text.
 * @return {TextMetrics} Text metrics.
 */
function measureText(font, text) {
  if (!measureContext) {
    measureContext = createCanvasContext2D(1, 1);
  }
  if (font != measureFont) {
    measureContext.font = font;
    measureFont = measureContext.font;
  }
  return measureContext.measureText(text);
}

/**
 * @param {string} font Font.
 * @param {string} text Text.
 * @return {number} Width.
 */
export function measureTextWidth(font, text) {
  const lines = text.split('\n');
  return measureTextWidths(font, lines, []);
}

/**
 * Measure text width using a cache.
 * @param {string} font The font.
 * @param {string} text The text to measure.
 * @param {Object<string, number>} cache A lookup of cached widths by text.
 * @return {number} The text width.
 */
export function measureAndCacheTextWidth(font, text, cache) {
  if (text in cache) {
    return cache[text];
  }
  const width = measureTextWidth(font, text);
  cache[text] = width;
  return width;
}

/**
 * @param {string} font Font to use for measuring.
 * @param {Array<string>} lines Lines to measure.
 * @param {Array<number>} widths Array will be populated with the widths of
 * each line.
 * @return {number} Width of the whole text.
 */
export function measureTextWidths(font, lines, widths) {
  const numLines = lines.length;
  let width = 0;
  for (let i = 0; i < numLines; ++i) {
    const currentWidth = measureText(font, lines[i]).width;
    width = Math.max(width, currentWidth);
    widths.push(currentWidth);
  }
  return width;
}

/**
 * @param {CanvasRenderingContext2D} context Context.
 * @param {number} rotation Rotation.
 * @param {number} offsetX X offset.
 * @param {number} offsetY Y offset.
 */
export function rotateAtOffset(context, rotation, offsetX, offsetY) {
  if (rotation !== 0) {
    context.translate(offsetX, offsetY);
    context.rotate(rotation);
    context.translate(-offsetX, -offsetY);
  }
}

/**
 * @param {CanvasRenderingContext2D} context Context.
 * @param {import("../transform.js").Transform|null} transform Transform.
 * @param {number} opacity Opacity.
 * @param {Label|HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} labelOrImage Label.
 * @param {number} originX Origin X.
 * @param {number} originY Origin Y.
 * @param {number} w Width.
 * @param {number} h Height.
 * @param {number} x X.
 * @param {number} y Y.
 * @param {import("../size.js").Size} scale Scale.
 */
export function drawImageOrLabel(
  context,
  transform,
  opacity,
  labelOrImage,
  originX,
  originY,
  w,
  h,
  x,
  y,
  scale
) {
  context.save();

  if (opacity !== 1) {
    context.globalAlpha *= opacity;
  }
  if (transform) {
    context.setTransform.apply(context, transform);
  }

  if (/** @type {*} */ (labelOrImage).contextInstructions) {
    // label
    context.translate(x, y);
    context.scale(scale[0], scale[1]);
    executeLabelInstructions(/** @type {Label} */ (labelOrImage), context);
  } else if (scale[0] < 0 || scale[1] < 0) {
    // flipped image
    context.translate(x, y);
    context.scale(scale[0], scale[1]);
    context.drawImage(
      /** @type {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} */ (
        labelOrImage
      ),
      originX,
      originY,
      w,
      h,
      0,
      0,
      w,
      h
    );
  } else {
    // if image not flipped translate and scale can be avoided
    context.drawImage(
      /** @type {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} */ (
        labelOrImage
      ),
      originX,
      originY,
      w,
      h,
      x,
      y,
      w * scale[0],
      h * scale[1]
    );
  }

  context.restore();
}

/**
 * @param {Label} label Label.
 * @param {CanvasRenderingContext2D} context Context.
 */
function executeLabelInstructions(label, context) {
  const contextInstructions = label.contextInstructions;
  for (let i = 0, ii = contextInstructions.length; i < ii; i += 2) {
    if (Array.isArray(contextInstructions[i + 1])) {
      context[contextInstructions[i]].apply(
        context,
        contextInstructions[i + 1]
      );
    } else {
      context[contextInstructions[i]] = contextInstructions[i + 1];
    }
  }
}
