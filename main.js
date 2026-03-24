import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const container = document.getElementById("container");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const errorText = document.getElementById("errorText");
const statusText = document.getElementById("status");
const markerStatusText = document.getElementById("markerStatus");
const modeLabel = document.getElementById("modeLabel");
const targetDescription = document.getElementById("targetDescription");

let mindarThree = null;
let renderer = null;
let scene = null;
let camera = null;
let anchor = null;
let object3D = null;

const clock = new THREE.Clock();

function setStatus(text) {
  statusText.textContent = text;
}

function setMarkerStatus(text) {
  markerStatusText.textContent = text;
}

async function checkFile(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Не знайдено файл: ${url}`);
  }
}

async function loadTexture(path) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, resolve, undefined, reject);
  });
}

function getTargetConfig() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("target");

  if (target === "mic") {
    return {
      key: "mic",
      label: "мікрофон",
      mind: "./targets/mic.mind",
      texture: "./assets/textures/github-texture.jpg",
      description: "Наведи камеру на маркер мікрофона.",
      createObject: async () => {
        const texture = await loadTexture("./assets/textures/github-texture.jpg");
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.5),
          [material, material, material, material, material, material]
        );
        cube.position.set(0, 0.2, 0);
        return cube;
      },
      animate: (obj) => {
        obj.rotation.x += 0.02;
        obj.rotation.y += 0.03;
      }
    };
  }

  if (target === "angel") {
    return {
      key: "angel",
      label: "ангельська розчіска",
      mind: "./targets/angel-comb.mind",
      texture: "./assets/textures/angel-photo.png",
      description: "Наведи камеру на маркер ангельської розчіски.",
      createObject: async () => {
        const texture = await loadTexture("./assets/textures/angel-photo.png");
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.9, 0.9),
          material
        );
        plane.position.set(0, 0.25, 0);
        return plane;
      },
      animate: (obj, t) => {
        obj.position.y = 0.25 + Math.sin(t * 2.0) * 0.12;
      }
    };
  }

  if (target === "cats") {
    return {
      key: "cats",
      label: "піксельні котики",
      mind: "./targets/pixel-cats.mind",
      texture: "./assets/textures/web-texture.png",
      description: "Наведи камеру на маркер піксельних котиків.",
      createObject: async () => {
        const texture = await loadTexture("./assets/textures/web-texture.png");
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 32, 32),
          material
        );
        sphere.position.set(0, 0.3, 0);
        return sphere;
      },
      animate: (obj, t) => {
        const s = 1 + Math.sin(t * 3.0) * 0.25;
        obj.scale.set(s, s, s);
      }
    };
  }

  return null;
}

async function initMindAR(config) {
  await checkFile(config.mind);
  await checkFile(config.texture);

  mindarThree = new MindARThree({
    container: container,
    imageTargetSrc: config.mind,
    uiScanning: true,
    uiLoading: true,
    uiError: true,
    filterMinCF: 0.0001,
    filterBeta: 0.01
  });

  ({ renderer, scene, camera } = mindarThree);

  anchor = mindarThree.addAnchor(0);
  object3D = await config.createObject();
  anchor.group.add(object3D);
  anchor.group.visible = false;

  anchor.onTargetFound = () => {
    setMarkerStatus(`знайдено: ${config.label} ✅`);
    anchor.group.visible = true;
  };

  anchor.onTargetLost = () => {
    setMarkerStatus(`маркер "${config.label}" втрачено`);
    anchor.group.visible = false;
  };
}

async function startARFlow() {
  const config = getTargetConfig();

  if (!config) {
    errorText.textContent = "Не вибрано target. Використай ?target=mic або angel або cats";
    setStatus("помилка");
    return;
  }

  try {
    startBtn.disabled = true;
    errorText.textContent = "";
    setStatus("запуск AR...");

    await initMindAR(config);
    await mindarThree.start();

    overlay.classList.add("hidden");
    setStatus(`AR активний: ${config.label}`);

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();

      if (object3D && anchor.group.visible) {
        config.animate(object3D, t);
      }

      renderer.render(scene, camera);
    });
  } catch (error) {
    console.error(error);
    startBtn.disabled = false;
    overlay.classList.remove("hidden");

    const msg = String(error.message || error);

    if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
      errorText.textContent = "Браузер не дав доступ до камери.";
    } else if (msg.includes(".mind")) {
      errorText.textContent = "Не знайдено .mind файл маркера.";
    } else if (msg.includes("texture") || msg.includes(".png") || msg.includes(".jpg")) {
      errorText.textContent = "Не знайдено зображення для текстури.";
    } else {
      errorText.textContent = "Не вдалося запустити AR.";
    }

    setStatus("помилка запуску");
  }
}

(function initPage() {
  const config = getTargetConfig();

  if (!config) {
    modeLabel.textContent = "не вибрано";
    targetDescription.textContent = "Відкрий сторінку через index.html і вибери потрібний маркер.";
    return;
  }

  modeLabel.textContent = config.label;
  targetDescription.textContent = `Натисни кнопку, дозволь доступ до камери, а потім наведи камеру на маркер: ${config.label}.`;
})();

startBtn.addEventListener("click", startARFlow);
