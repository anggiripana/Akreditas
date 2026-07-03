import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!ai });
  });

  // API Route to Analyze Excel Meta and suggest dashboard
  app.post("/api/analyze-excel", async (req: any, res: any) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Kunci API Gemini tidak dikonfigurasi di server." });
      }

      const { headers, sampleRows, rowCount } = req.body;

      if (!headers || !sampleRows) {
        return res.status(400).json({ error: "Header atau baris sampel data tidak ditemukan." });
      }

      const prompt = `
Anda adalah seorang analis data ahli. Saya memiliki dataset Excel/CSV dengan total ${rowCount || sampleRows.length} baris.
Berikut adalah kolom-kolomnya (headers): ${JSON.stringify(headers)}
Berikut adalah beberapa baris contoh data (maksimum 10 baris) dalam bentuk JSON:
${JSON.stringify(sampleRows, null, 2)}

Tugas Anda adalah menganalisis karakteristik data ini secara otomatis dan membuat konfigurasi dashboard interaktif dalam format JSON.
Kembalikan respon HANYA dalam bentuk JSON murni tanpa pembungkus markdown (tanpa \`\`\`json dan \`\`\`), yang mengikuti struktur ini:

{
  "summary": "Ringkasan analisis singkat (1-2 kalimat) tentang dataset ini, kegunaan utamanya, dan apa yang bisa dipelajari.",
  "kpis": [
    {
      "title": "Judul KPI (misalnya: Total Penjualan, Rata-rata Rating, Jumlah Pengguna, Transaksi Tertinggi)",
      "column": "Nama kolom yang digunakan untuk kalkulasi (atau null jika hanya menghitung jumlah baris/count)",
      "operation": "sum | average | count | max | min",
      "prefix": "Awalan angka jika ada (misalnya: 'Rp ', '$')",
      "suffix": "Akhiran angka jika ada (misalnya: ' unit', '%')"
    }
  ],
  "charts": [
    {
      "title": "Judul Grafik (misalnya: Tren Penjualan Bulanan, Distribusi Kategori Produk, Komparasi Status)",
      "type": "bar | line | pie | area",
      "xAxisColumn": "Kolom untuk sumbu X (kategori/tanggal/dimensi/nama)",
      "yAxisColumn": "Kolom untuk sumbu Y (nilai numerik yang akan di-sum, di-average, atau di-count. Jika chart type adalah pie dan xAxisColumn adalah kategori, yAxisColumn bisa kolom numerik atau dihitung dengan operation 'count')",
      "operation": "sum | average | count",
      "description": "Deskripsi singkat mengenai grafik ini dan wawasan yang terbentuk."
    }
  ],
  "filters": [
    {
      "column": "Nama kolom untuk filter (pilih kolom kategori atau status yang memiliki nilai unik sedikit, maksimal 5-10 nilai unik)",
      "label": "Label Filter (misalnya: 'Kategori', 'Status')"
    }
  ],
  "columnConfig": [
    {
      "column": "Nama Kolom",
      "type": "number | date | string",
      "format": "currency | percentage | decimal | date | text"
    }
  ]
}

Berikan rekomendasi yang paling logis dan representatif berdasarkan nama kolom dan contoh data. Pastikan semua nama kolom (column, xAxisColumn, yAxisColumn) benar-benar sama persis dengan yang ada di daftar headers: ${JSON.stringify(headers)}. Jangan membuat nama kolom baru yang tidak ada di headers!
Kpis minimal 3, charts minimal 3, filters minimal 2. Gunakan bahasa Indonesia yang profesional dan mudah dipahami.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "";
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      const dashboardConfig = JSON.parse(cleanJson);
      return res.json({ dashboardConfig });

    } catch (error: any) {
      console.error("Error analyzing dataset:", error);
      return res.status(500).json({ error: error.message || "Terjadi kesalahan internal saat menganalisis data." });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
