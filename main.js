import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const CONFIG = {
  "angel-comb": {
    mind: "targets/angel-comb.mind",
    texture: "assets/textures/angel-photo.png",
  },
  "mic": {
    mind: "targets/mic.mind",
    texture: "assets/textures/github-texture.jpg", // ТИМЧАСОВО
  },
  "pixel-cats": {
    mind: "targets/pixel-cats.mind",
    texture: "assets/textures/web-texture.jpg", // ТИМЧАСОВО
  },
};

const marker = new URLSearchParams(location.search).get("marker") || "angel-comb";
const current = CONFIG[marker];

const start = async () => {
  const mindarThree = new MindARThree({
    container: document.querySelector("#container"),
    imageTargetSrc: current.mind,
  });

  const { renderer, scene, camera } = mindarThree;

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const anchor = mindarThree.addAnchor(0);

  const texture = new THREE.TextureLoader().load(current.texture);

  // 3 геометрії

  // 1 — Plane (переміщення)
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.6),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  plane.position.y = 0.2;
  anchor.group.add(plane);

  // 2 — Box (обертання)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  box.position.x = -0.5;
  anchor.group.add(box);

  // 3 — Sphere (масштаб)
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 32, 32),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  sphere.position.x = 0.5;
  anchor.group.add(sphere);

  await mindarThree.start();

  renderer.setAnimationLoop(() => {
    const t = Date.now() * 0.002;

    // рух
    plane.position.y = 0.2 + Math.sin(t) * 0.1;

    // обертання
    box.rotation.y += 0.03;

    // масштаб
    const s = 1 + Math.sin(t * 2) * 0.3;
    sphere.scale.set(s, s, s);

    renderer.render(scene, camera);
  });
};

start();
