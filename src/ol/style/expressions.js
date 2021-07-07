/**
 * Operators and utilities used for style expressions
 * @module ol/style/expressions
 */

import {asArray, isStringColor} from '../color.js';

/**
 * Base type used for literal style parameters; can be a number literal or the output of an operator,
 * which in turns takes {@link ExpressionValue} arguments.
 *
 * The following operators can be used:
 *
 * * Reading operators:
 *   * `['get', 'attributeName']` fetches a feature attribute (it will be prefixed by `a_` in the shader)
 *     Note: those will be taken from the attributes provided to the renderer
 *   * `['var', 'varName']` fetches a value from the style variables, or 0 if undefined
 *   * `['time']` returns the time in seconds since the creation of the layer
 *   * `['zoom']` returns the current zoom level
 *   * `['resolution']` returns the current resolution
 *
 * * Math operators:
 *   * `['*', value1, value2]` multiplies `value1` by `value2`
 *   * `['/', value1, value2]` divides `value1` by `value2`
 *   * `['+', value1, value2]` adds `value1` and `value2`
 *   * `['-', value1, value2]` subtracts `value2` from `value1`
 *   * `['clamp', value, low, high]` clamps `value` between `low` and `high`
 *   * `['%', value1, value2]` returns the result of `value1 % value2` (modulo)
 *   * `['^', value1, value2]` returns the value of `value1` raised to the `value2` power
 *
 * * Transform operators:
 *   * `['case', condition1, output1, ...conditionN, outputN, fallback]` selects the first output whose corresponding
 *     condition evaluates to `true`. If no match is found, returns the `fallback` value.
 *     All conditions should be `boolean`, output and fallback can be any kind.
 *   * `['match', input, match1, output1, ...matchN, outputN, fallback]` compares the `input` value against all
 *     provided `matchX` values, returning the output associated with the first valid match. If no match is found,
 *     returns the `fallback` value.
 *     `input` and `matchX` values must all be of the same type, and can be `number` or `string`. `outputX` and
 *     `fallback` values must be of the same type, and can be of any kind.
 *   * `['interpolate', interpolation, input, stop1, output1, ...stopN, outputN]` returns a value by interpolating between
 *     pairs of inputs and outputs; `interpolation` can either be `['linear']` or `['exponential', base]` where `base` is
 *     the rate of increase from stop A to stop B (i.e. power to which the interpolation ratio is raised); a value
 *     of 1 is equivalent to `['linear']`.
 *     `input` and `stopX` values must all be of type `number`. `outputX` values can be `number` or `color` values.
 *     Note: `input` will be clamped between `stop1` and `stopN`, meaning that all output values will be comprised
 *     between `output1` and `outputN`.
 *
 * * Logical operators:
 *   * `['<', value1, value2]` returns `true` if `value1` is strictly lower than `value2`, or `false` otherwise.
 *   * `['<=', value1, value2]` returns `true` if `value1` is lower than or equals `value2`, or `false` otherwise.
 *   * `['>', value1, value2]` returns `true` if `value1` is strictly greater than `value2`, or `false` otherwise.
 *   * `['>=', value1, value2]` returns `true` if `value1` is greater than or equals `value2`, or `false` otherwise.
 *   * `['==', value1, value2]` returns `true` if `value1` equals `value2`, or `false` otherwise.
 *   * `['!=', value1, value2]` returns `true` if `value1` does not equal `value2`, or `false` otherwise.
 *   * `['!', value1]` returns `false` if `value1` is `true` or greater than `0`, or `true` otherwise.
 *   * `['all', value1, value2, ...]` returns `true` if all the inputs are `true`, `false` otherwise.
 *   * `['any', value1, value2, ...]` returns `true` if any of the inputs are `true`, `false` otherwise.
 *   * `['between', value1, value2, value3]` returns `true` if `value1` is contained between `value2` and `value3`
 *     (inclusively), or `false` otherwise.
 *
 * * Conversion operators:
 *   * `['array', value1, ...valueN]` creates a numerical array from `number` values; please note that the amount of
 *     values can currently only be 2, 3 or 4.
 *   * `['color', red, green, blue, alpha]` creates a `color` value from `number` values; the `alpha` parameter is
 *     optional; if not specified, it will be set to 1.
 *     Note: `red`, `green` and `blue` components must be values between 0 and 255; `alpha` between 0 and 1.
 *
 * Values can either be literals or another operator, as they will be evaluated recursively.
 * Literal values can be of the following types:
 * * `boolean`
 * * `number`
 * * `string`
 * * {@link module:ol/color~Color}
 *
 * @typedef {Array<*>|import("../color.js").Color|string|number|boolean} ExpressionValue
 */

