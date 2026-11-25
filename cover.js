const cover = document.querySelector('.hero-band');
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const mobileLayout = matchMedia('(max-width: 760px)');

const vertexSource = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * vec2(0.5, -0.5) + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D fabric;
  uniform vec2 size;
  uniform vec4 imageBounds;
  uniform vec2 touchPoint;
  uniform vec2 previousPoint;
  uniform vec2 direction;
  uniform float strength;
  uniform float time;

  float fold(vec2 p, vec2 center, float phase) {
    vec2 offset = p - center;
    vec2 crosswise = vec2(-direction.y, direction.x);
    float along = dot(offset, direction);
    float across = dot(offset, crosswise);
    float radialDistance = length(offset);
    float ring = exp(-pow(radialDistance / 128.0, 2.0)) *
      sin(radialDistance * 0.040 - phase);

    // Two wave fronts travel away from the contact along the movement axis.
    vec2 spread = vec2(along / 230.0, across / 76.0);
    float reach = exp(-dot(spread, spread));
    float forward = smoothstep(-36.0, 64.0, along) * sin(along * 0.037 + across * 0.012 - phase);
    float backward = smoothstep(-36.0, 64.0, -along) * sin(-along * 0.037 + across * 0.012 - phase + 0.8);
    return 0.27 * ring + 0.73 * reach * (forward + 0.72 * backward);
  }

  float surface(vec2 p) {
    return strength * (
      fold(p, touchPoint, time * 4.0) +
      0.32 * fold(p, previousPoint, time * 3.8 + 1.5)
    );
  }

  void main() {
    vec2 p = uv * size;
    float height = surface(p);
    vec2 slope = vec2(surface(p + vec2(4.0, 0.0)), surface(p + vec2(0.0, 4.0))) - height;
    vec2 warped = p + vec2(height * 5.0, height * 9.0) + slope * 16.0;
    vec2 imageUV = (warped - imageBounds.xy) / imageBounds.zw;
    float inside = smoothstep(-0.005, 0.002, imageUV.x) *
      smoothstep(-0.005, 0.002, imageUV.y) *
      (1.0 - smoothstep(0.998, 1.005, imageUV.y));
    vec3 silk = texture2D(fabric, clamp(imageUV, 0.0, 1.0)).rgb;
    float light = dot(slope, vec2(-1.65, -2.1));
    silk = silk * (1.0 + light * 0.52) + vec3(1.0, 0.68, 0.63) * max(light, 0.0) * 0.12;
    gl_FragColor = vec4(mix(vec3(0.1882, 0.0745, 0.1294), silk, inside), 1.0);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function createRenderer(image) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {alpha: false, antialias: false});
  if (!gl) return null;
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uniforms = Object.fromEntries(
    ['size', 'imageBounds', 'touchPoint', 'previousPoint', 'direction', 'strength', 'time']
      .map(name => [name, gl.getUniformLocation(program, name)])
  );

  canvas.className = 'fabric-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  cover.prepend(canvas);

  return {
    canvas,
    draw(width, height, point, trail, direction, strength, time) {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1600 / width);
      const pixelWidth = Math.round(width * scale);
      const pixelHeight = Math.round(height * scale);
      if (!pixelWidth || !pixelHeight) return;
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const ratio = image.naturalWidth / image.naturalHeight;
      const mobile = mobileLayout.matches;
      const imageWidth = mobile ? Math.max(width, height * ratio) : Math.min(innerWidth * 0.78, 1160);
      const imageHeight = imageWidth / ratio;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.uniform2f(uniforms.size, width, height);
      gl.uniform4f(uniforms.imageBounds,
        (width - imageWidth) * (mobile ? 0.5 : 1),
        (height - imageHeight) * (mobile ? 0.5 : 0.44),
        imageWidth, imageHeight);
      gl.uniform2f(uniforms.touchPoint, point.x, point.y);
      gl.uniform2f(uniforms.previousPoint, trail.x, trail.y);
      gl.uniform2f(uniforms.direction, direction.x, direction.y);
      gl.uniform1f(uniforms.strength, strength);
      gl.uniform1f(uniforms.time, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}

const silk = new Image();
silk.onload = () => {
  const renderer = createRenderer(silk);
  if (renderer) attachInteraction(renderer);
};
silk.src = 'silk.jpg';

function attachInteraction(renderer) {
  const {canvas} = renderer;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let strength = 0;
  let target = null;
  let point = null;
  let trail = null;
  let lastContact = 0;
  let angle = -Math.PI / 6;
  let targetAngle = angle;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    elapsed = 0;
    strength = 0;
    target = point = trail = null;
    canvas.hidden = true;
  }

  function animate(now) {
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    elapsed += dt;
    const active = target && now - lastContact < 1600;
    strength += ((active ? 1 : 0) - strength) * (1 - Math.exp(-dt * (active ? 9 : 4)));
    if (!active && strength < 0.008) {
      stop();
      return;
    }

    if (active) {
      const follow = 1 - Math.exp(-dt * 17);
      point.x += (target.x - point.x) * follow;
      point.y += (target.y - point.y) * follow;
    }
    const settle = 1 - Math.exp(-dt * 5);
    trail.x += (point.x - trail.x) * settle;
    trail.y += (point.y - trail.y) * settle;

    const turn = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
    angle += turn * (1 - Math.exp(-dt * 10));
    const direction = {x: Math.cos(angle), y: Math.sin(angle)};
    const {width, height} = cover.getBoundingClientRect();
    renderer.draw(width, height, point, trail, direction, strength, elapsed);
    canvas.hidden = false;
    frame = requestAnimationFrame(animate);
  }

  function touchFabric(event) {
    if (!motion.matches || event.target.closest('a, button')) return;
    const bounds = cover.getBoundingClientRect();
    const next = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
    if (target) {
      const dx = next.x - target.x;
      const dy = next.y - target.y;
      if (Math.hypot(dx, dy) > 1) targetAngle = Math.atan2(dy, dx);
    }
    target = next;
    lastContact = performance.now();
    if (frame) return;
    point = {...target};
    trail = {...target};
    frame = requestAnimationFrame(animate);
  }

  function releaseFabric() {
    target = null;
  }

  cover.addEventListener('pointermove', touchFabric);
  cover.addEventListener('pointerdown', touchFabric);
  cover.addEventListener('pointerleave', releaseFabric);
  cover.addEventListener('pointercancel', releaseFabric);
  cover.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') releaseFabric();
  });
  motion.addEventListener('change', stop);
  canvas.addEventListener('webglcontextlost', stop);
}
