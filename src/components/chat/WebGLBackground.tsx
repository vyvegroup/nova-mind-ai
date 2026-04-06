'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ============================================
// NovaMind AI - WebGL 2.0 Animated Background
// Soft, floating, dark gradient mesh with
// drifting light orbs. GLSL ES 3.0 shaders.
// ============================================

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_orb1;
uniform vec3 u_orb2;
uniform vec3 u_orb3;
uniform vec3 u_orb4;

// ---- Simplex 3D Noise (Ashima Arts) ----
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Smooth glow contribution from a light orb
float orbGlow(vec2 uv, vec2 center, float radius, float softness) {
  float d = length(uv - center);
  return exp(-d * d / (radius * radius * softness));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 uvA = uv * aspect;

  float t = u_time * 0.15;

  // Layered simplex noise for flowing dark gradients
  float n1 = snoise(vec3(uvA * 1.5 + vec2(t * 0.3, t * 0.2), t * 0.1)) * 0.5 + 0.5;
  float n2 = snoise(vec3(uvA * 3.0 - vec2(t * 0.15, t * 0.25), t * 0.08 + 100.0)) * 0.5 + 0.5;
  float n3 = snoise(vec3(uvA * 0.8 + vec2(t * 0.1, -t * 0.15), t * 0.05 + 200.0)) * 0.5 + 0.5;
  float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

  // Base deep dark color with subtle purple undertone
  vec3 baseColor = vec3(0.04, 0.02, 0.08);

  // Gradient color palette: deep purple, dark blue, dark pink
  vec3 col1 = vec3(0.18, 0.05, 0.35); // Deep purple
  vec3 col2 = vec3(0.05, 0.08, 0.30); // Dark blue
  vec3 col3 = vec3(0.25, 0.04, 0.20); // Dark pink/magenta
  vec3 col4 = vec3(0.08, 0.15, 0.30); // Dark teal-blue

  // Mix gradient based on noise
  vec3 gradient = mix(col1, col2, smoothstep(0.3, 0.7, uv.x + noise * 0.3));
  gradient = mix(gradient, col3, smoothstep(0.2, 0.8, uv.y + n1 * 0.2));
  gradient = mix(gradient, col4, smoothstep(0.4, 0.9, noise));

  // Light orbs with glow
  float glow1 = orbGlow(uvA, u_orb1.xy, u_orb1.z, 0.5);
  float glow2 = orbGlow(uvA, u_orb2.xy, u_orb2.z, 0.5);
  float glow3 = orbGlow(uvA, u_orb3.xy, u_orb3.z, 0.5);
  float glow4 = orbGlow(uvA, u_orb4.xy, u_orb4.z, 0.5);

  // Orb colors with gentle tints
  vec3 orbCol1 = vec3(0.3, 0.1, 0.6);   // Violet
  vec3 orbCol2 = vec3(0.1, 0.2, 0.7);   // Blue
  vec3 orbCol3 = vec3(0.6, 0.1, 0.4);   // Pink
  vec3 orbCol4 = vec3(0.2, 0.3, 0.6);   // Indigo

  // Combine
  vec3 color = baseColor + gradient * 0.3;
  color += orbCol1 * glow1 * 0.4;
  color += orbCol2 * glow2 * 0.3;
  color += orbCol3 * glow3 * 0.35;
  color += orbCol4 * glow4 * 0.3;

  // Subtle vignette
  float vignette = 1.0 - smoothstep(0.3, 1.1, length(uv - 0.5) * 1.4);
  color *= vignette;

  // Overall opacity control for text readability
  float alpha = 0.18 + noise * 0.04;

  fragColor = vec4(color, alpha);
}
`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram | null {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// Smooth drift positions for orbs
function driftOrb(time: number, offsetX: number, offsetY: number, speed: number, range: number): [number, number, number] {
  const x = 0.5 + Math.sin(time * speed + offsetX) * range * 0.4 + Math.cos(time * speed * 0.7 + offsetY) * range * 0.2;
  const y = 0.5 + Math.cos(time * speed * 0.8 + offsetY) * range * 0.35 + Math.sin(time * speed * 0.5 + offsetX) * range * 0.15;
  const radius = 0.15 + Math.sin(time * speed * 0.3 + offsetX * 2) * 0.05;
  return [x, y, radius];
}

export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const reducedMotionRef = useRef<boolean>(false);

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion preference
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL 2.0 not available');
      return;
    }

    glRef.current = gl;

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return;
    programRef.current = program;

    // Full-screen quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    startTimeRef.current = performance.now() / 1000;

    // Render loop
    function render() {
      if (!gl || !program) return;

      const time = performance.now() / 1000 - startTimeRef.current;
      const elapsed = reducedMotionRef.current ? 0 : time;

      // Resize canvas
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);

      gl.useProgram(program);

      // Set uniforms
      const timeLoc = gl.getUniformLocation(program, 'u_time');
      const resLoc = gl.getUniformLocation(program, 'u_resolution');
      const orb1Loc = gl.getUniformLocation(program, 'u_orb1');
      const orb2Loc = gl.getUniformLocation(program, 'u_orb2');
      const orb3Loc = gl.getUniformLocation(program, 'u_orb3');
      const orb4Loc = gl.getUniformLocation(program, 'u_orb4');

      gl.uniform1f(timeLoc, elapsed);
      gl.uniform2f(resLoc, w, h);

      const aspect = w / h;
      const orb1 = driftOrb(elapsed, 0.0, 0.0, 0.12, 1.0);
      const orb2 = driftOrb(elapsed, 1.5, 2.0, 0.09, 0.8);
      const orb3 = driftOrb(elapsed, 3.0, 1.0, 0.1, 0.9);
      const orb4 = driftOrb(elapsed, 4.5, 3.0, 0.08, 0.7);

      gl.uniform3f(orb1Loc, orb1[0] * aspect, orb1[1], orb1[2]);
      gl.uniform3f(orb2Loc, orb2[0] * aspect, orb2[1], orb2[2]);
      gl.uniform3f(orb3Loc, orb3[0] * aspect, orb3[1], orb3[2]);
      gl.uniform3f(orb4Loc, orb4[0] * aspect, orb4[1], orb4[2]);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    initGL();

    // Listen for reduced motion changes
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', handleMotionChange);

    return () => {
      cancelAnimationFrame(rafRef.current);
      mql.removeEventListener('change', handleMotionChange);
      if (glRef.current) {
        const ext = glRef.current.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    };
  }, [initGL]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 w-full h-full"
      style={{
        pointerEvents: 'none',
        opacity: reducedMotionRef.current ? 0.12 : 0.18,
      }}
    />
  );
}