/**
 * Possible inferred types from a given value or expression.
 * Note: these are binary flags.
 * @enum {number}
 */
export const ValueTypes = {
  NUMBER: 0b00001,
  STRING: 0b00010,
  COLOR: 0b00100,
  BOOLEAN: 0b01000,
  NUMBER_ARRAY: 0b10000,
  ANY: 0b11111,
  NONE: 0,
};

/**
 * An operator declaration must contain two methods: `getReturnType` which returns a type based on
 * the operator arguments, and `toGlsl` which returns a GLSL-compatible string.
 * Note: both methods can process arguments recursively.
 * @typedef {Object} Operator
 * @property {function(Array<ExpressionValue>): ValueTypes|number} getReturnType Returns one or several types
 * @property {function(ParsingContext, Array<ExpressionValue>, ValueTypes=): string} toGlsl Returns a GLSL-compatible string
 * Note: takes in an optional type hint as 3rd parameter
 */

/**
 * Operator declarations
 * @type {Object<string, Operator>}
 */
export const Operators = {};

/**
 * Returns the possible types for a given value (each type being a binary flag)
 * To test a value use e.g. `getValueType(v) & ValueTypes.BOOLEAN`
 * @param {ExpressionValue} value Value
 * @return {ValueTypes|number} Type or types inferred from the value
 */
export function getValueType(value) {
  if (typeof value === 'number') {
    return ValueTypes.NUMBER;
  }
  if (typeof value === 'boolean') {
    return ValueTypes.BOOLEAN;
  }
  if (typeof value === 'string') {
    if (isStringColor(value)) {
      return ValueTypes.COLOR | ValueTypes.STRING;
    }
    return ValueTypes.STRING;
  }
  if (!Array.isArray(value)) {
    throw new Error(`Unhandled value type: ${JSON.stringify(value)}`);
  }
  const valueArr = /** @type {Array<*>} */ (value);
  const onlyNumbers = valueArr.every(function (v) {
    return typeof v === 'number';
  });
  if (onlyNumbers) {
    if (valueArr.length === 3 || valueArr.length === 4) {
      return ValueTypes.COLOR | ValueTypes.NUMBER_ARRAY;
    }
    return ValueTypes.NUMBER_ARRAY;
  }
  if (typeof valueArr[0] !== 'string') {
    throw new Error(
      `Expected an expression operator but received: ${JSON.stringify(
        valueArr
      )}`
    );
  }
  const operator = Operators[valueArr[0]];
  if (operator === undefined) {
    throw new Error(
      `Unrecognized expression operator: ${JSON.stringify(valueArr)}`
    );
  }
  return operator.getReturnType(valueArr.slice(1));
}

/**
 * Checks if only one value type is enabled in the input number.
 * @param {ValueTypes|number} valueType Number containing value type binary flags
 * @return {boolean} True if only one type flag is enabled, false if zero or multiple
 */
export function isTypeUnique(valueType) {
  return Math.log2(valueType) % 1 === 0;
}

/**
 * Context available during the parsing of an expression.
 * @typedef {Object} ParsingContext
 * @property {boolean} [inFragmentShader] If false, means the expression output should be made for a vertex shader
 * @property {Array<string>} variables List of variables used in the expression; contains **unprefixed names**
 * @property {Array<string>} attributes List of attributes used in the expression; contains **unprefixed names**
 * @property {Object<string, number>} stringLiteralsMap This object maps all encountered string values to a number
 * @property {number} [bandCount] Number of bands per pixel.
 */

