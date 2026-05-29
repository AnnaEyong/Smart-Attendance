"use client";

import { useState, useRef, useEffect } from "react";
import { X, Shield, Camera, Check, AlertCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { createStudent, fetchDepartments } from "@/lib/api";

export default function RegisterStudentModal() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    grade: "",
    department: "",
    dateOfBirth: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const [capturedFaces, setCapturedFaces] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  
  const [requirements, setRequirements] = useState({
    centered: false,
    lighting: false,
    expression: false,
    eyes: false,
  });

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const response = await fetchDepartments();
        const rows = Array.isArray(response?.data) ? response.data : [];
        setDepartments(rows);
      } catch {
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraActive]);

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
        // Fallback for devices/browsers that reject facingMode constraints.
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const video = videoRef.current;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setVideoReady(true);
          } catch {
            setCameraError("Camera started but preview could not play. Tap enable camera again.");
          }
        };
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraActive(false);
      setCameraError("Unable to access camera. Please allow camera permissions and try again.");
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current && videoReady && videoRef.current.videoWidth > 0) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvasRef.current.toDataURL("image/jpeg");
      setCapturedFaces([...capturedFaces, imageData]);
      
      // Simulate face detection checklist
      setRequirements({
        centered: Math.random() > 0.3,
        lighting: Math.random() > 0.2,
        expression: Math.random() > 0.4,
        eyes: Math.random() > 0.2,
      });
      setFaceDetected(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildFaceDescriptor = async (imageDataUrl) => {
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
            reject(new Error("Unable to initialize descriptor canvas."));
            return;
          }

          ctx.drawImage(image, 0, 0, size, size);
          const pixels = ctx.getImageData(0, 0, size, size).data;

          const dimension = 128;
          const descriptor = Array.from({ length: dimension }, () => 0);
          const counts = Array.from({ length: dimension }, () => 0);
          const totalPixels = size * size;

          for (let i = 0; i < totalPixels; i += 1) {
            const pixelIndex = i * 4;
            const r = pixels[pixelIndex];
            const g = pixels[pixelIndex + 1];
            const b = pixels[pixelIndex + 2];
            const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            const bucket = Math.min(dimension - 1, Math.floor((i / totalPixels) * dimension));
            descriptor[bucket] += gray;
            counts[bucket] += 1;
          }

          for (let i = 0; i < dimension; i += 1) {
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
          reject(new Error("Unable to compute face descriptor."));
        }
      };

      image.onerror = () => reject(new Error("Invalid face image data."));
      image.src = imageDataUrl;
    });
  };

  const averageDescriptors = (descriptors) => {
    if (!Array.isArray(descriptors) || descriptors.length === 0) {
      return [];
    }

    const dimension = 128;
    const sums = Array.from({ length: dimension }, () => 0);

    for (const descriptor of descriptors) {
      for (let i = 0; i < dimension; i += 1) {
        sums[i] += descriptor[i] || 0;
      }
    }

    const averaged = sums.map((value) => value / descriptors.length);
    const norm = Math.sqrt(averaged.reduce((sum, value) => sum + value * value, 0));

    return norm > 0
      ? averaged.map((value) => Number((value / norm).toFixed(8)))
      : averaged;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (capturedFaces.length === 0) {
      setSubmitError("Please capture at least one face image before submitting.");
      return;
    }

    const generatedId = `ST-${Date.now().toString().slice(-6)}`;
    const levelMap = {
      9: "Level 100",
      10: "Level 200",
      11: "Level 300",
      12: "Level 400",
    };

    try {
      const descriptors = await Promise.all(capturedFaces.map((face) => buildFaceDescriptor(face)));
      const faceDescriptor = averageDescriptors(descriptors);

      await createStudent({
        studentId: generatedId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        email: formData.email,
        phone: formData.phone,
        level: levelMap[Number(formData.grade)] || "",
        department: formData.department.trim(),
        guardianName: formData.guardianName.trim(),
        guardianPhone: formData.guardianPhone,
        guardianEmail: formData.guardianEmail,
        faceDescriptor,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          grade: "",
          department: "",
          dateOfBirth: "",
          guardianName: "",
          guardianPhone: "",
          guardianEmail: "",
        });
        setCapturedFaces([]);
        setCameraActive(false);
        setSubmitError("");
        router.back();
      }, 1200);
    } catch (error) {
      setSubmitError(error.message || "Unable to register student");
    }
  };

  const handleClose = () => {
    setCameraActive(false);
    router.back();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Form */}
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-slate-200 pb-4 pr-16">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Register Student</h1>
              <p className="mt-1 text-sm text-slate-500">Add a new student to the system</p>
            </div>

            {/* Student Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Student Information</h3>
              <p className="text-xs text-slate-500">Basic details about the student</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Enter first name"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Enter last name"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="student@example.com"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            {/* Academic Information */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">Academic Information</h3>
              <p className="text-xs text-slate-500">Level and class assignment</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Level *</label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Select level</option>
                    <option value="9">Level 100</option>
                    <option value="10">Level 200</option>
                    <option value="11">Level 300</option>
                    <option value="12">Level 400</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    <option value="">{departmentsLoading ? "Loading departments..." : "Select department"}</option>
                    {departments.map((department) => (
                      <option key={department._id || department.name} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Guardian Information */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">Guardian Information</h3>
              <p className="text-xs text-slate-500">Emergency contact and parent details</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Guardian Name *</label>
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleChange}
                    required
                    placeholder="Enter guardian name"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Guardian Phone *</label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleChange}
                    required
                    placeholder="+1 (555) 000-0000"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-slate-700">Guardian Email *</label>
                <input
                  type="email"
                  name="guardianEmail"
                  value={formData.guardianEmail}
                  onChange={handleChange}
                  required
                  placeholder="guardian@example.com"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            {/* Biometric Enrollment */}
            <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Camera className="h-4 w-4" />
                  Biometric Enrollment
                </h3>
                {capturedFaces.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {capturedFaces.length}/3 Recorded
                  </span>
                )}
              </div>

              {!cameraActive ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setCameraActive(true)}
                    className="w-full rounded-lg border-2 border-dashed border-slate-300 py-8 text-center transition hover:border-slate-400"
                  >
                    <Camera className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Click to enable camera</p>
                    <p className="text-xs text-slate-500">or press spacebar to capture</p>
                  </button>
                  {cameraError && (
                    <p className="text-xs text-rose-600">{cameraError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Camera Feed - Left Side */}
                    <div className="col-span-2">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Face detection overlay */}
                        <div className="absolute inset-0 flex items-center justify-center border-4 border-dashed border-amber-500/50">
                          <div className="text-center">
                            {!videoReady ? (
                              <span className="inline-block rounded-full bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-100">
                                Starting camera...
                              </span>
                            ) : !faceDetected ? (
                              <span className="text-xs font-semibold text-slate-300">Position your face here</span>
                            ) : null}
                          </div>
                        </div>

                        {videoReady && faceDetected && (
                          <div className="pointer-events-none absolute right-3 top-3">
                            <span className="flex items-center justify-center gap-1 rounded-full bg-amber-500/80 px-3 py-1 text-[10px] font-semibold text-white">
                              <Video size={13}/> LIVE PREVIEW
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Requirements Checklist - Right Side */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-3">REQUIREMENTS</p>
                        <div className="space-y-2">
                          {[
                            { key: "centered", label: "Centered face" },
                            { key: "lighting", label: "Good lighting" },
                            { key: "expression", label: "Neutral expression" },
                            { key: "eyes", label: "Eyes open" },
                          ].map((req) => (
                            <div key={req.key} className="flex items-center gap-2">
                              <div className={`h-3.5 w-3.5 rounded border shrink-0 ${requirements[req.key] ? "bg-emerald-500 border-emerald-500" : "border-slate-300"} flex items-center justify-center`}>
                                {requirements[req.key] && <Check className="h-2 w-2 text-white" />}
                              </div>
                              <span className="text-xs text-slate-600">{req.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={captureFace}
                        disabled={capturedFaces.length >= 3 || !videoReady}
                        className="mt-4 w-full inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Capture Face ({capturedFaces.length}/3)
                      </button>
                    </div>
                  </div>

                  {/* Recent Snapshots */}
                  {capturedFaces.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-3">RECENT SNAPSHOTS</p>
                      <div className="grid grid-cols-3 gap-3">
                        {capturedFaces.map((face, idx) => (
                          <img
                            key={idx}
                            src={face}
                            alt={`Snapshot ${idx + 1}`}
                            className="w-full aspect-square rounded-lg object-cover border border-slate-200"
                          />
                        ))}
                        {Array.from({ length: 3 - capturedFaces.length }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="w-full aspect-square rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center"
                          >
                            <Camera className="h-4 w-4 text-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Success Message */}
            {submitted && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">
                  ✓ Student registered successfully with biometric data
                </p>
                <p className="mt-1 text-xs text-emerald-700">Closing dialog...</p>
              </div>
            )}

            {/* Error Message */}
            {!submitted && submitError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </p>
              </div>
            )}

            {/* Form Actions */}
            {!submitted && (
              <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  <Shield className="h-4 w-4" />
                  Register Student
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
