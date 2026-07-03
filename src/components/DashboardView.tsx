import React, { useState, useMemo } from "react";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area
} from "recharts";
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Download, 
  Filter, 
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Info
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Dashboard } from "../types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface DashboardViewProps {
  dashboard: Dashboard;
  onRefresh: () => void;
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f43f5e"  // Rose
];

export default function DashboardView({ dashboard, onRefresh }: DashboardViewProps) {
  // Filters state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // CRUD Dialog Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Exporting state
  const [isExporting, setIsExporting] = useState(false);

  // Extract list of all values for filters dynamically
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    
    dashboard.dashboardConfig.filters.forEach((filter) => {
      const uniqueVals = Array.from(
        new Set(
          dashboard.dataset
            .map((row) => String(row[filter.column] ?? ""))
            .filter((val) => val.trim() !== "")
        )
      );
      options[filter.column] = uniqueVals;
    });

    return options;
  }, [dashboard]);

  // Filter and Search Dataset
  const filteredDataset = useMemo(() => {
    return dashboard.dataset.filter((row) => {
      // 1. Column filters
      const matchFilters = Object.entries(selectedFilters).every(([col, val]) => {
        if (!val) return true;
        return String(row[col] ?? "") === val;
      });

      // 2. Text Search Query
      const matchSearch = searchQuery.trim() === "" || Object.values(row).some((cell) => {
        return String(cell ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      });

      return matchFilters && matchSearch;
    });
  }, [dashboard, selectedFilters, searchQuery]);

  // Recalculate KPIs based on filtered data!
  const kpiValues = useMemo(() => {
    return dashboard.dashboardConfig.kpis.map((kpi) => {
      let value = 0;
      const count = filteredDataset.length;

      if (count === 0) return { ...kpi, value: 0 };

      if (kpi.operation === "count") {
        value = count;
      } else {
        const column = kpi.column;
        if (!column) return { ...kpi, value: count };

        const numericValues = filteredDataset
          .map((row) => Number(row[column]))
          .filter((v) => !isNaN(v));

        if (numericValues.length === 0) {
          value = 0;
        } else if (kpi.operation === "sum") {
          value = numericValues.reduce((a, b) => a + b, 0);
        } else if (kpi.operation === "average") {
          value = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        } else if (kpi.operation === "max") {
          value = Math.max(...numericValues);
        } else if (kpi.operation === "min") {
          value = Math.min(...numericValues);
        }
      }

      return {
        ...kpi,
        value: Number(value.toFixed(2))
      };
    });
  }, [filteredDataset, dashboard]);

  // Helper to format values elegantly based on prefixes and suffixes
  const formatValue = (val: number, prefix = "", suffix = "") => {
    let formatted = val.toLocaleString("id-ID");
    return `${prefix}${formatted}${suffix}`;
  };

  // Generate chart data by grouping and aggregating
  const chartDataList = useMemo(() => {
    return dashboard.dashboardConfig.charts.map((chart) => {
      const groups: Record<string, { total: number; sum: number; count: number }> = {};

      filteredDataset.forEach((row) => {
        let xVal = row[chart.xAxisColumn];
        if (xVal === undefined || xVal === null || xVal === "") {
          xVal = "(Kosong)";
        } else if (typeof xVal === "boolean") {
          xVal = xVal ? "Ya" : "Tidak";
        } else {
          xVal = String(xVal);
        }

        let yVal = Number(row[chart.yAxisColumn]);
        if (isNaN(yVal)) {
          yVal = 0;
        }

        if (!groups[xVal]) {
          groups[xVal] = { total: 0, sum: 0, count: 0 };
        }

        if (chart.operation === "sum") {
          groups[xVal].total += yVal;
        } else if (chart.operation === "average") {
          groups[xVal].sum += yVal;
          groups[xVal].count += 1;
        } else if (chart.operation === "count") {
          groups[xVal].total += 1;
        }
      });

      const aggregated = Object.entries(groups).map(([name, data]) => {
        let finalVal = data.total;
        if (chart.operation === "average" && data.count > 0) {
          finalVal = Number((data.sum / data.count).toFixed(2));
        }
        return {
          name,
          nilai: finalVal
        };
      });

      // Sort or limit categories to 15 to ensure readability
      return aggregated.slice(0, 15);
    });
  }, [filteredDataset, dashboard]);

  // Pagination bounds
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDataset.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDataset, currentPage]);

  const totalPages = Math.ceil(filteredDataset.length / itemsPerPage);

  // Clear filters
  const resetFilters = () => {
    setSelectedFilters({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Trigger modal for creating row
  const openCreateModal = () => {
    const emptyForm: Record<string, any> = {};
    dashboard.headers.forEach((h) => {
      emptyForm[h] = "";
    });
    setFormData(emptyForm);
    setModalMode("create");
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  // Trigger modal for editing row
  const openEditModal = (row: Record<string, any>, actualIndex: number) => {
    setFormData({ ...row });
    setModalMode("edit");
    setEditingIndex(actualIndex);
    setIsModalOpen(true);
  };

  // Handle Form Change
  const handleFormChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Submit Add / Edit row to Firestore
  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedDataset = [...dashboard.dataset];
      
      // Attempt to cast numeric inputs to actual numbers
      const castedForm = { ...formData };
      dashboard.headers.forEach((header) => {
        const val = castedForm[header];
        if (val !== "" && !isNaN(Number(val))) {
          castedForm[header] = Number(val);
        }
      });

      if (modalMode === "create") {
        updatedDataset.unshift(castedForm); // Add to beginning
      } else if (modalMode === "edit" && editingIndex !== null) {
        updatedDataset[editingIndex] = castedForm;
      }

      // Update Firestore document
      const docRef = doc(db, "dashboards", dashboard.id);
      await updateDoc(docRef, {
        dataset: updatedDataset
      });

      setIsModalOpen(false);
      onRefresh();

    } catch (err) {
      console.error("Gagal menyimpan baris data:", err);
      alert("Gagal memperbarui data. Coba lagi.");
    }
  };

  // Delete specific row
  const handleDeleteRow = async (actualIndex: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus baris data ini?")) return;

    try {
      const updatedDataset = [...dashboard.dataset];
      updatedDataset.splice(actualIndex, 1);

      const docRef = doc(db, "dashboards", dashboard.id);
      await updateDoc(docRef, {
        dataset: updatedDataset
      });

      onRefresh();
    } catch (err) {
      console.error("Gagal menghapus baris data:", err);
      alert("Gagal menghapus data.");
    }
  };

  // Export visual dashboard capturing HTML node using html2canvas and jsPDF
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const captureNode = document.getElementById("dashboard-capture-area");
      if (!captureNode) throw new Error("Capture node not found");

      const canvas = await html2canvas(captureNode, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page dashboards cleanly
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Laporan_Dashboard_${dashboard.title.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Gagal memproses ekspor PDF:", err);
      alert("Gagal mengekspor PDF. Pastikan browser Anda mendukung canvas.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 font-sans">
      
      {/* Dashboard Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 id="dashboard-main-title" className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            {dashboard.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{dashboard.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* PDF Report Export Button */}
          <button
            id="export-pdf-btn"
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Membuat PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Ekspor Laporan PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div id="filters-panel" className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs mb-6">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
          <SlidersHorizontal className="h-4 w-4 text-blue-500" />
          <h3 className="font-bold text-gray-800 text-sm">Filter & Pencarian Dinamis</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* General Text Search */}
          <div className="flex flex-col">
            <label htmlFor="search-box" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Cari Data
            </label>
            <div className="relative">
              <input
                id="search-box"
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Ketik kata kunci..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs py-2.5 pl-9 pr-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {/* Dynamic Column Filters suggested by Gemini */}
          {dashboard.dashboardConfig.filters.map((filter) => (
            <div key={filter.column} className="flex flex-col">
              <label htmlFor={`filter-${filter.column}`} className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {filter.label}
              </label>
              <div className="relative">
                <select
                  id={`filter-${filter.column}`}
                  value={selectedFilters[filter.column] || ""}
                  onChange={(e) => {
                    setSelectedFilters((prev) => ({
                      ...prev,
                      [filter.column]: e.target.value
                    }));
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs py-2.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">Semua</option>
                  {(filterOptions[filter.column] || []).map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Clear Filters Button */}
          <div className="flex items-end">
            {(Object.values(selectedFilters).some(Boolean) || searchQuery) ? (
              <button
                id="reset-filters-btn"
                onClick={resetFilters}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Bersihkan Filter</span>
              </button>
            ) : (
              <div className="text-xs text-gray-400 font-medium pb-3 px-2 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-gray-300" />
                <span>Filter aktif merefresh visualisasi</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Capture Area for PDF Export */}
      <div id="dashboard-capture-area" className="space-y-6">
        
        {/* Dataset Insight / Summary */}
        <div id="dashboard-ai-summary" className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-blue-500/10 rounded-2xl p-5 flex items-start gap-3.5">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Wawasan Analis AI</h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {dashboard.dashboardConfig.summary} Menampilkan <span className="font-semibold text-blue-600">{filteredDataset.length}</span> dari total {dashboard.dataset.length} data baris.
            </p>
          </div>
        </div>

        {/* Dynamic KPI Cards Section */}
        <div id="kpis-container" className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {kpiValues.map((kpi, idx) => (
            <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  {kpi.title}
                </span>
                <span id={`kpi-${idx}-value`} className="text-2xl font-extrabold text-gray-900 tracking-tight block">
                  {formatValue(kpi.value, kpi.prefix, kpi.suffix)}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 mt-3 font-semibold uppercase tracking-wider flex items-center gap-1.5 border-t border-gray-50 pt-2.5">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Operasi: {kpi.operation} ({kpi.column || "Semua baris"})
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Recharts Section */}
        <div id="charts-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {dashboard.dashboardConfig.charts.map((chart, idx) => {
            const chartData = chartDataList[idx];

            return (
              <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm truncate">{chart.title}</h4>
                  {chart.description && (
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{chart.description}</p>
                  )}
                </div>

                <div className="h-64 mt-4 w-full text-xs">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Tidak ada data yang cocok.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === "bar" ? (
                        <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #f3f4f6" }} />
                          <Bar dataKey="nilai" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      ) : chart.type === "line" ? (
                        <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #f3f4f6" }} />
                          <Line type="monotone" dataKey="nilai" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
                        </RechartsLineChart>
                      ) : chart.type === "area" ? (
                        <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #f3f4f6" }} />
                          <Area type="monotone" dataKey="nilai" stroke="#6366f1" fill="#e0e7ff" />
                        </RechartsAreaChart>
                      ) : (
                        <RechartsPieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="nilai"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #f3f4f6" }} />
                        </RechartsPieChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="border-t border-gray-50 pt-3 mt-3 text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
                  <span>Sumbu X: {chart.xAxisColumn}</span>
                  <span>Y: {chart.yAxisColumn} ({chart.operation})</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* CRUD Data Table Section */}
      <div id="data-table-section" className="bg-white border border-gray-100 rounded-2xl shadow-xs mt-6 overflow-hidden">
        
        {/* Table Title and Add Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Tabel Dataset</h3>
            <p className="text-xs text-gray-500 mt-0.5">Kelola data baris dengan menambah, mengedit, atau menghapus item secara langsung.</p>
          </div>
          <button
            id="add-row-btn"
            onClick={openCreateModal}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Baris</span>
          </button>
        </div>

        {/* Table element */}
        <div className="overflow-x-auto">
          {filteredDataset.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs font-semibold">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              Tidak ada data yang cocok dengan kriteria pencarian atau filter Anda.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-3.5">No</th>
                  {dashboard.headers.slice(0, 7).map((header) => (
                    <th key={header} className="px-6 py-3.5">{header}</th>
                  ))}
                  {dashboard.headers.length > 7 && <th className="px-6 py-3.5">...</th>}
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedRows.map((row, index) => {
                  const actualIndex = dashboard.dataset.indexOf(row);
                  const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr key={index} className="hover:bg-gray-50/20 text-gray-700">
                      <td className="px-6 py-3.5 font-medium text-gray-400">{displayIndex}</td>
                      {dashboard.headers.slice(0, 7).map((header) => {
                        const val = row[header];
                        return (
                          <td key={header} className="px-6 py-3.5 font-medium max-w-xs truncate">
                            {val !== null && val !== undefined ? String(val) : "-"}
                          </td>
                        );
                      })}
                      {dashboard.headers.length > 7 && <td className="px-6 py-3.5 font-medium text-gray-400">...</td>}
                      <td className="px-6 py-3.5 text-right flex items-center justify-end gap-2.5">
                        <button
                          id={`edit-row-${index}-btn`}
                          onClick={() => openEditModal(row, actualIndex)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Baris"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`delete-row-${index}-btn`}
                          onClick={() => handleDeleteRow(actualIndex)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Baris"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/30 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Menampilkan <span className="font-semibold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> hingga{" "}
              <span className="font-semibold text-gray-800">
                {Math.min(currentPage * itemsPerPage, filteredDataset.length)}
              </span>{" "}
              dari <span className="font-semibold text-gray-800">{filteredDataset.length}</span> baris
            </p>

            <div className="flex items-center gap-2">
              <button
                id="prev-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                className="p-1.5 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700 px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                id="next-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                className="p-1.5 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Row Modal (Create / Edit) */}
      {isModalOpen && (
        <div id="row-crud-modal" className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden font-sans border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h4 className="font-bold text-gray-900 text-sm">
                {modalMode === "create" ? "Tambah Baris Data Baru" : "Edit Baris Data"}
              </h4>
              <button
                id="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRow} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {dashboard.headers.map((header) => (
                <div key={header} className="flex flex-col">
                  <label htmlFor={`input-${header}`} className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {header}
                  </label>
                  <input
                    id={`input-${header}`}
                    type="text"
                    value={formData[header] ?? ""}
                    onChange={(e) => handleFormChange(header, e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder={`Masukkan nilai untuk ${header}...`}
                  />
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  id="cancel-modal-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="save-modal-btn"
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