/**
 * Will return the number as a float with a dot separator, which is required by GLSL.
 * @param {number} v Numerical value.
 * @return {string} The value as string.
 */
export function numberToGlsl(v) {
  const s = v.toString();
  return s.indexOf('.') === -1 ? s + '.0' : s;
}

/**
 * Will return the number array as a float with a dot separator, concatenated with ', '.
 * @param {Array<number>} array Numerical values array.
 * @return {string} The array as a vector, e. g.: `vec3(1.0, 2.0, 3.0)`.
 */
export function arrayToGlsl(array) {
  if (array.length < 2 || array.length > 4) {
    throw new Error(
      '`formatArray` can only output `vec2`, `vec3` or `vec4` arrays.'
    );
  }
  return `vec${array.length}(${array.map(numberToGlsl).join(', ')})`;
}

/**
 * Will normalize and converts to string a `vec4` color array compatible with GLSL.
 * @param {string|import("../color.js").Color} color Color either in string format or [r, g, b, a] array format,
 * with RGB components in the 0..255 range and the alpha component in the 0..1 range.
 * Note that the final array will always have 4 components.
 * @return {string} The color expressed in the `vec4(1.0, 1.0, 1.0, 1.0)` form.
 */
export function colorToGlsl(color) {
  const array = asArray(color).slice();
  if (array.length < 4) {
    array.push(1);
  }
  return arrayToGlsl(
    array.map(function (c, i) {
      return i < 3 ? c / 255 : c;
    })
  );
}

/**
 * Returns a stable equivalent number for the string literal.
 * @param {ParsingContext} context Parsing context
 * @param {string} string String literal value
 * @return {number} Number equivalent
 */
export function getStringNumberEquivalent(context, string) {
  if (context.stringLiteralsMap[string] === undefined) {
    context.stringLiteralsMap[string] = Object.keys(
      context.stringLiteralsMap
    ).length;
  }
  return context.stringLiteralsMap[string];
}

/**
 * Returns a stable equivalent number for the string literal, for use in shaders. This number is then
 * converted to be a GLSL-compatible string.
 * @param {ParsingContext} context Parsing context
 * @param {string} string String literal value
 * @return {string} GLSL-compatible string containing a number
 */
export function stringToGlsl(context, string) {
  return numberToGlsl(getStringNumberEquivalent(context, string));
}

/**
 * Recursively parses a style expression and outputs a GLSL-compatible string. Takes in a parsing context that
 * will be read and modified during the parsing operation.
 * @param {ParsingContext} context Parsing context
 * @param {ExpressionValue} value Value
 * @param {ValueTypes|number} [typeHint] Hint for the expected final type (can be several types combined)
 * @return {string} GLSL-compatible output
 */
export function expressionToGlsl(context, value, typeHint) {
  // operator
  if (Array.isArray(value) && typeof value[0] === 'string') {
    const operator = Operators[value[0]];
    if (operator === undefined) {
      throw new Error(
        `Unrecognized expression operator: ${JSON.stringify(value)}`
      );
    }
    return operator.toGlsl(context, value.slice(1), typeHint);
  }

  const valueType = getValueType(value);
  if ((valueType & ValueTypes.NUMBER) > 0) {
    return numberToGlsl(/** @type {number} */ (value));
  }

  if ((valueType & ValueTypes.BOOLEAN) > 0) {
    return value.toString();
  }

  if (
    (valueType & ValueTypes.STRING) > 0 &&
    (typeHint === undefined || typeHint == ValueTypes.STRING)
  ) {
    return stringToGlsl(context, value.toString());
  }

  if (
    (valueType & ValueTypes.COLOR) > 0 &&
    (typeHint === undefined || typeHint == ValueTypes.COLOR)
  ) {
    return colorToGlsl(/** @type {Array<number> | string} */ (value));
  }

  if ((valueType & ValueTypes.NUMBER_ARRAY) > 0) {
    return arrayToGlsl(/** @type {Array<number>} */ (value));
  }

  throw new Error(`Unexpected expression ${value} (expected type ${typeHint})`);
}

