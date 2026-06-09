"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Clock3,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserCheck,
  LogOut,
} from "lucide-react";
import { checkInStudent, checkOutStudent, fetchDailyAttendance, fetchStudents } from "@/lib/api";
import { extractFaceApiDescriptor, preloadFaceApiModels } from "@/lib/face-api.service";

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DESCRIPTOR_SIZE = 128;
const CUSTOM_MATCH_DISTANCE_THRESHOLD = 0.16;
const CUSTOM_MATCH_GAP_THRESHOLD = 0.025;
const FACE_API_MATCH_DISTANCE_THRESHOLD = 0.52;
const FACE_API_MATCH_GAP_THRESHOLD = 0.03;
const MATCH_CONFIRM_WINDOW_MS = 3500;

const findBestCandidateMatch = (capturedDescriptor, candidates, { distanceThreshold, gapThreshold }) => {
  let bestMatch = null;
  let secondBestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = euclideanDistance(capturedDescriptor, candidate.faceDescriptor);
    if (!bestMatch || distance < bestMatch.distance) {
      if (bestMatch) {
        secondBestDistance = bestMatch.distance;
      }

      bestMatch = {
        student: candidate,
        distance,
      };
    } else if (distance < secondBestDistance) {
      secondBestDistance = distance;
    }
  }

  if (!bestMatch || bestMatch.distance > distanceThreshold) {
    return { status: "not-recognized", bestMatch: null };
  }

  if (secondBestDistance - bestMatch.distance < gapThreshold) {
    return { status: "ambiguous", bestMatch: null };
  }

  return { status: "matched", bestMatch };
};

const hasLikelyFaceInFrame = (pixels, width, height) => {
  if (!pixels || !width || !height) {
    return false;
  }

  let sampled = 0;
  let skinLike = 0;
  let luminanceSum = 0;
  let luminanceSqSum = 0;
  const step = 4;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const looksLikeSkin =
        r > 95 &&
        g > 40 &&
        b > 20 &&
        max - min > 15 &&
        Math.abs(r - g) > 15 &&
        r > g &&
        r > b &&
        cb >= 85 &&
        cb <= 135 &&
        cr >= 135 &&
        cr <= 180;

      if (looksLikeSkin) {
        skinLike += 1;
      }

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      luminanceSum += luminance;
      luminanceSqSum += luminance * luminance;
      sampled += 1;
    }
  }

  if (!sampled) {
    return false;
  }

  const skinRatio = skinLike / sampled;
  const mean = luminanceSum / sampled;
  const variance = luminanceSqSum / sampled - mean * mean;

  return skinRatio >= 0.03 && skinRatio <= 0.6 && variance >= 120;
};

const evaluateFrameQuality = (pixels, width, height) => {
  if (!pixels || !width || !height) {
    return { ok: false, reason: "unavailable" };
  }

  let sampled = 0;
  let luminanceSum = 0;
  let luminanceSqSum = 0;
  const step = 4;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      luminanceSum += luminance;
      luminanceSqSum += luminance * luminance;
      sampled += 1;
    }
  }

  if (!sampled) {
    return { ok: false, reason: "unavailable" };
  }

  const mean = luminanceSum / sampled;
  const variance = luminanceSqSum / sampled - mean * mean;

  if (mean < 50) {
    return { ok: false, reason: "too-dark" };
  }

  if (mean > 205) {
    return { ok: false, reason: "too-bright" };
  }

  if (variance < 80) {
    return { ok: false, reason: "low-contrast" };
  }

  return { ok: true, reason: "ok" };
};

const buildFaceDescriptorFromDataUrl = async (imageDataUrl) => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Unable to initialize biometric extractor."));
          return;
        }

        ctx.drawImage(image, 0, 0, size, size);
        const pixels = ctx.getImageData(0, 0, size, size).data;

        const descriptor = Array.from({ length: DESCRIPTOR_SIZE }, () => 0);
        const counts = Array.from({ length: DESCRIPTOR_SIZE }, () => 0);
        const totalPixels = size * size;

        for (let i = 0; i < totalPixels; i += 1) {
          const pixelIndex = i * 4;
          const r = pixels[pixelIndex];
          const g = pixels[pixelIndex + 1];
          const b = pixels[pixelIndex + 2];
          const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          const bucket = Math.min(DESCRIPTOR_SIZE - 1, Math.floor((i / totalPixels) * DESCRIPTOR_SIZE));
          descriptor[bucket] += gray;
          counts[bucket] += 1;
        }

        for (let i = 0; i < DESCRIPTOR_SIZE; i += 1) {
          if (counts[i] > 0) {
            descriptor[i] = descriptor[i] / counts[i];
          }
        }

        const norm = Math.sqrt(descriptor.reduce((sum, value) => sum + value * value, 0));
        const normalized = norm > 0
          ? descriptor.map((value) => Number((value / norm).toFixed(8)))
          : descriptor;

        resolve(normalized);
      } catch {
        reject(new Error("Unable to compute face descriptor from frame."));
      }
    };

    image.onerror = () => reject(new Error("Invalid image captured from camera."));
    image.src = imageDataUrl;
  });
};

