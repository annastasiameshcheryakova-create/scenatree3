import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

const CONFIG = {
  "angel-comb": {
    title: "Angel Comb · фото янгола",
    mind: "./targets/angel-comb.mind",
    mainTexture: "./assets/textures/angel-photo.png",
    targetLabel: "angel-comb"
  },
  "mic": {
    title: "Mic · котик біля мікрофона",
    mind: "./targets/mic.mind",
    mainTexture: "./assets/textures/mic-cat.png",
    targetLabel: "mic"
  },
  "pixel-cats": {
    title: "Pixel Cats · друга картинка",
    mind: "./targets/pixel-cats.mind",
    mainTexture: "./assets/textures/sleeping-girl.png",
    targetLabel: "pixel-cats"
  }
};

const marker = new URLSearchParams(window.location.search).get("marker") || "angel-comb";
const current = CONFIG[marker] || CONFIG["angel-comb"];

document.getElementById("sceneTitle").textContent = current.title;
document.getElementById("previewLink").href = `camera.html?marker=${marker}`;

const start = async () => {
  const mindarThree = new MindARThree({
    container: document.querySelector("#container"),
    imageTargetSrc: current.mind,
    uiScanning: true,
    uiLoading: true,
    uiError: true,
    filterMinCF: 0.0001,
    filterBeta: 0.01,
  });

  const { renderer, scene, camera } = mindarThree;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.5);
  scene.add(light);

  const textureLoader = new THREE.TextureLoader();
  const [mainTexture, githubTexture, webTexture] = await Promise.all([
    textureLoader.loadAsync(current.mainTexture),
    textureLoader.loadAsync("./assets/textures/github-texture.jpg"),
    textureLoader.loadAsync("./assets/textures/web-texture.png"),
  ]);

  [mainTexture, githubTexture, webTexture].forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });

  const anchor = mindarThree.addAnchor(0);

  // Object A: movement (plane with main image)
  const planeGeometry = new THREE.PlaneGeometry(1.05, 0.7);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: mainTexture,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.set(0, 0.2, 0);
  anchor.group.add(plane);

  // Object B: rotation (box with GitHub texture)
  const boxGeometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const boxMaterial = new THREE.MeshBasicMaterial({ map: githubTexture });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(-0.48, -0.12, 0.06);
  anchor.group.add(box);

  // Object C: scaling (sphere with web texture)
  const sphereGeometry = new THREE.SphereGeometry(0.17, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ map: webTexture });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0.48, -0.02, 0.06);
  anchor.group.add(sphere);

  // Extra layout element: ring base for cleaner composition
  const ringGeometry = new THREE.TorusGeometry(0.58, 0.025, 16, 60);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.22;
  anchor.group.add(ring);

  const clock = new THREE.Clock();

  await mindarThree.start();

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();

    // a) movement
    plane.position.y = 0.2 + Math.sin(t * 1.5) * 0.08;
    plane.rotation.z = Math.sin(t * 0.9) * 0.08;

    // b) rotation
    box.rotation.x += 0.02;
    box.rotation.y += 0.03;

    // c) scaling
    const s = 1 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.2));
    sphere.scale.set(s, s, s);

    ring.rotation.z += 0.01;

    renderer.render(scene, camera);
  });

  window.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      mindarThree.stop();
      renderer.setAnimationLoop(null);
    }
  });
};

start().catch((error) => {
  console.error(error);
  document.getElementById("sceneTitle").textContent = "Не вдалося запустити AR. Перевірте .mind файл у папці /targets.";
});
