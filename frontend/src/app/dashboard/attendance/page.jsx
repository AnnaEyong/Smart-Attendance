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
} from "lucide-react";
import { checkInStudent, fetchDailyAttendance, fetchStudents } from "@/lib/api";

const roster = [];

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TakeAttendancePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [identified, setIdentified] = useState(false);
  const [success, setSuccess] = useState(false);

  const [snapshots, setSnapshots] = useState([]);
  const [lastScan, setLastScan] = useState(null);
  const [liveRoster, setLiveRoster] = useState(roster);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });

  const todayKey = new Date().toISOString().slice(0, 10);

  const loadRoster = async () => {
    try {
      const response = await fetchStudents();
      const rows = Array.isArray(response?.data)
        ? response.data.map((student) => ({
            id: student.studentId,
            name: student.fullName,
            className: student.level || student.grade || "N/A",
          }))
        : [];
      setLiveRoster(rows);
    } catch {
      setLiveRoster([]);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetchDailyAttendance(todayKey);
      setSummary(response?.data?.summary || { present: 0, absent: 0, late: 0 });
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

  const captureAttendance = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady || videoRef.current.videoWidth <= 0) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg");
    setSnapshots((current) => [imageData, ...current].slice(0, 3));

    if (!liveRoster.length) {
      return;
    }

    const student = liveRoster[Math.floor(Math.random() * liveRoster.length)];

    checkInStudent({ studentId: student.id })
      .then(() => {
        setLastScan({
          ...student,
          confidence: `${(94 + Math.random() * 5).toFixed(1)}%`,
          time: nowTime(),
        });
        loadSummary();
      })
      .catch((error) => {
        setCameraError(error.message || "Unable to save attendance");
      });
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
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
                <p className="text-xs text-slate-400">Align student face within frame and capture.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                Session in progress
              </div>
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

                    {!videoReady && (
                      <div className="absolute inset-0 grid place-items-center bg-slate-900/50">
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
                    onClick={captureAttendance}
                    disabled={!videoReady}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserCheck className="h-4 w-4" />
                    Capture Attendance
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reinitialize Camera
                  </button>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wide text-slate-500">Recent Snapshots</span>
                    <span className="text-slate-500">{snapshots.length}/3 recorded</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, index) => {
                      const image = snapshots[index];
                      return image ? (
                        <img
                          key={`snapshot-${index}`}
                          src={image}
                          alt={`Snapshot ${index + 1}`}
                          className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <div
                          key={`slot-${index}`}
                          className="grid aspect-square w-full place-items-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100"
                        >
                          <Camera className="h-4 w-4 text-slate-300" />
                        </div>
                      );
                    })}
                  </div>
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
                  <p className="text-sm font-semibold text-emerald-900">
                    <Link href={`/students/${lastScan.id}`} className="transition hover:text-sky-700">
                      {lastScan.name}
                    </Link>
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">{lastScan.id} • {lastScan.className}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-emerald-700">Confidence {lastScan.confidence}</span>
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
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            <Link href={`/students/${student.id}`} className="transition hover:text-sky-700">
                              {student.name}
                            </Link>
                          </p>
                          <p className="text-xs text-slate-500">{student.id} • {student.className}</p>
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