const euclideanDistance = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== DESCRIPTOR_SIZE || b.length !== DESCRIPTOR_SIZE) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let i = 0; i < DESCRIPTOR_SIZE; i += 1) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }

  return Math.sqrt(sum);
};

const confidenceFromDistance = (distance, distanceThreshold) => {
  const score = Math.max(0, 1 - distance / distanceThreshold);
  return `${Math.max(60, score * 100).toFixed(1)}%`;
};

const toSortableMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") {
    return -1;
  }

  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return -1;
  }

  return hours * 60 + minutes;
};

const getLatestRecognitionsFromRows = (rows, limit = 3) => {
  const events = [];

  for (const row of rows) {
    const rowEvents = [
      row.checkInTime
        ? {
            id: row.studentId,
            name: row.studentName,
            profileImage: row.profileImage || "",
            className: row.level || row.grade || "N/A",
            mode: "check-in",
            time: row.checkInTime,
            sortValue: toSortableMinutes(row.checkInTime),
          }
        : null,
      row.checkOutTime
        ? {
            id: row.studentId,
            name: row.studentName,
            profileImage: row.profileImage || "",
            className: row.level || row.grade || "N/A",
            mode: "check-out",
            time: row.checkOutTime,
            sortValue: toSortableMinutes(row.checkOutTime),
          }
        : null,
    ].filter(Boolean);

    events.push(...rowEvents);
  }

  return events
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, limit);
};

