import { useState, useRef, useEffect } from "react";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { 
  Database, 
  Bell, 
  LogOut, 
  Plus, 
  ChevronDown, 
  User, 
  CheckCheck,
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react";
import { Dashboard, UserNotification } from "../types";

interface NavbarProps {
  dashboards: Dashboard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUploadClick: () => void;
  notifications: UserNotification[];
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
}

export default function Navbar({
  dashboards,
  selectedId,
  onSelect,
  onUploadClick,
  notifications,
  onMarkAllRead,
  onClearNotifications
}: NavbarProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentUser = auth.currentUser;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Gagal logout:", err);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav id="main-navigation-bar" className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs px-4 sm:px-6 py-3 font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-2 bg-blue-600 text-white rounded-xl">
            <Database className="h-5 w-5" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight hidden sm:inline-block">
            Excel Dashboard
          </span>
        </div>

        {/* Dashboard Selector */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md">
          {dashboards.length > 0 ? (
            <div className="relative">
              <select
                id="dashboard-selector"
                value={selectedId || ""}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm py-2 pl-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer font-medium"
              >
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 font-medium px-2">
              Belum ada file terunggah
            </div>
          )}
        </div>

        {/* User controls / actions */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Create New Dashboard Button */}
          <button
            id="navbar-upload-btn"
            onClick={onUploadClick}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Unggah Excel</span>
          </button>

          {/* Notifications Center Bell */}
          <div ref={notifRef} className="relative">
            <button
              id="notifications-bell-toggle"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all relative cursor-pointer"
              aria-label="Pemberitahuan"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span id="notif-badge" className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {showNotifDropdown && (
              <div 
                id="notifications-dropdown-menu"
                className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 mb-1">
                  <h4 className="font-bold text-gray-800 text-sm">Pemberitahuan</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={onMarkAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto px-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 font-medium">
                      Tidak ada pemberitahuan saat ini.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-3 rounded-xl mb-1 flex gap-2.5 transition-colors ${
                          notif.read ? "bg-white" : "bg-blue-50/20 border-l-2 border-blue-500"
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {notif.type === "success" && <Award className="h-4 w-4 text-emerald-500" />}
                          {notif.type === "info" && <TrendingUp className="h-4 w-4 text-blue-500" />}
                          {notif.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-xs truncate">{notif.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="border-t border-gray-100 mt-1 px-4 pt-2 pb-1 text-center">
                    <button 
                      onClick={onClearNotifications}
                      className="text-xs text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                    >
                      Bersihkan semua
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              id="profile-dropdown-toggle"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
            >
              <div className="h-8 w-8 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {currentUser?.isAnonymous ? "T" : currentUser?.email ? currentUser.email[0] : <User className="h-4 w-4" />}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
            </button>

            {showProfileDropdown && (
              <div 
                id="profile-dropdown-menu"
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Akun Aktif</p>
                  <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">
                    {currentUser?.isAnonymous ? "Tamu / Demo User" : currentUser?.email || "Anonymous"}
                  </p>
                </div>

                <button
                  id="signout-btn"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
