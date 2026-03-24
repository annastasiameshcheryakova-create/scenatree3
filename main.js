import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const container = document.getElementById("container");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const errorText = document.getElementById("errorText");
const statusText = document.getElementById("status");
const markerStatusText = document.getElementById("markerStatus");
const cameraPreview = document.getElementById("cameraPreview");

let previewStream = null;
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
}

async function openCameraPreview() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  previewStream = stream;
  cameraPreview.srcObject = stream;
  cameraPreview.style.display = "block";
  await cameraPreview.play();
}

function stopCameraPreview() {
  if (previewStream) {
    previewStream.getTracks().forEach(track => track.stop());
    previewStream = null;
  }
  cameraPreview.pause();
  cameraPreview.srcObject = null;
  cameraPreview.style.display = "none";
}

async function loadTexture(path) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, resolve, undefined, reject);
  });
}

async function initMindAR() {
  await checkFile("./targets/multi.mind");
  await checkFile("./assets/textures/angel-photo.png");
  await checkFile("./assets/textures/github-texture.jpg");
  await checkFile("./assets/textures/web-texture.jpg");

  mindarThree = new MindARThree({
    container: container,
    imageTargetSrc: "./targets/multi.mind",
    maxTrack: 3,
    uiScanning: false,
    uiLoading: false,
    uiError: false
  });

  ({ renderer, scene, camera } = mindarThree);

  anchor0 = mindarThree.addAnchor(0); // mic.png
  anchor1 = mindarThree.addAnchor(1); // angel-comb.png
  anchor2 = mindarThree.addAnchor(2); // pixel-cats.png

  const angelTexture = await loadTexture("./assets/textures/angel-photo.png");
  const githubTexture = await loadTexture("./assets/textures/github-texture.jpg");
  const webTexture = await loadTexture("./assets/textures/web-texture.jpg");

  // Маркер 0 — микрофон
  const micMaterial = new THREE.MeshBasicMaterial({
    map: githubTexture
  });

  micBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    [micMaterial, micMaterial, micMaterial, micMaterial, micMaterial, micMaterial]
  );
  micBox.position.set(0, 0.2, 0);
  anchor0.group.add(micBox);
  anchor0.group.visible = false;

  // Маркер 1 — ангельская расчёска
  const angelMaterial = new THREE.MeshBasicMaterial({
    map: angelTexture,
    transparent: true,
    side: THREE.DoubleSide
  });

  angelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    angelMaterial
  );
  angelPlane.position.set(0, 0.25, 0);
  anchor1.group.add(angelPlane);
  anchor1.group.visible = false;

  // Маркер 2 — пиксельные котики
  const catsMaterial = new THREE.MeshBasicMaterial({
    map: webTexture
  });

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
    setStatus("запит доступу до камери...");

    await openCameraPreview();
    setStatus("камера відкрита");

    await new Promise(resolve => setTimeout(resolve, 800));

    stopCameraPreview();

    setStatus("запуск AR...");
    await initMindAR();
    await mindarThree.start();

    overlay.classList.add("hidden");
    setStatus("AR активний, наведи на один із 3 маркерів");

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();

      // Обертання
      if (micBox && anchor0.group.visible) {
        micBox.rotation.x += 0.02;
        micBox.rotation.y += 0.03;
      }

      // Переміщення
      if (angelPlane && anchor1.group.visible) {
        angelPlane.position.y = 0.25 + Math.sin(t * 2.0) * 0.12;
      }

      // Масштабування
      if (catsSphere && anchor2.group.visible) {
        const s = 1 + Math.sin(t * 3.0) * 0.25;
        catsSphere.scale.set(s, s, s);
      }

      renderer.render(scene, camera);
    });
  } catch (error) {
    console.error(error);
    startBtn.disabled = false;

    const msg = String(error.message || error);

    if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
      errorText.textContent = "Браузер не дав доступ до камери.";
    } else if (msg.includes("multi.mind")) {
      errorText.textContent = "Не знайдено файл multi.mind у папці targets.";
    } else if (msg.includes("angel-photo")) {
      errorText.textContent = "Не знайдено фото янгола.";
    } else if (msg.includes("github-texture")) {
      errorText.textContent = "Не знайдено texture для мікрофона.";
    } else if (msg.includes("web-texture")) {
      errorText.textContent = "Не знайдено texture для піксельних котиків.";
    } else {
      errorText.textContent = "Не вдалося запустити AR.";
    }

    setStatus("помилка запуску");
  }
}

startBtn.addEventListener("click", startARFlow);