export default function TakeAttendancePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const lastMatchedStudentRef = useRef({ id: "", at: 0 });
  const pendingMatchRef = useRef({ id: "", at: 0, distance: Number.POSITIVE_INFINITY });
  const successResetTimeoutRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("check-in");

  const [identified, setIdentified] = useState(false);
  const [success, setSuccess] = useState(false);

  const [latestRecognitions, setLatestRecognitions] = useState([]);
  const [studentsWithBiometrics, setStudentsWithBiometrics] = useState([]);
  const [summary, setSummary] = useState({ onTime: 0, absent: 0, late: 0 });

  const todayKey = new Date().toISOString().slice(0, 10);

  const loadRoster = async () => {
    try {
      const response = await fetchStudents();
      const records = Array.isArray(response?.data) ? response.data : [];
      const biometricRows = records.map((student) => ({
        id: student.studentId,
        name: student.fullName,
        profileImage: student.profileImage || "",
        className: student.level || student.grade || "N/A",
        faceDescriptor: Array.isArray(student.faceDescriptor) ? student.faceDescriptor : null,
        faceDescriptorEngine: student.faceDescriptorEngine === "face-api" ? "face-api" : "custom",
      }));
      setStudentsWithBiometrics(biometricRows);
    } catch {
      setStudentsWithBiometrics([]);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetchDailyAttendance(todayKey);
      const summaryData = response?.data?.summary || { onTime: 0, absent: 0, late: 0 };
      const rows = Array.isArray(response?.data?.rows) ? response.data.rows : [];
      const latestThree = getLatestRecognitionsFromRows(rows, 3);

      setSummary(summaryData);
      setLatestRecognitions((current) => {
        if (!latestThree.length) {
          return [];
        }

        return latestThree.map((item, index) => {
          if (index !== 0) {
            return item;
          }

          const currentFirst = current[0];
          const isSameEvent =
            currentFirst &&
            currentFirst.id === item.id &&
            currentFirst.time === item.time &&
            currentFirst.mode === item.mode;

          return isSameEvent ? { ...item, confidence: currentFirst.confidence } : item;
        });
      });
    } catch {
      setSummary({ onTime: 0, absent: 0, late: 0 });
    }
  };

  useEffect(() => {
    loadRoster();
    loadSummary();
  }, []);

  const stopCamera = () => {
    if (successResetTimeoutRef.current) {
      clearTimeout(successResetTimeoutRef.current);
      successResetTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
    setFaceDetected(false);
    setIdentified(false);
    setSuccess(false);
    pendingMatchRef.current = { id: "", at: 0, distance: Number.POSITIVE_INFINITY };
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      setVideoReady(false);
      stopCamera();

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setVideoReady(true);
            preloadFaceApiModels();
          } catch {
            setCameraError("Camera started but preview could not play.");
          }
        };
      }
    } catch {
      setCameraError("Unable to access camera. Please allow camera permission.");
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive || !videoReady) {
      return undefined;
    }

    const scanLoop = async () => {
      if (scanInProgressRef.current) {
        return;
      }

      const now = Date.now();
      const cooldownMs = 8000;
      if (lastMatchedStudentRef.current.id && now - lastMatchedStudentRef.current.at < cooldownMs) {
        return;
      }

      scanInProgressRef.current = true;
      try {
        await captureAttendance();
      } finally {
        scanInProgressRef.current = false;
      }
    };

    const intervalId = setInterval(scanLoop, 2500);
    scanLoop();

    return () => clearInterval(intervalId);
  }, [cameraActive, videoReady, attendanceMode, studentsWithBiometrics]);

  const captureAttendance = async () => {
    if (!videoRef.current || !canvasRef.current || !videoReady || videoRef.current.videoWidth <= 0) {
      return;
    }

    setCameraError("");

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const framePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const frameQuality = evaluateFrameQuality(framePixels, canvas.width, canvas.height);
    if (!frameQuality.ok) {
      setFaceDetected(false);
      setIdentified(false);

      if (frameQuality.reason === "too-dark") {
        setCameraError("Lighting is too low. Please move to a brighter area.");
      } else if (frameQuality.reason === "too-bright") {
        setCameraError("Lighting is too bright. Reduce glare or backlight.");
      } else if (frameQuality.reason === "low-contrast") {
        setCameraError("Image contrast is low. Adjust camera angle or lighting.");
      }

      return;
    }

    const foundFace = hasLikelyFaceInFrame(framePixels, canvas.width, canvas.height);
    setFaceDetected(foundFace);

    if (!foundFace) {
      setIdentified(false);
      setCameraError("");
      return;
    }

    const imageData = canvas.toDataURL("image/jpeg");

    if (!studentsWithBiometrics.length) {
      setCameraError("No students are available for biometric matching.");
      return;
    }

    const candidates = studentsWithBiometrics.filter(
      (student) => Array.isArray(student.faceDescriptor) && student.faceDescriptor.length === DESCRIPTOR_SIZE,
    );

    if (!candidates.length) {
      setCameraError("No enrolled biometric descriptors found. Register students with face data first.");
      return;
    }

    try {
      const faceApiCandidates = candidates.filter((student) => student.faceDescriptorEngine === "face-api");
      const customCandidates = candidates.filter((student) => student.faceDescriptorEngine !== "face-api");

      let engineUsed = "";
      let bestMatch = null;
      let rejectionStatus = "";

      if (faceApiCandidates.length) {
        const faceApiDescriptor = await extractFaceApiDescriptor(imageData);
        if (Array.isArray(faceApiDescriptor) && faceApiDescriptor.length === DESCRIPTOR_SIZE) {
          const faceApiMatch = findBestCandidateMatch(faceApiDescriptor, faceApiCandidates, {
            distanceThreshold: FACE_API_MATCH_DISTANCE_THRESHOLD,
            gapThreshold: FACE_API_MATCH_GAP_THRESHOLD,
          });

          if (faceApiMatch.status === "matched") {
            bestMatch = faceApiMatch.bestMatch;
            engineUsed = "face-api";
          } else {
            rejectionStatus = faceApiMatch.status;
          }
        }
      }

      if (!bestMatch && customCandidates.length) {
        const customDescriptor = await buildFaceDescriptorFromDataUrl(imageData);
        const customMatch = findBestCandidateMatch(customDescriptor, customCandidates, {
          distanceThreshold: CUSTOM_MATCH_DISTANCE_THRESHOLD,
          gapThreshold: CUSTOM_MATCH_GAP_THRESHOLD,
        });

        if (customMatch.status === "matched") {
          bestMatch = customMatch.bestMatch;
          engineUsed = "custom";
        } else {
          rejectionStatus = customMatch.status;
        }
      }

      if (!bestMatch) {
        setIdentified(false);
        const errorMessage = rejectionStatus === "ambiguous"
          ? "Face match is ambiguous. Please look straight at the camera and try again."
          : "Face not recognized. Please align the face and try again.";
        setCameraError(errorMessage);
        pendingMatchRef.current = { id: "", at: 0, distance: Number.POSITIVE_INFINITY };
        return;
      }

      const matchedStudentName = bestMatch.student.name;
      setIdentified(true);

      const pendingNow = Date.now();
      const pendingMatch = pendingMatchRef.current;
      const isPendingSameStudent =
        pendingMatch.id === bestMatch.student.id &&
        pendingNow - pendingMatch.at <= MATCH_CONFIRM_WINDOW_MS;

      if (!isPendingSameStudent) {
        pendingMatchRef.current = {
          id: bestMatch.student.id,
          at: pendingNow,
          distance: bestMatch.distance,
        };
        setCameraError(`Face detected for ${matchedStudentName}. Hold still to verify...`);
        return;
      }

      pendingMatchRef.current = { id: "", at: 0, distance: Number.POSITIVE_INFINITY };

      const matchedNow = Date.now();
      if (lastMatchedStudentRef.current.id === bestMatch.student.id && matchedNow - lastMatchedStudentRef.current.at < 8000) {
        return;
      }

      const action = attendanceMode === "check-out" ? checkOutStudent : checkInStudent;
      let response;

      try {
        response = await action({ studentId: bestMatch.student.id });
      } catch (requestError) {
        const message = String(requestError?.message || "");
        if (attendanceMode === "check-in" && /already checked in/i.test(message)) {
          setCameraError(`${matchedStudentName} already checked in.`);
          return;
        }

        throw requestError;
      }

      const recognitionTime = attendanceMode === "check-out"
        ? response?.data?.checkOutTime || nowTime()
        : response?.data?.checkInTime || nowTime();

      lastMatchedStudentRef.current = {
        id: bestMatch.student.id,
        at: matchedNow,
      };
      setSuccess(true);
      if (successResetTimeoutRef.current) {
        clearTimeout(successResetTimeoutRef.current);
      }
      successResetTimeoutRef.current = setTimeout(() => {
        setSuccess(false);
        successResetTimeoutRef.current = null;
      }, 4000);

      setLatestRecognitions((current) => {
        const latestEvent = {
          ...bestMatch.student,
          confidence: confidenceFromDistance(
            bestMatch.distance,
            engineUsed === "face-api" ? FACE_API_MATCH_DISTANCE_THRESHOLD : CUSTOM_MATCH_DISTANCE_THRESHOLD,
          ),
          time: recognitionTime,
          mode: attendanceMode,
          sortValue: toSortableMinutes(recognitionTime),
        };

        const rest = current.filter(
          (item) =>
            !(item.id === latestEvent.id && item.time === latestEvent.time && item.mode === latestEvent.mode),
        );

        return [latestEvent, ...rest].slice(0, 3);
      });
      setCameraError("");
      await loadSummary();
    } catch (error) {
      setSuccess(false);
      setCameraError(error.message || "Unable to save attendance");
    }
  };

  const liveStatusLabel = success
    ? "ATTENDANCE SAVED"
    : identified
      ? "STUDENT IDENTIFIED"
      : faceDetected
        ? "SCANNING"
        : videoReady
          ? "WAITING FOR FACE"
          : "WAITING FOR CAMERA";

  const liveStatusDotClass = success
    ? "bg-emerald-300"
    : identified
      ? "bg-sky-300"
      : faceDetected
        ? "animate-pulse bg-amber-300"
        : videoReady
          ? "bg-amber-300"
          : "bg-slate-400";

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-xs">
              {/* <Sparkles className="h-3.5 w-3.5" /> */}
              Facial Attendance
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Take Attendance</h1>
            {/* <p className="mt-1 text-sm text-slate-500">Real-time face scan for school check-in and biometric verification.</p> */}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <p className="text-xs text-slate-500">On-time</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{summary.onTime || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <p className="text-xs text-slate-500">Absent</p>
              <p className="mt-1 text-lg font-semibold text-amber-700">{summary.absent}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <p className="text-xs text-slate-500">Late</p>
              <p className="mt-1 text-lg font-semibold text-slate-800">{summary.late}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Live Attendance Scan</h2>
                <p className="text-xs text-slate-400">
                  Align student face within frame and capture for {attendanceMode === "check-out" ? "check-out" : "check-in"}.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                Session in progress
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAttendanceMode("check-in")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  attendanceMode === "check-in"
                    ? "bg-sky-700 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                Check In
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode("check-out")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  attendanceMode === "check-out"
                    ? "bg-sky-700 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                Check Out
              </button>
            </div>

            {!cameraActive ? (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Camera className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Camera is disabled</p>
                <p className="mt-1 text-xs text-slate-500">Enable camera to begin biometric attendance scan.</p>
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  <Camera className="h-4 w-4" />
                  Enable Camera
                </button>
              </div>
            ) : (
              <>
                <div className="relative mx-auto mt-5 w-full max-w-70">
                  <div className="absolute -left-2 -top-2 h-8 w-8 border-l-4 border-t-4 border-slate-800/70" />
                  <div className="absolute -right-2 -top-2 h-8 w-8 border-r-4 border-t-4 border-slate-800/70" />
                  <div className="absolute -bottom-2 -left-2 h-8 w-8 border-b-4 border-l-4 border-slate-800/70" />
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 border-b-4 border-r-4 border-slate-800/70" />

                  <div className="relative aspect-square overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-slate-700/40">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/30 via-transparent to-sky-200/10" />

                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-sm">
                        <span className={`h-2 w-2 rounded-full ${liveStatusDotClass}`} />
                        {liveStatusLabel}
                      </div>
                    </div>

                    {!videoReady && (
                      <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900/50">
                        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-100">
                          STARTING CAMERA...
                        </span>
                      </div>
                    )}

                    {/* <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-slate-200/90 px-3 py-1 text-[10px] font-semibold tracking-wide text-sky-800 shadow-sm">
                        Analyzing facial data...
                      </span>
                    </div> */}
                  </div>
                </div>

                <div className="mx-auto mt-5 w-full max-w-70 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-xs">
                  <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                    <div className="grid place-items-center gap-1.5">
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${faceDetected ? "bg-sky-700" : "bg-slate-400"}`}>
                        <Camera className="h-4 w-4" />
                      </span>
                      <span className={`text-[11px] font-semibold ${faceDetected ? "text-sky-800" : "text-slate-500"}`}>Scanning</span>
                    </div>

                    <div className={`h-0.5 rounded-full ${faceDetected && identified ? "bg-sky-500" : "bg-slate-300"}`} />

                    <div className="grid place-items-center gap-1.5">
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${identified ? "bg-sky-700" : "bg-slate-400"}`}>
                        <ScanFace className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700">Identified</span>
                    </div>

                    <div className={`h-0.5 rounded-full ${success ? "bg-emerald-500" : "bg-slate-300"}`} />

                    <div className="grid place-items-center gap-1.5">
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${success ? "bg-emerald-500" : "bg-slate-400"}`}>
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <span className={`text-[11px] font-semibold ${success ? "text-emerald-700" : "text-slate-700"}`}>
                        Success
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:col-span-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reinitialize Camera
                  </button>
                </div>

              </>
            )}

            {cameraError && <p className="mt-4 text-center text-xs font-semibold text-rose-700">{cameraError}</p>}
          </section>

          <div className="space-y-5 lg:col-span-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Latest Recognition</h2>
                  <p className="text-xs text-slate-400">Most recent face match</p>
                </div>
                <ScanFace className="h-4 w-4 text-sky-600" />
              </div>

              {latestRecognitions.length ? (
                <div className="mt-4 space-y-3">
                  {latestRecognitions.map((scan, index) => {
                    const highlightTone = index === 0;
                    return (
                      <div
                        key={`${scan.id}-${scan.mode}-${scan.time}`}
                        className={`rounded-xl border p-4 ${highlightTone ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          {scan.profileImage ? (
                            <img
                              src={scan.profileImage}
                              alt={`${scan.name} profile`}
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                            />
                          ) : (
                            <div className={`grid h-12 w-12 place-items-center rounded-full text-sm font-semibold ${highlightTone ? "bg-linear-to-br from-emerald-200 to-emerald-400 text-emerald-900" : "bg-linear-to-br from-slate-200 to-slate-400 text-slate-700"}`}>
                              {scan.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className={`text-sm font-semibold ${highlightTone ? "text-emerald-900" : "text-slate-800"}`}>
                              <Link href={`/students/${scan.id}`} className="transition hover:text-sky-700">
                                {scan.name}
                              </Link>
                            </p>
                            <p className={`mt-1 text-xs ${highlightTone ? "text-emerald-700" : "text-slate-500"}`}>{scan.id} • {scan.className}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                          <span className="font-semibold text-sky-700 uppercase">{scan.mode === "check-out" ? "Check-Out" : "Check-In"}</span>
                          <span className={`font-semibold ${highlightTone ? "text-emerald-700" : "text-slate-600"}`}>
                            {scan.confidence ? `Confidence ${scan.confidence}` : "Attendance recorded"}
                          </span>
                          <span>{scan.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  No recognition yet. Capture attendance to register a scan.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
