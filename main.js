import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const container = document.getElementById("container");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const errorText = document.getElementById("errorText");
const statusText = document.getElementById("status");
const markerStatusText = document.getElementById("markerStatus");

let mindarThree = null;
let renderer = null;
let scene = null;
let camera = null;

let anchor0 = null;
let anchor1 = null;
let anchor2 = null;

let micBox = null;
let angelPlane = null;
let catsSphere = null;

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
  return url;
}

async function findExistingFile(paths) {
  for (const path of paths) {
    try {
      await checkFile(path);
      return path;
    } catch (_) {}
  }
  throw new Error(`Не знайдено жоден файл із варіантів: ${paths.join(", ")}`);
}

async function loadTexture(path) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, resolve, undefined, reject);
  });
}

async function initMindAR() {
  const mindPath = "./targets/multi.mind";
  const angelPath = "./assets/textures/angel-photo.png";
  const githubPath = await findExistingFile([
    "./assets/textures/github-texture.jpg",
    "./assets/textures/github-texture.png",
  ]);
  const webPath = await findExistingFile([
    "./assets/textures/web-texture.jpg",
    "./assets/textures/web-texture.png",
  ]);

  await checkFile(mindPath);
  await checkFile(angelPath);

  mindarThree = new MindARThree({
    container: container,
    imageTargetSrc: mindPath,
    maxTrack: 3,
    uiScanning: true,
    uiLoading: true,
    uiError: true,
    filterMinCF: 0.0001,
    filterBeta: 0.01,
  });

  ({ renderer, scene, camera } = mindarThree);

  anchor0 = mindarThree.addAnchor(0); // mic.png
  anchor1 = mindarThree.addAnchor(1); // angel-comb.png
  anchor2 = mindarThree.addAnchor(2); // pixel-cats.png

  const angelTexture = await loadTexture(angelPath);
  const githubTexture = await loadTexture(githubPath);
  const webTexture = await loadTexture(webPath);

  // Маркер 0 — мікрофон
  const micMaterial = new THREE.MeshBasicMaterial({ map: githubTexture });
  micBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    [micMaterial, micMaterial, micMaterial, micMaterial, micMaterial, micMaterial]
  );
  micBox.position.set(0, 0.2, 0);
  anchor0.group.add(micBox);
  anchor0.group.visible = false;

  // Маркер 1 — ангельська розчіска
  const angelMaterial = new THREE.MeshBasicMaterial({
    map: angelTexture,
    transparent: true,
    side: THREE.DoubleSide,
  });
  angelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    angelMaterial
  );
  angelPlane.position.set(0, 0.25, 0);
  anchor1.group.add(angelPlane);
  anchor1.group.visible = false;

  // Маркер 2 — піксельні котики
  const catsMaterial = new THREE.MeshBasicMaterial({ map: webTexture });
  catsSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 32),
    catsMaterial
  );
  catsSphere.position.set(0, 0.3, 0);
  anchor2.group.add(catsSphere);
  anchor2.group.visible = false;

  anchor0.onTargetFound = () => {
    setMarkerStatus("знайдено: мікрофон ✅");
    anchor0.group.visible = true;
  };

  anchor0.onTargetLost = () => {
    anchor0.group.visible = false;
    setMarkerStatus("маркер мікрофона втрачено");
  };

  anchor1.onTargetFound = () => {
    setMarkerStatus("знайдено: ангельська розчіска ✅");
    anchor1.group.visible = true;
  };

  anchor1.onTargetLost = () => {
    anchor1.group.visible = false;
    setMarkerStatus("маркер розчіски втрачено");
  };

  anchor2.onTargetFound = () => {
    setMarkerStatus("знайдено: піксельні котики ✅");
    anchor2.group.visible = true;
  };

  anchor2.onTargetLost = () => {
    anchor2.group.visible = false;
    setMarkerStatus("маркер котиків втрачено");
  };
}

async function startARFlow() {
  try {
    startBtn.disabled = true;
    errorText.textContent = "";
    setStatus("запуск AR...");

    await initMindAR();
    await mindarThree.start();

    overlay.classList.add("hidden");
    setStatus("AR активний, наведи камеру на один із 3 маркерів");

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();

      if (micBox && anchor0.group.visible) {
        micBox.rotation.x += 0.02;
        micBox.rotation.y += 0.03;
      }

      if (angelPlane && anchor1.group.visible) {
        angelPlane.position.y = 0.25 + Math.sin(t * 2.0) * 0.12;
      }

      if (catsSphere && anchor2.group.visible) {
        const s = 1 + Math.sin(t * 3.0) * 0.25;
        catsSphere.scale.set(s, s, s);
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
    } else if (msg.includes("multi.mind")) {
      errorText.textContent = "Не знайдено файл multi.mind у папці targets.";
    } else if (msg.includes("angel-photo")) {
      errorText.textContent = "Не знайдено фото янгола.";
    } else if (msg.includes("github-texture")) {
      errorText.textContent = "Не знайдено texture для мікрофона.";
    } else if (msg.includes("web-texture") || msg.includes("жоден файл із варіантів")) {
      errorText.textContent = "Не знайдено texture для піксельних котиків.";
    } else {
      errorText.textContent = "Не вдалося запустити AR.";
    }

    setStatus("помилка запуску");
  }
}

startBtn.addEventListener("click", startARFlow);