function assertNumber(value) {
  if (!(getValueType(value) & ValueTypes.NUMBER)) {
    throw new Error(
      `A numeric value was expected, got ${JSON.stringify(value)} instead`
    );
  }
}
function assertNumbers(values) {
  for (let i = 0; i < values.length; i++) {
    assertNumber(values[i]);
  }
}
function assertString(value) {
  if (!(getValueType(value) & ValueTypes.STRING)) {
    throw new Error(
      `A string value was expected, got ${JSON.stringify(value)} instead`
    );
  }
}
function assertBoolean(value) {
  if (!(getValueType(value) & ValueTypes.BOOLEAN)) {
    throw new Error(
      `A boolean value was expected, got ${JSON.stringify(value)} instead`
    );
  }
}
function assertArgsCount(args, count) {
  if (args.length !== count) {
    throw new Error(
      `Exactly ${count} arguments were expected, got ${args.length} instead`
    );
  }
}
function assertArgsMinCount(args, count) {
  if (args.length < count) {
    throw new Error(
      `At least ${count} arguments were expected, got ${args.length} instead`
    );
  }
}
function assertArgsMaxCount(args, count) {
  if (args.length > count) {
    throw new Error(
      `At most ${count} arguments were expected, got ${args.length} instead`
    );
  }
}
function assertArgsEven(args) {
  if (args.length % 2 !== 0) {
    throw new Error(
      `An even amount of arguments was expected, got ${args} instead`
    );
  }
}
function assertArgsOdd(args) {
  if (args.length % 2 === 0) {
    throw new Error(
      `An odd amount of arguments was expected, got ${args} instead`
    );
  }
}
function assertUniqueInferredType(args, types) {
  if (!isTypeUnique(types)) {
    throw new Error(
      `Could not infer only one type from the following expression: ${JSON.stringify(
        args
      )}`
    );
  }
}

Operators['get'] = {
  getReturnType: function (args) {
    return ValueTypes.ANY;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 1);
    assertString(args[0]);
    const value = args[0].toString();
    if (context.attributes.indexOf(value) === -1) {
      context.attributes.push(value);
    }
    const prefix = context.inFragmentShader ? 'v_' : 'a_';
    return prefix + value;
  },
};

/**
 * Get the uniform name given a variable name.
 * @param {string} variableName The variable name.
 * @return {string} The uniform name.
 */
export function uniformNameForVariable(variableName) {
  return 'u_var_' + variableName;
}

Operators['var'] = {
  getReturnType: function (args) {
    return ValueTypes.ANY;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 1);
    assertString(args[0]);
    const value = args[0].toString();
    if (context.variables.indexOf(value) === -1) {
      context.variables.push(value);
    }
    return uniformNameForVariable(value);
  },
};

Operators['band'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 1);
    const band = args[0];
    if (typeof band !== 'number') {
      throw new Error('Band index must be a number');
    }
    const zeroBasedBand = band - 1;
    const colorIndex = Math.floor(zeroBasedBand / 4);
    let bandIndex = zeroBasedBand % 4;
    if (band === context.bandCount && bandIndex === 1) {
      // LUMINANCE_ALPHA - band 1 assigned to rgb and band 2 assigned to alpha
      bandIndex = 3;
    }
    return `color${colorIndex}[${bandIndex}]`;
  },
};

Operators['time'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 0);
    return 'u_time';
  },
};

Operators['zoom'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 0);
    return 'u_zoom';
  },
};

Operators['resolution'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 0);
    return 'u_resolution';
  },
};

Operators['*'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} * ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['/'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} / ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['+'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} + ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['-'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} - ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['clamp'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 3);
    assertNumbers(args);
    const min = expressionToGlsl(context, args[1]);
    const max = expressionToGlsl(context, args[2]);
    return `clamp(${expressionToGlsl(context, args[0])}, ${min}, ${max})`;
  },
};

