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
  Users,
  LogOut,
} from "lucide-react";
import { checkInStudent, checkOutStudent, fetchDailyAttendance, fetchStudents } from "@/lib/api";

const roster = [];

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DESCRIPTOR_SIZE = 128;
const MATCH_DISTANCE_THRESHOLD = 0.2;

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

const confidenceFromDistance = (distance) => {
  const score = Math.max(0, 1 - distance / MATCH_DISTANCE_THRESHOLD);
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

const getLatestRecognitionFromRows = (rows) => {
  let latest = null;

  for (const row of rows) {
    const events = [
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

    for (const event of events) {
      if (!latest || event.sortValue >= latest.sortValue) {
        latest = event;
      }
    }
  }

  return latest;
};

export default function TakeAttendancePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const lastMatchedStudentRef = useRef({ id: "", at: 0 });

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("check-in");

  const [identified, setIdentified] = useState(false);
  const [success, setSuccess] = useState(false);

  const [lastScan, setLastScan] = useState(null);
  const [liveRoster, setLiveRoster] = useState(roster);
  const [studentsWithBiometrics, setStudentsWithBiometrics] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });

  const todayKey = new Date().toISOString().slice(0, 10);

  const loadRoster = async () => {
    try {
      const response = await fetchStudents();
      const records = Array.isArray(response?.data) ? response.data : [];
      const rows = records.map((student) => ({
        id: student.studentId,
        name: student.fullName,
        profileImage: student.profileImage || "",
        className: student.level || student.grade || "N/A",
      }));
      const biometricRows = records.map((student) => ({
        id: student.studentId,
        name: student.fullName,
        profileImage: student.profileImage || "",
        className: student.level || student.grade || "N/A",
        faceDescriptor: Array.isArray(student.faceDescriptor) ? student.faceDescriptor : null,
      }));
      setLiveRoster(rows);
      setStudentsWithBiometrics(biometricRows);
    } catch {
      setLiveRoster([]);
      setStudentsWithBiometrics([]);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetchDailyAttendance(todayKey);
      const summaryData = response?.data?.summary || { present: 0, absent: 0, late: 0 };
      const rows = Array.isArray(response?.data?.rows) ? response.data.rows : [];
      const latestRecognition = getLatestRecognitionFromRows(rows);

      setSummary(summaryData);
      setLastScan((current) => {
        if (!latestRecognition) {
          return current?.confidence ? current : null;
        }

        if (
          current &&
          current.id === latestRecognition.id &&
          current.time === latestRecognition.time &&
          current.mode === latestRecognition.mode
        ) {
          return {
            ...latestRecognition,
            confidence: current.confidence,
          };
        }

        return latestRecognition;
      });
    } catch {
      setSummary({ present: 0, absent: 0, late: 0 });
    }
  };

  useEffect(() => {
    loadRoster();
    loadSummary();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
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
    if (!videoReady) {
      setIdentified(false);
      setSuccess(false);
      return;
    }

    const identifiedTimer = setTimeout(() => setIdentified(true), 900);
    const successTimer = setTimeout(() => setSuccess(true), 1800);

    return () => {
      clearTimeout(identifiedTimer);
      clearTimeout(successTimer);
    };
  }, [videoReady]);

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
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

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
      const capturedDescriptor = await buildFaceDescriptorFromDataUrl(imageData);

      let bestMatch = null;
      for (const candidate of candidates) {
        const distance = euclideanDistance(capturedDescriptor, candidate.faceDescriptor);
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            student: candidate,
            distance,
          };
        }
      }

      if (!bestMatch || bestMatch.distance > MATCH_DISTANCE_THRESHOLD) {
        setCameraError("Face not recognized. Please align the face and try again.");
        return;
      }

      const matchedNow = Date.now();
      if (lastMatchedStudentRef.current.id === bestMatch.student.id && matchedNow - lastMatchedStudentRef.current.at < 8000) {
        return;
      }

      const action = attendanceMode === "check-out" ? checkOutStudent : checkInStudent;
      const response = await action({ studentId: bestMatch.student.id });
      const recognitionTime = attendanceMode === "check-out"
        ? response?.data?.checkOutTime || nowTime()
        : response?.data?.checkInTime || nowTime();

      lastMatchedStudentRef.current = {
        id: bestMatch.student.id,
        at: matchedNow,
      };

      setLastScan({
        ...bestMatch.student,
        confidence: confidenceFromDistance(bestMatch.distance),
        time: recognitionTime,
        mode: attendanceMode,
      });
      await loadSummary();
    } catch (error) {
      setCameraError(error.message || "Unable to save attendance");
    }
  };

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
            <p className="mt-1 text-sm text-slate-500">Real-time face scan for school check-in and biometric verification.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <p className="text-xs text-slate-500">Checked In</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{summary.present}</p>
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
                        <span className={`h-2 w-2 rounded-full ${videoReady ? "animate-pulse bg-emerald-300" : "bg-slate-400"}`} />
                        {videoReady ? "AUTO SCANNING" : "WAITING FOR CAMERA"}
                      </div>
                    </div>

                    {!videoReady && (
                      <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900/50">
                        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-100">
                          STARTING CAMERA...
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-slate-200/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-sky-800 shadow-sm">
                        ANALYZING FACIAL DATA...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mx-auto mt-5 w-full max-w-70 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-xs">
                  <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                    <div className="grid place-items-center gap-1.5">
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${videoReady ? "bg-sky-700" : "bg-slate-400"}`}>
                        <Camera className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-semibold text-sky-800">Scanning</span>
                    </div>

                    <div className={`h-0.5 rounded-full ${identified ? "bg-sky-500" : "bg-slate-300"}`} />

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

              {lastScan ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    {lastScan.profileImage ? (
                      <img
                        src={lastScan.profileImage}
                        alt={`${lastScan.name} profile`}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-linear-to-br from-emerald-200 to-emerald-400 text-sm font-semibold text-emerald-900">
                        {lastScan.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        <Link href={`/students/${lastScan.id}`} className="transition hover:text-sky-700">
                          {lastScan.name}
                        </Link>
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">{lastScan.id} • {lastScan.className}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-sky-700 uppercase">{lastScan.mode === "check-out" ? "Check-Out" : "Check-In"}</span>
                    <span className="font-semibold text-emerald-700">
                      {lastScan.confidence ? `Confidence ${lastScan.confidence}` : "Attendance recorded"}
                    </span>
                    <span>{lastScan.time}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  No recognition yet. Capture attendance to register a scan.
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Session Queue</h2>
                  <p className="text-xs text-slate-400">Students expected for school check-in</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  <Users className="h-3.5 w-3.5" />
                  {liveRoster.length}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {liveRoster.map((student) => {
                  const matched = lastScan?.id === student.id;
                  return (
                    <div
                      key={student.id}
                      className={`rounded-xl border px-3 py-2 ${matched ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {student.profileImage ? (
                            <img
                              src={student.profileImage}
                              alt={`${student.name} profile`}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                            />
                          ) : (
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-linear-to-br from-slate-200 to-slate-400 text-xs font-semibold text-slate-700">
                              {student.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              <Link href={`/students/${student.id}`} className="transition hover:text-sky-700">
                                {student.name}
                              </Link>
                            </p>
                            <p className="text-xs text-slate-500">{student.id} • {student.className}</p>
                          </div>
                        </div>
                        {matched ? (
                          <span className="text-xs font-semibold text-emerald-700">Checked</span>
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
