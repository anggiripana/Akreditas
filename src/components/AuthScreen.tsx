import React, { useState } from "react";
import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { LogIn, UserPlus, Database, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let IndonesianMessage = "";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        IndonesianMessage = "Email atau password salah. Silakan periksa kembali kredensial Anda.";
      } else if (err.code === "auth/email-already-in-use") {
        IndonesianMessage = "Alamat email ini sudah terdaftar. Silakan pilih Masuk jika sudah memiliki akun.";
      } else if (err.code === "auth/weak-password") {
        IndonesianMessage = "Kata sandi terlalu lemah (minimal 6 karakter).";
      } else if (err.code === "auth/invalid-email") {
        IndonesianMessage = "Format email tidak valid.";
      } else if (err.code === "auth/operation-not-allowed") {
        IndonesianMessage = "Metode masuk 'Email/Sandi' belum diaktifkan di Firebase Console Anda. Silakan aktifkan di menu Authentication > Sign-in method pada konsol Firebase Anda.";
      } else {
        IndonesianMessage = `Terjadi kesalahan keamanan (${err.code || "unknown-error"}). Silakan periksa kredensial Anda atau aktifkan penyedia login di Firebase Console.`;
      }
      setError(IndonesianMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Fitur masuk sebagai Tamu (Anonim) belum diaktifkan di Firebase Console Anda. Silakan aktifkan penyedia login 'Anonymous' di menu Authentication > Sign-in method.");
      } else {
        setError(`Gagal masuk sebagai Tamu (${err.code || "unknown-error"}). Silakan coba login manual atau periksa konfigurasi Firebase Anda.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl mb-4">
            <Database className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Excel Dashboard Otomatis
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Unggah file Excel dan buat dashboard interaktif instan bertenaga AI.
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            id="toggle-login-btn"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Masuk
          </button>
          <button
            id="toggle-register-btn"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              !isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {error && (
          <div className="space-y-3">
            <div id="auth-error-alert" className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 space-y-2.5">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Langkah Solusi Tercepat:</span>
              </div>
              <p className="leading-relaxed">
                Pesan ini biasanya muncul jika konfigurasi autentikasi di Firebase Console belum aktif sepenuhnya. Silakan ikuti langkah berikut:
              </p>
              <ol className="list-decimal pl-4.5 space-y-1.5 leading-relaxed font-medium">
                <li>
                  Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline text-amber-900 font-bold hover:text-amber-950">Firebase Console</a> Anda.
                </li>
                <li>
                  Pilih proyek Anda, lalu buka menu <strong>Authentication</strong> &gt; tab <strong>Sign-in method</strong>.
                </li>
                <li>
                  Aktifkan penyedia login <strong>Email/Password</strong> agar Anda bisa membuat akun & masuk menggunakan email.
                </li>
                <li>
                  Aktifkan penyedia login <strong>Anonymous (Anonim)</strong> jika Anda ingin menggunakan fitur tombol masuk cepat (Tamu).
                </li>
              </ol>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Alamat Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                placeholder="nama@perusahaan.com"
              />
            </div>
            <div>
              <label htmlFor="password-input" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Kata Sandi
              </label>
              <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div>
            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Masuk ke Dashboard" : "Daftar Sekarang"}
                  {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <span className="relative bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">Atau</span>
        </div>

        <div>
          <button
            id="demo-login-btn"
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-200 transition-colors text-sm cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Masuk Cepat sebagai Tamu (Demo)</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
