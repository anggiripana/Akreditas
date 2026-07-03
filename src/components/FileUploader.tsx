import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { read, utils } from "xlsx";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { DashboardConfig } from "../types";

interface FileUploaderProps {
  onUploadSuccess: (newDashboardId: string) => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    const fileName = file.name;
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
      setError("Hanya file Excel (.xlsx, .xls) atau CSV (.csv) yang didukung.");
      return;
    }

    setLoading(true);
    try {
      setLoadingStep("Membaca file dan mengekstrak data...");
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("Gagal membaca isi file.");

          let workbook;
          if (extension === "csv") {
            // Read CSV directly
            workbook = read(data, { type: "binary" });
          } else {
            // Read Excel binary sheet
            workbook = read(data, { type: "array" });
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Parse rows as array of objects
          const rawRows = utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

          if (rawRows.length === 0) {
            throw new Error("File Excel kosong atau tidak memiliki baris data.");
          }

          // Cap the dataset at 1500 rows to ensure snappy database storage
          const dataset = rawRows.slice(0, 1500);
          const headers = Object.keys(dataset[0]);

          setLoadingStep("Menghubungi AI Analis untuk merancang visualisasi...");

          // Get preview (up to 10 rows)
          const sampleRows = dataset.slice(0, 10);

          // Call the server Gemini API endpoint
          const response = await fetch("/api/analyze-excel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              headers,
              sampleRows,
              rowCount: dataset.length,
            }),
          });

          if (!response.ok) {
            const errRes = await response.json();
            throw new Error(errRes.error || "Gagal memproses analisis data oleh AI.");
          }

          const { dashboardConfig }: { dashboardConfig: DashboardConfig } = await response.json();

          setLoadingStep("Menyimpan dashboard ke database aman...");

          // Save to Firestore under user
          const currentUser = auth.currentUser;
          const userId = currentUser ? currentUser.uid : "anonymous";

          const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

          const newDocRef = await addDoc(collection(db, "dashboards"), {
            userId,
            title: cleanTitle,
            description: `Dashboard interaktif yang dihasilkan secara otomatis dari file ${fileName}.`,
            createdAt: new Date().toISOString(),
            dataset,
            headers,
            dashboardConfig,
          });

          setLoading(false);
          onUploadSuccess(newDocRef.id);

        } catch (innerErr: any) {
          console.error(innerErr);
          setError(innerErr.message || "Gagal mengurai file Excel.");
          setLoading(false);
        }
      };

      if (extension === "csv") {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }

    } catch (err: any) {
      console.error(err);
      setError("Kesalahan saat mengunggah file.");
      setLoading(false);
    }
  };

  return (
    <div id="file-uploader-container" className="w-full max-w-2xl mx-auto p-6 font-sans">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Unggah Data Baru</h3>
        <p className="text-sm text-gray-500 mt-1">
          Seret file Excel (.xlsx) atau CSV (.csv) Anda untuk otomatis dirubah menjadi dashboard visual interaktif.
        </p>
      </div>

      {error && (
        <div id="upload-error-alert" className="mb-6 flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <span className="font-semibold">Kesalahan Unggah:</span>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div id="upload-loading-state" className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 bg-blue-50/10 rounded-2xl p-12 text-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <h4 className="font-semibold text-gray-800 text-base">Sedang Memproses...</h4>
          <p id="loading-step-text" className="text-sm text-gray-500 mt-2 max-w-sm transition-all duration-200">
            {loadingStep}
          </p>
          <div className="w-48 bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-[pulse_1.5s_infinite]" style={{ width: '100%' }}></div>
          </div>
        </div>
      ) : (
        <div
          id="dropzone-area"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-blue-500 bg-blue-50/30 scale-[1.01]"
              : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50"
          }`}
        >
          <input
            id="file-input-field"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-4 bg-gray-50 text-gray-600 rounded-2xl mb-4 border border-gray-100">
            <Upload className="h-8 w-8 text-blue-500" />
          </div>

          <p className="font-medium text-gray-800 text-sm">
            Klik untuk mencari atau seret file ke sini
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Mendukung .xlsx, .xls, .csv (Maksimal 1500 baris untuk kinerja optimal)
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 rounded-lg">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Excel (.xlsx)
            </span>
            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 rounded-lg">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" /> CSV (.csv)
            </span>
          </div>
        </div>
      )}

      <div className="mt-8 bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs text-gray-600">
        <h5 className="font-semibold text-gray-800 flex items-center gap-1.5 mb-1.5">
          <ArrowRight className="h-3.5 w-3.5 text-blue-500" /> Cara Kerja Konversi Otomatis AI:
        </h5>
        <ul className="list-disc pl-4 space-y-1">
          <li>System akan memilah tipe data setiap kolom secara mandiri.</li>
          <li>AI mendesain 3 KPI utama, 3 grafik interaktif, dan 2 filter dinamis tercocok.</li>
          <li>Semua hasil visualisasi langsung terhubung dengan fitur CRUD tabel.</li>
        </ul>
      </div>
    </div>
  );
}
