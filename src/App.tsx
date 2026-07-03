import { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc, limit } from "firebase/firestore";
import { Dashboard, UserNotification } from "./types";
import AuthScreen from "./components/AuthScreen";
import Navbar from "./components/Navbar";
import FileUploader from "./components/FileUploader";
import DashboardView from "./components/DashboardView";
import { 
  FileSpreadsheet, 
  Sparkles, 
  Bell, 
  X, 
  Loader2,
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([
    {
      id: "init-notif",
      title: "Selamat Datang!",
      message: "Unggah file Excel pertama Anda untuk melihat kekuatan visualisasi otomatis AI.",
      type: "success",
      timestamp: new Date().toISOString(),
      read: false
    }
  ]);

  // Active toast notification for live pushes
  const [activeToast, setActiveToast] = useState<UserNotification | null>(null);

  // 1. Authenticated User Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setDashboards([]);
        setActiveId(null);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Real-time Firestore Dashboards Listener for current logged-in user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "dashboards"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsList: Dashboard[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        docsList.push({
          id: doc.id,
          ...data
        } as Dashboard);
      });

      // Sort by creation time descending if possible
      docsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setDashboards(docsList);

      // Set active dashboard automatically if none is selected
      if (docsList.length > 0) {
        setActiveId((prev) => {
          if (prev && docsList.some((d) => d.id === prev)) {
            return prev; // keep current selection
          }
          return docsList[0].id; // default to latest
        });
      } else {
        setActiveId(null);
        setShowUploader(true); // default to uploading when empty
      }
    }, (error) => {
      console.error("Firestore loading error:", error);
    });

    return unsubscribe;
  }, [user]);

  // Find active dashboard object
  const activeDashboard = dashboards.find((d) => d.id === activeId) || null;

  // 3. Periodic Live Push Notification Simulation
  useEffect(() => {
    if (!user) return;

    const messages = [
      {
        title: "Pembaruan Real-Time",
        message: "Sinkronisasi berkala selesai. Semua KPI diperbarui dengan sukses.",
        type: "success" as const
      },
      {
        title: "Analisis AI Selesai",
        message: "Model mendeteksi anomali positif pada tren data terbaru Anda.",
        type: "info" as const
      },
      {
        title: "Pencadangan Berhasil",
        message: "Data dashboard Anda dicadangkan dengan aman di cloud Firestore.",
        type: "success" as const
      },
      {
        title: "Tips Visualisasi",
        message: "Gunakan filter dinamis untuk melihat kontribusi detail setiap dimensi data.",
        type: "info" as const
      }
    ];

    const interval = setInterval(() => {
      // Pick a random message
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      
      const newNotif: UserNotification = {
        id: `push-${Date.now()}`,
        title: randomMsg.title,
        message: randomMsg.message,
        type: randomMsg.type,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Prepend to notifications
      setNotifications((prev) => [newNotif, ...prev]);
      
      // Trigger live banner toast
      setActiveToast(newNotif);

      // Dismiss toast after 5 seconds
      setTimeout(() => {
        setActiveToast((currentToast) => {
          if (currentToast?.id === newNotif.id) {
            return null;
          }
          return currentToast;
        });
      }, 5000);

    }, 35000); // Push every 35 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Navigation handlers
  const handleSelectDashboard = (id: string) => {
    setActiveId(id);
    setShowUploader(false);
  };

  const handleUploadSuccess = (newId: string) => {
    setActiveId(newId);
    setShowUploader(false);
    
    // Push positive alert notification
    const uploadSuccessNotif: UserNotification = {
      id: `upload-${Date.now()}`,
      title: "Konversi Excel Sukses!",
      message: "AI Analis telah menyusun grafik & KPI interaktif khusus untuk data Anda.",
      type: "success",
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications((prev) => [uploadSuccessNotif, ...prev]);
    setActiveToast(uploadSuccessNotif);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Memuat Otentikasi Aman...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50/30 flex flex-col text-gray-800 antialiased font-sans">
      
      {/* Top Navbar */}
      <Navbar
        dashboards={dashboards}
        selectedId={activeId}
        onSelect={handleSelectDashboard}
        onUploadClick={() => setShowUploader(true)}
        notifications={notifications}
        onMarkAllRead={markAllRead}
        onClearNotifications={clearNotifications}
      />

      {/* Main Container Area */}
      <main className="flex-1">
        {showUploader ? (
          <div className="py-12">
            <FileUploader onUploadSuccess={handleUploadSuccess} />
            {dashboards.length > 0 && (
              <div className="text-center mt-4">
                <button
                  id="back-to-dashboard-btn"
                  onClick={() => setShowUploader(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Kembali ke Dashboard Aktif
                </button>
              </div>
            )}
          </div>
        ) : activeDashboard ? (
          <DashboardView 
            dashboard={activeDashboard} 
            onRefresh={() => {
              // Firestore listener handles update automatically, this callback helps trigger any custom client state
            }} 
          />
        ) : (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4 border border-blue-100">
              <FileSpreadsheet className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Mulai Dashboard Pertama Anda</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm">
              Anda belum mengunggah file data apa pun. Unggah file Excel atau CSV sekarang dan saksikan visualisasi otomatis dari AI.
            </p>
            <button
              id="empty-uploader-trigger"
              onClick={() => setShowUploader(true)}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Mulai Unggah Excel
            </button>
          </div>
        )}
      </main>

      {/* Bottom Footer Credits */}
      <footer className="border-t border-gray-100/60 bg-white py-6 mt-12 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Excel Dashboard Otomatis. Seluruh Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-1 bg-blue-50/50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-500/10 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Didukung oleh Gemini 2.5 AI Analis</span>
          </div>
        </div>
      </footer>

      {/* Real-time Toast Notifications Alert Popups */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            id="toast-notification-banner"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex gap-3.5"
          >
            <div className="shrink-0 mt-0.5">
              {activeToast.type === "success" && (
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Award className="h-4 w-4" />
                </div>
              )}
              {activeToast.type === "info" && (
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
              )}
              {activeToast.type === "warning" && (
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <span className="font-extrabold text-gray-900 text-xs tracking-tight">{activeToast.title}</span>
                <button
                  id="dismiss-toast-btn"
                  onClick={() => setActiveToast(null)}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">{activeToast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