Operators['%'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `mod(${expressionToGlsl(context, args[0])}, ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['^'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `pow(${expressionToGlsl(context, args[0])}, ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['>'] = {
  getReturnType: function (args) {
    return ValueTypes.BOOLEAN;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} > ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['>='] = {
  getReturnType: function (args) {
    return ValueTypes.BOOLEAN;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} >= ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['<'] = {
  getReturnType: function (args) {
    return ValueTypes.BOOLEAN;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} < ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

Operators['<='] = {
  getReturnType: function (args) {
    return ValueTypes.BOOLEAN;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 2);
    assertNumbers(args);
    return `(${expressionToGlsl(context, args[0])} <= ${expressionToGlsl(
      context,
      args[1]
    )})`;
  },
};

function getEqualOperator(operator) {
  return {
    getReturnType: function (args) {
      return ValueTypes.BOOLEAN;
    },
    toGlsl: function (context, args) {
      assertArgsCount(args, 2);

      // find common type
      let type = ValueTypes.ANY;
      for (let i = 0; i < args.length; i++) {
        type = type & getValueType(args[i]);
      }
      if (type === 0) {
        throw new Error(
          `All arguments should be of compatible type, got ${JSON.stringify(
            args
          )} instead`
        );
      }

      return `(${expressionToGlsl(
        context,
        args[0],
        type
      )} ${operator} ${expressionToGlsl(context, args[1], type)})`;
    },
  };
}

Operators['=='] = getEqualOperator('==');

Operators['!='] = getEqualOperator('!=');

Operators['!'] = {
  getReturnType: function (args) {
    return ValueTypes.BOOLEAN;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 1);
    assertBoolean(args[0]);
    return `(!${expressionToGlsl(context, args[0])})`;
  },
};

function getDecisionOperator(operator) {
  return {
    getReturnType: function (args) {
      return ValueTypes.BOOLEAN;
    },
    toGlsl: function (context, args) {
      assertArgsMinCount(args, 2);
      for (let i = 0; i < args.length; i++) {
        assertBoolean(args[i]);
      }
      let result = '';
      result = args
        .map((arg) => expressionToGlsl(context, arg))
        .join(` ${operator} `);
      result = `(${result})`;
      return result;
    },
  };
}

Operators['all'] = getDecisionOperator('&&');

Operators['any'] = getDecisionOperator('||');

Operators['between'] = {
  getReturnType: function (args) {
    return ValueTypes.BOOLEAN;
  },
  toGlsl: function (context, args) {
    assertArgsCount(args, 3);
    assertNumbers(args);
    const min = expressionToGlsl(context, args[1]);
    const max = expressionToGlsl(context, args[2]);
    const value = expressionToGlsl(context, args[0]);
    return `(${value} >= ${min} && ${value} <= ${max})`;
  },
};

Operators['array'] = {
  getReturnType: function (args) {
    return ValueTypes.NUMBER_ARRAY;
  },
  toGlsl: function (context, args) {
    assertArgsMinCount(args, 2);
    assertArgsMaxCount(args, 4);
    assertNumbers(args);
    const parsedArgs = args.map(function (val) {
      return expressionToGlsl(context, val, ValueTypes.NUMBER);
    });
    return `vec${args.length}(${parsedArgs.join(', ')})`;
  },
};

Operators['color'] = {
  getReturnType: function (args) {
    return ValueTypes.COLOR;
  },
  toGlsl: function (context, args) {
    assertArgsMinCount(args, 3);
    assertArgsMaxCount(args, 4);
    assertNumbers(args);
    const array = /** @type {Array<number>} */ (args);
    if (args.length === 3) {
      array.push(1);
    }
    const parsedArgs = args.map(function (val, i) {
      return (
        expressionToGlsl(context, val, ValueTypes.NUMBER) +
        (i < 3 ? ' / 255.0' : '')
      );
    });
    return `vec${args.length}(${parsedArgs.join(', ')})`;
  },
};

Operators['interpolate'] = {
  getReturnType: function (args) {
    let type = ValueTypes.COLOR | ValueTypes.NUMBER;
    for (let i = 3; i < args.length; i += 2) {
      type = type & getValueType(args[i]);
    }
    return type;
  },
  toGlsl: function (context, args, opt_typeHint) {
    assertArgsEven(args);
    assertArgsMinCount(args, 6);

    // validate interpolation type
    const type = args[0];
    let interpolation;
    switch (type[0]) {
      case 'linear':
        interpolation = 1;
        break;
      case 'exponential':
        interpolation = type[1];
        break;
      default:
        interpolation = null;
    }
    if (!interpolation) {
      throw new Error(
        `Invalid interpolation type for "interpolate" operator, received: ${JSON.stringify(
          type
        )}`
      );
    }

    // compute input/output types
    const typeHint = opt_typeHint !== undefined ? opt_typeHint : ValueTypes.ANY;
    const outputType = Operators['interpolate'].getReturnType(args) & typeHint;
    assertUniqueInferredType(args, outputType);

    const input = expressionToGlsl(context, args[1]);
    const exponent = numberToGlsl(interpolation);

    let result = '';
    for (let i = 2; i < args.length - 2; i += 2) {
      const stop1 = expressionToGlsl(context, args[i]);
      const output1 =
        result || expressionToGlsl(context, args[i + 1], outputType);
      const stop2 = expressionToGlsl(context, args[i + 2]);
      const output2 = expressionToGlsl(context, args[i + 3], outputType);
      result = `mix(${output1}, ${output2}, pow(clamp((${input} - ${stop1}) / (${stop2} - ${stop1}), 0.0, 1.0), ${exponent}))`;
    }
    return result;
  },
};

Operators['match'] = {
  getReturnType: function (args) {
    let type = ValueTypes.ANY;
    for (let i = 2; i < args.length; i += 2) {
      type = type & getValueType(args[i]);
    }
    type = type & getValueType(args[args.length - 1]);
    return type;
  },
  toGlsl: function (context, args, opt_typeHint) {
    assertArgsEven(args);
    assertArgsMinCount(args, 4);

    const typeHint = opt_typeHint !== undefined ? opt_typeHint : ValueTypes.ANY;
    const outputType = Operators['match'].getReturnType(args) & typeHint;
    assertUniqueInferredType(args, outputType);

    const input = expressionToGlsl(context, args[0]);
    const fallback = expressionToGlsl(
      context,
      args[args.length - 1],
      outputType
    );
    let result = null;
    for (let i = args.length - 3; i >= 1; i -= 2) {
      const match = expressionToGlsl(context, args[i]);
      const output = expressionToGlsl(context, args[i + 1], outputType);
      result = `(${input} == ${match} ? ${output} : ${result || fallback})`;
    }
    return result;
  },
};

Operators['case'] = {
  getReturnType: function (args) {
    let type = ValueTypes.ANY;
    for (let i = 1; i < args.length; i += 2) {
      type = type & getValueType(args[i]);
    }
    type = type & getValueType(args[args.length - 1]);
    return type;
  },
  toGlsl: function (context, args, opt_typeHint) {
    assertArgsOdd(args);
    assertArgsMinCount(args, 3);

    const typeHint = opt_typeHint !== undefined ? opt_typeHint : ValueTypes.ANY;
    const outputType = Operators['case'].getReturnType(args) & typeHint;
    assertUniqueInferredType(args, outputType);
    for (let i = 0; i < args.length - 1; i += 2) {
      assertBoolean(args[i]);
    }

    const fallback = expressionToGlsl(
      context,
      args[args.length - 1],
      outputType
    );
    let result = null;
    for (let i = args.length - 3; i >= 0; i -= 2) {
      const condition = expressionToGlsl(context, args[i]);
      const output = expressionToGlsl(context, args[i + 1], outputType);
      result = `(${condition} ? ${output} : ${result || fallback})`;
    }
    return result;
  },
};
