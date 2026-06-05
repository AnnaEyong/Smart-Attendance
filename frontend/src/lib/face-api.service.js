const FACE_API_MODEL_URL =
  process.env.NEXT_PUBLIC_FACE_API_MODEL_URL ||
  "/models/face-api";

const FACE_MATCH_ENGINE = process.env.NEXT_PUBLIC_FACE_MATCH_ENGINE || "auto";

let faceApiModulePromise;
let modelsLoadedPromise;

const toFixedDescriptor = (values) => values.map((value) => Number(value.toFixed(8)));

const getFaceApiModule = async () => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("face-api.js");
  }

  return faceApiModulePromise;
};

const ensureModelsLoaded = async () => {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      const faceapi = await getFaceApiModule();

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_URL),
      ]);

      return faceapi;
    })();
  }

  return modelsLoadedPromise;
};

const createImageFromDataUrl = (imageDataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Invalid image captured from camera."));
    image.src = imageDataUrl;
  });

export const isFaceApiEnabled = () => FACE_MATCH_ENGINE !== "custom";

export const preloadFaceApiModels = async () => {
  if (!isFaceApiEnabled()) {
    return false;
  }

  try {
    await ensureModelsLoaded();
    return true;
  } catch {
    return false;
  }
};

export const extractFaceApiDescriptor = async (imageDataUrl) => {
  if (!isFaceApiEnabled()) {
    return null;
  }

  try {
    const faceapi = await ensureModelsLoaded();
    const image = await createImageFromDataUrl(imageDataUrl);

    const detection = await faceapi
      .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection?.descriptor) {
      return null;
    }

    return toFixedDescriptor(Array.from(detection.descriptor));
  } catch {
    return null;
  }
};
