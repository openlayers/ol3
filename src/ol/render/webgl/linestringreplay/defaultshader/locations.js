// This file is automatically generated, do not edit
import _ol_ from '../../../../index';

/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 * @struct
 */
var _ol_render_webgl_linestringreplay_defaultshader_Locations_ = function(gl, program) {

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_projectionMatrix = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_projectionMatrix' : 'h');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_offsetScaleMatrix = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_offsetScaleMatrix' : 'i');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_offsetRotateMatrix = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_offsetRotateMatrix' : 'j');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_lineWidth = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_lineWidth' : 'k');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_miterLimit = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_miterLimit' : 'l');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_opacity = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_opacity' : 'm');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_color = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_color' : 'n');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_size = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_size' : 'o');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_pixelRatio = gl.getUniformLocation(
      program, _ol_.DEBUG_WEBGL ? 'u_pixelRatio' : 'p');

  /**
   * @type {number}
   */
  this.a_lastPos = gl.getAttribLocation(
      program, _ol_.DEBUG_WEBGL ? 'a_lastPos' : 'd');

  /**
   * @type {number}
   */
  this.a_position = gl.getAttribLocation(
      program, _ol_.DEBUG_WEBGL ? 'a_position' : 'e');

  /**
   * @type {number}
   */
  this.a_nextPos = gl.getAttribLocation(
      program, _ol_.DEBUG_WEBGL ? 'a_nextPos' : 'f');

  /**
   * @type {number}
   */
  this.a_direction = gl.getAttribLocation(
      program, _ol_.DEBUG_WEBGL ? 'a_direction' : 'g');
};

export default _ol_render_webgl_linestringreplay_defaultshader_Locations_;
