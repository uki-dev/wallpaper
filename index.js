const width = 512;
const length = 512;

const vertexShader = `
uniform float time;

uniform sampler2D map;
uniform float height;

uniform float amplitude;
uniform float speed;
uniform float frequency;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = smoothstep(0.,1.,f);

  return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec3 sample = texture2D(map, position.xz + 0.5).rgb;
  // https://docs.mapbox.com/data/tilesets/guides/access-elevation-data/#decode-data
  // TODO: Calculate this in normalised range to save precision?
  vec3 elevation = vec3(0.0, -10000.0 + ((sample.r * 256.0 * 256.0 * 256.0 + sample.g * 256.0 * 256.0 + sample.b * 256.0) * 0.1), 0.0) / 10000.0 * height;
  vec3 offset = vec3(0.0, noise(position.xz * frequency + time * speed) * amplitude, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + elevation + offset, 1.0);
}
`;

const fragmentShader = `
uniform vec3 color;
uniform float opacity;

void main() {
  gl_FragColor = vec4(color, opacity);
}
`;

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight, true);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.5, -0.5);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.castShadow = true;
light.position.set(0, 1, 0);
scene.add(light);

const url = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/11/2022/1278@2x.pngraw?access_token=pk.eyJ1IjoiamFzcGVyLWRpc3BsYXlzd2VldCIsImEiOiJjazdjcW0wcGowMGsyM2RvN3podHI2cGQ2In0.t_FZQynPrAjVi-W5yRJjtg';
const map = new THREE.TextureLoader().load(url);
map.flipY = false;

const geometry = new THREE.BufferGeometry();

const vertices = [];
for (let z = 0; z < length; z++) {
  for (let x = 0; x < width; x++) {
    vertices.push(x / (width - 1) - 0.5, 0, z / (length - 1) - 0.5);
  }
}

const indices = []
for (let z = 0; z < length - 1; z++) {
  for (let x = 0; x < width - 1; x++) {
    const a = x + z * width;
    const b = x + (z + 1) * width;
    const c = x + 1 + (z + 1) * width;
    const d = x + 1 + z * width;
    indices.push(b, d);
  }
}

geometry.setIndex(indices);
geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(vertices), 3));

console.log(getComputedStyle(document.documentElement).getPropertyValue('--wireframe-color'));

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    color: { value: '' },
    opacity: { value: 0.12 },
    map: { value: map },
    height: { value: 1 },
    time: { value: 0.0 },
    amplitude: { value: 0.01 },
    frequency: { value: 4 },
    speed: { value: 0.1 },
  },
  transparent: true,
  depthTest: false,
})

const mesh = new THREE.LineSegments(geometry, material);
scene.add(mesh);

const animate = (time = 0) => {
  material.uniforms.time.value = time / 1000;
  material.uniforms.color.value = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--wireframe-color').trim());
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, true);
  renderer.render(scene, camera);
}, false);