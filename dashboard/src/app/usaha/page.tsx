"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  User,
  MapPin,
  Building,
  CheckCircle2,
  Moon,
  Sun,
  Download,
  RefreshCw,
  Layers,
  ChevronDown,
  X,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Send,
  XCircle,
  AlertCircle
} from "lucide-react";

// Interfaces
interface ScraperRecord {
  searchedEmail: string;
  idCode: string;
  name: string;
  address: string;
  scale: string;
  jumlahUsaha: number;
  status: string;
  officer: string;
  sumberData: string;
  nama_kec: string;
  koseka: string;
  isPrioritas: string;
}

interface PMLPPLRecord {
  nama_petugas: string;
  kec: string;
  jabatan_petugas: string; // 'PML' or 'PPL'
  email: string;
}

interface UsahaStats {
  submit: number;
  approve: number;
  total: number;
}

interface UserUsahaRow {
  nama: string;
  email: string;
  jabatan: string;
  kec: string;
  submit: number;
  approve: number;
  total: number;
}

interface SlsUsahaRow {
  slsCode: string;
  kec: string;
  koseka: string;
  isPrioritas: boolean;
  submit: number;
  approve: number;
  total: number;
}

interface KecUsahaRow {
  kecName: string;
  koseka: string;
  submit: number;
  approve: number;
  total: number;
}

export default function UsahaPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [rawData, setRawData] = useState<ScraperRecord[]>([]);
  const [pmlPplData, setPmlPplData] = useState<PMLPPLRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"user" | "sls" | "kec">("user");
  const [selectedKec, setSelectedKec] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [slsPage, setSlsPage] = useState(1);
  const slsPerPage = 25;

  useEffect(() => {
    setSlsPage(1);
  }, [selectedKec, searchQuery, activeTab]);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dataResponse = await fetch("/update_data.csv");
      if (!dataResponse.ok) {
        throw new Error("Gagal mengambil file update_data.csv.");
      }
      const dataText = await dataResponse.text();

      const pmlPplResponse = await fetch("/pml_ppl.csv");
      if (!pmlPplResponse.ok) {
        throw new Error("Gagal mengambil file pml_ppl.csv.");
      }
      const pmlPplText = await pmlPplResponse.text();

      // Simple CSV parsing
      const parseDataCSV = (csvText: string): ScraperRecord[] => {
        const lines = csvText.split("\n");
        const parsed: ScraperRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const row: string[] = [];
          let insideQuote = false;
          let entry = "";

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === "," && !insideQuote) {
              row.push(entry);
              entry = "";
            } else {
              entry += char;
            }
          }
          row.push(entry);

          if (row.length >= 17 && row[1] && row[1].trim() !== "" && row[1] !== "Kode Identitas") {
            const parsedJU = parseInt(row[8].replace(/"/g, "").trim());
            parsed.push({
              searchedEmail: row[0].replace(/"/g, "").trim().toLowerCase(),
              idCode: row[1].replace(/"/g, "").trim(),
              name: row[2].replace(/"/g, "").trim(),
              address: row[3].replace(/"/g, "").trim(),
              scale: row[7].replace(/"/g, "").trim(),
              jumlahUsaha: isNaN(parsedJU) ? 0 : parsedJU,
              status: row[12].replace(/"/g, "").trim(),
              officer: row[14].replace(/"/g, "").trim(),
              sumberData: row[16] ? row[16].replace(/"/g, "").trim() : "",
              nama_kec: row[17] ? row[17].replace(/"/g, "").trim() : "",
              koseka: row[18] ? row[18].replace(/"/g, "").trim() : "",
              isPrioritas: row[19] ? row[19].replace(/"/g, "").trim() : "Tidak",
            });
          }
        }
        return parsed;
      };

      const parsePMLPPL = (csvText: string): PMLPPLRecord[] => {
        const lines = csvText.split("\n");
        const parsed: PMLPPLRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(";");
          if (parts.length >= 4) {
            parsed.push({
              nama_petugas: parts[0].replace(/"/g, "").trim(),
              kec: parts[1].replace(/"/g, "").trim(),
              jabatan_petugas: parts[2].replace(/"/g, "").trim().toUpperCase(),
              email: parts[3].replace(/"/g, "").trim().toLowerCase(),
            });
          }
        }
        return parsed;
      };

      setRawData(parseDataCSV(dataText));
      setPmlPplData(parsePMLPPL(pmlPplText));

      let loadedTimestamp = "";
      try {
        const timeResponse = await fetch("/last_updated.txt");
        if (timeResponse.ok) {
          loadedTimestamp = (await timeResponse.text()).trim();
        }
      } catch (e) {
        console.warn("Gagal mengambil file last_updated.txt.");
      }

      if (loadedTimestamp) {
        setLastUpdated(loadedTimestamp);
      } else {
        const now = new Date();
        setLastUpdated(now.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }) + " WITA");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format Helper
  const formatKecName = (name: string): string => {
    if (!name) return "";
    let cleaned = name.replace(/\(\d+\)/g, "").trim();
    return cleaned
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const normalizeKec = (name: string): string => {
    if (!name) return "";
    return name.replace(/\(\d+\)/g, "").trim().toUpperCase();
  };

  // Lists
  const uniqueKecList = useMemo(() => {
    const fromRaw = rawData.map(r => formatKecName(r.nama_kec)).filter(Boolean);
    const fromPmlPpl = pmlPplData.map(item => formatKecName(item.kec)).filter(Boolean);
    return Array.from(new Set([...fromRaw, ...fromPmlPpl])).sort();
  }, [rawData, pmlPplData]);

  // Table calculations
  // 1. User/Officer Table
  const userUsahaStats = useMemo<UserUsahaRow[]>(() => {
    return pmlPplData.map(officer => {
      const email = officer.email.toLowerCase();
      const isPpl = officer.jabatan_petugas === "PPL";

      let submitCount = 0;
      let approveCount = 0;

      if (isPpl) {
        // Direct matching for PPL (PCL)
        const records = rawData.filter(r => r.searchedEmail === email);
        records.forEach(r => {
          const status = r.status.toLowerCase().trim();
          const isSubmit = status === "submitted by pencacah" || status === "submit" || status === "submitted";
          const isApprove = status === "approved by pengawas" || status === "approve" || status === "approved";
          
          if (isSubmit) submitCount += r.jumlahUsaha;
          if (isApprove) approveCount += r.jumlahUsaha;
        });
      } else {
        // PML PML matches PPLs of same kecamatan
        const normalizedKecName = normalizeKec(officer.kec);
        const pplEmails = new Set(
          pmlPplData
            .filter(item => item.jabatan_petugas === "PPL" && normalizeKec(item.kec) === normalizedKecName)
            .map(ppl => ppl.email.toLowerCase())
        );

        const records = rawData.filter(r => pplEmails.has(r.searchedEmail) || normalizeKec(r.nama_kec) === normalizedKecName);
        records.forEach(r => {
          const status = r.status.toLowerCase().trim();
          const isSubmit = status === "submitted by pencacah" || status === "submit" || status === "submitted";
          const isApprove = status === "approved by pengawas" || status === "approve" || status === "approved";

          if (isSubmit) submitCount += r.jumlahUsaha;
          if (isApprove) approveCount += r.jumlahUsaha;
        });
      }

      return {
        nama: officer.nama_petugas,
        email: officer.email,
        jabatan: officer.jabatan_petugas,
        kec: officer.kec,
        submit: submitCount,
        approve: approveCount,
        total: submitCount + approveCount
      };
    }).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [rawData, pmlPplData]);

  const filteredUserUsahaStats = useMemo(() => {
    return userUsahaStats.filter(row => {
      const matchKec = selectedKec === "all" ? true : normalizeKec(row.kec) === normalizeKec(selectedKec);
      if (!matchKec) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return row.nama.toLowerCase().includes(q) || row.email.toLowerCase().includes(q) || row.kec.toLowerCase().includes(q);
    });
  }, [userUsahaStats, selectedKec, searchQuery]);

  // 2. SLS Table
  const slsUsahaStats = useMemo<SlsUsahaRow[]>(() => {
    const slsMap: { [code: string]: SlsUsahaRow } = {};

    rawData.forEach(r => {
      const digits = r.idCode.replace(/\D/g, "");
      if (digits.length < 14) return;
      const slsCode = digits.substring(0, 14);

      if (!slsMap[slsCode]) {
        slsMap[slsCode] = {
          slsCode,
          kec: formatKecName(r.nama_kec),
          koseka: r.koseka || "-",
          isPrioritas: r.isPrioritas === "Ya",
          submit: 0,
          approve: 0,
          total: 0
        };
      }

      const status = r.status.toLowerCase().trim();
      const isSubmit = status === "submitted by pencacah" || status === "submit" || status === "submitted";
      const isApprove = status === "approved by pengawas" || status === "approve" || status === "approved";

      if (isSubmit) slsMap[slsCode].submit += r.jumlahUsaha;
      if (isApprove) slsMap[slsCode].approve += r.jumlahUsaha;
      slsMap[slsCode].total = slsMap[slsCode].submit + slsMap[slsCode].approve;
    });

    return Object.values(slsMap).sort((a, b) => a.slsCode.localeCompare(b.slsCode));
  }, [rawData]);

  const filteredSlsUsahaStats = useMemo(() => {
    return slsUsahaStats.filter(row => {
      const matchKec = selectedKec === "all" ? true : normalizeKec(row.kec) === normalizeKec(selectedKec);
      if (!matchKec) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return row.slsCode.includes(q) || row.kec.toLowerCase().includes(q) || row.koseka.toLowerCase().includes(q);
    });
  }, [slsUsahaStats, selectedKec, searchQuery]);

  const paginatedSlsUsahaStats = useMemo(() => {
    const start = (slsPage - 1) * slsPerPage;
    return filteredSlsUsahaStats.slice(start, start + slsPerPage);
  }, [filteredSlsUsahaStats, slsPage]);

  const totalSlsPages = Math.ceil(filteredSlsUsahaStats.length / slsPerPage) || 1;

  // 3. Kecamatan Table
  const kecUsahaStats = useMemo<KecUsahaRow[]>(() => {
    const statsMap: { [name: string]: KecUsahaRow } = {};

    uniqueKecList.forEach(kec => {
      const normalizedKecName = normalizeKec(kec);
      const record = rawData.find(r => normalizeKec(r.nama_kec) === normalizedKecName);
      const kosekaName = record ? record.koseka : "-";

      statsMap[kec] = {
        kecName: kec,
        koseka: kosekaName,
        submit: 0,
        approve: 0,
        total: 0
      };

      // Aggregate all matching records for this subdistrict
      const pplsInKec = pmlPplData.filter(item => item.jabatan_petugas === "PPL" && normalizeKec(item.kec) === normalizedKecName);
      const emailsInKec = new Set(pplsInKec.map(ppl => ppl.email.toLowerCase()));

      const records = rawData.filter(r => emailsInKec.has(r.searchedEmail) || normalizeKec(r.nama_kec) === normalizedKecName);
      records.forEach(r => {
        const status = r.status.toLowerCase().trim();
        const isSubmit = status === "submitted by pencacah" || status === "submit" || status === "submitted";
        const isApprove = status === "approved by pengawas" || status === "approve" || status === "approved";

        if (isSubmit) statsMap[kec].submit += r.jumlahUsaha;
        if (isApprove) statsMap[kec].approve += r.jumlahUsaha;
        statsMap[kec].total = statsMap[kec].submit + statsMap[kec].approve;
      });
    });

    return Object.values(statsMap).sort((a, b) => a.kecName.localeCompare(b.kecName));
  }, [rawData, pmlPplData, uniqueKecList]);

  const filteredKecUsahaStats = useMemo(() => {
    return kecUsahaStats.filter(row => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return row.kecName.toLowerCase().includes(q) || row.koseka.toLowerCase().includes(q);
    });
  }, [kecUsahaStats, searchQuery]);

  // Overall totals
  const totalSummary = useMemo(() => {
    let submitTotal = 0;
    let approveTotal = 0;

    // Use rawData to get overall true total
    rawData.forEach(r => {
      const status = r.status.toLowerCase().trim();
      const isSubmit = status === "submitted by pencacah" || status === "submit" || status === "submitted";
      const isApprove = status === "approved by pengawas" || status === "approve" || status === "approved";

      if (isSubmit) submitTotal += r.jumlahUsaha;
      if (isApprove) approveTotal += r.jumlahUsaha;
    });

    return {
      submit: submitTotal,
      approve: approveTotal,
      total: submitTotal + approveTotal
    };
  }, [rawData]);

  // CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `monitoring_usaha_${activeTab}_${Date.now()}.csv`;

    if (activeTab === "user") {
      headers = ["Nama Petugas", "Email", "Jabatan", "Kecamatan", "Jumlah Usaha Submit", "Jumlah Usaha Approve", "Total Usaha"];
      rows = filteredUserUsahaStats.map(r => [
        `"${r.nama}"`,
        `"${r.email}"`,
        `"${r.jabatan}"`,
        `"${formatKecName(r.kec)}"`,
        r.submit,
        r.approve,
        r.total
      ]);
    } else if (activeTab === "sls") {
      headers = ["Kode SLS", "Kecamatan", "Koseka", "Prioritas", "Jumlah Usaha Submit", "Jumlah Usaha Approve", "Total Usaha"];
      rows = filteredSlsUsahaStats.map(r => [
        `"${r.slsCode}"`,
        `"${formatKecName(r.kec)}"`,
        `"${r.koseka}"`,
        r.isPrioritas ? "Ya" : "Tidak",
        r.submit,
        r.approve,
        r.total
      ]);
    } else {
      headers = ["Nama Kecamatan", "Koseka", "Jumlah Usaha Submit", "Jumlah Usaha Approve", "Total Usaha"];
      rows = filteredKecUsahaStats.map(r => [
        `"${formatKecName(r.kecName)}"`,
        `"${r.koseka}"`,
        r.submit,
        r.approve,
        r.total
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Header Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl p-1 shadow-md border border-slate-200 dark:border-slate-700">
              <img src="/icon.png" alt="Logo BPS" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                BPS Kabupaten Kepulauan Sangihe
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dashboard Monitoring Sensus Ekonomi 2026
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50/50 dark:bg-slate-950/50">
              <a 
                href="/" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Dashboard
              </a>
              <a 
                href="/tabulasi" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Tabulasi
              </a>
              <a 
                href="/petugas" 
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Petugas
              </a>
              <a 
                href="/usaha" 
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-orange-500 text-white shadow-sm"
              >
                Usaha
              </a>
            </nav>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Ganti Tema"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner Title */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 to-amber-500 p-8 sm:p-10 text-white shadow-xl shadow-orange-600/10 mb-8">
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-white/10 blur-3xl translate-x-20 -translate-y-20"></div>
          <div className="absolute right-1/4 bottom-0 w-60 h-60 rounded-full bg-orange-400/20 blur-2xl translate-y-20"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/20 text-white mb-3 inline-block">
                Monitoring Jumlah Usaha
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                Rekapitulasi Jumlah Usaha
              </h2>
              <p className="text-sm sm:text-lg text-orange-50 max-w-2xl font-light">
                Monitoring total jumlah usaha dengan status **SUBMITTED** dan **APPROVED** per Petugas, SLS, dan Kecamatan.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 self-start md:self-auto flex flex-col items-end border border-white/10 text-right">
              <span className="text-xs text-orange-200">Terakhir Diperbarui</span>
              <span className="text-base font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                {loading ? "Menyinkronkan..." : lastUpdated || "Belum ada data"}
              </span>
            </div>
          </div>
        </div>

        {/* Loading/Error state */}
        {loading && rawData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse text-sm">
              Mengekstrak dan Memproses Data Usaha BPS FASIH...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center mb-8">
            <AlertCircle className="w-10 h-10 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Terjadi Kesalahan</h3>
            <p className="text-sm opacity-90 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-semibold"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
              <button
                onClick={() => { setActiveTab("user"); setSelectedKec("all"); }}
                className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "user"
                    ? "border-orange-500 text-orange-500 dark:text-orange-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <User className="w-4 h-4" />
                Rekap per Petugas
              </button>
              <button
                onClick={() => { setActiveTab("sls"); setSelectedKec("all"); }}
                className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "sls"
                    ? "border-orange-500 text-orange-500 dark:text-orange-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4" />
                Rekap per SLS
              </button>
              <button
                onClick={() => { setActiveTab("kec"); setSelectedKec("all"); }}
                className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "kec"
                    ? "border-orange-500 text-orange-500 dark:text-orange-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Building className="w-4 h-4" />
                Rekap per Kecamatan
              </button>
            </div>

            {/* Filter Section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
                  
                  {/* Kecamatan Dropdown */}
                  {(activeTab === "user" || activeTab === "sls") && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold w-full sm:w-auto">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <select
                        value={selectedKec}
                        onChange={(e) => setSelectedKec(e.target.value)}
                        className="w-full sm:w-auto py-2.5 px-3.5 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold cursor-pointer"
                      >
                        <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="all">Semua Kecamatan</option>
                        {uniqueKecList.map((kec, idx) => (
                          <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={idx} value={kec}>{kec}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <input
                      type="text"
                      placeholder={
                        activeTab === "user" 
                          ? "Cari nama petugas..." 
                          : activeTab === "sls" 
                            ? "Cari kode SLS..." 
                            : "Cari kecamatan..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-semibold text-slate-950 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-950 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-orange-500" />
                  <span>Ekspor CSV</span>
                </button>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                  <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                    Total Usaha Submit
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                    {totalSummary.submit.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                  <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Total Usaha Approve
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {totalSummary.approve.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50">
                  <span className="text-[10px] text-slate-700 dark:text-slate-350 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                    Total Usaha (Submit & Approve)
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 block">
                    {totalSummary.total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Tables */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden">
              <div className="overflow-auto max-h-[700px] w-full">
                
                {activeTab === "user" && (
                  // =================== TABLE 1: USER USASHA ===================
                  <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-left">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)]">
                      <tr className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                        <th className="py-4 px-4 text-center">No</th>
                        <th className="py-4 px-4">Nama Petugas</th>
                        <th className="py-4 px-4">Jabatan</th>
                        <th className="py-4 px-4">Kecamatan</th>
                        <th className="py-4 px-4 text-center">Usaha Submit</th>
                        <th className="py-4 px-4 text-center">Usaha Approve</th>
                        <th className="py-4 px-4 text-center">Total Usaha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {filteredUserUsahaStats.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center text-slate-700 dark:text-slate-300 font-medium">
                            Tidak ada data petugas ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredUserUsahaStats.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800">
                            <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-350">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold">
                              <div>{row.nama}</div>
                              <div className="text-[10px] text-slate-700 dark:text-slate-350 font-normal mt-0.5">{row.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                row.jabatan === "PML" 
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" 
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              }`}>
                                {row.jabatan}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-normal">{formatKecName(row.kec)}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-500">{row.submit.toLocaleString("id-ID")}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-550">{row.approve.toLocaleString("id-ID")}</td>
                            <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/20">{row.total.toLocaleString("id-ID")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "sls" && (
                  // =================== TABLE 2: SLS USASHA ===================
                  <>
                    <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-left">
                      <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)]">
                        <tr className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                          <th className="py-4 px-4 text-center">No</th>
                          <th className="py-4 px-4">Kode SLS</th>
                          <th className="py-4 px-4">Kecamatan</th>
                          <th className="py-4 px-4">Koseka</th>
                          <th className="py-4 px-4 text-center">Usaha Submit</th>
                          <th className="py-4 px-4 text-center">Usaha Approve</th>
                          <th className="py-4 px-4 text-center">Total Usaha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {paginatedSlsUsahaStats.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-16 text-center text-slate-700 dark:text-slate-300 font-medium">
                              Tidak ada data SLS ditemukan.
                            </td>
                          </tr>
                        ) : (
                          paginatedSlsUsahaStats.map((row, idx) => (
                            <tr 
                              key={idx} 
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800 ${
                                row.isPrioritas ? "bg-orange-500/[0.03] dark:bg-orange-500/[0.015]" : ""
                              }`}
                            >
                              <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-350">
                                {(slsPage - 1) * slsPerPage + idx + 1}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-1.5">
                                  <span>{row.slsCode}</span>
                                  {row.isPrioritas && (
                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-orange-500 text-white tracking-wider">Prio</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-normal">{formatKecName(row.kec)}</td>
                              <td className="py-3 px-4 font-normal">{row.koseka}</td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-500">{row.submit.toLocaleString("id-ID")}</td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-550">{row.approve.toLocaleString("id-ID")}</td>
                              <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/20">{row.total.toLocaleString("id-ID")}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {filteredSlsUsahaStats.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          Menampilkan <span className="font-bold text-slate-900 dark:text-white">{Math.min((slsPage - 1) * slsPerPage + 1, filteredSlsUsahaStats.length)}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(slsPage * slsPerPage, filteredSlsUsahaStats.length)}</span> dari <span className="font-bold text-slate-900 dark:text-white">{filteredSlsUsahaStats.length}</span> SLS
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSlsPage(prev => Math.max(prev - 1, 1))}
                            disabled={slsPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            Sebelumnya
                          </button>
                          <button
                            onClick={() => setSlsPage(prev => Math.min(prev + 1, totalSlsPages))}
                            disabled={slsPage === totalSlsPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            Selanjutnya
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "kec" && (
                  // =================== TABLE 3: KECAMATAN USASHA ===================
                  <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-left">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)]">
                      <tr className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
                        <th className="py-4 px-4 text-center">No</th>
                        <th className="py-4 px-4">Nama Kecamatan</th>
                        <th className="py-4 px-4">Koseka</th>
                        <th className="py-4 px-4 text-center">Usaha Submit</th>
                        <th className="py-4 px-4 text-center">Usaha Approve</th>
                        <th className="py-4 px-4 text-center">Total Usaha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {filteredKecUsahaStats.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-16 text-center text-slate-700 dark:text-slate-300 font-medium">
                            Tidak ada data kecamatan ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredKecUsahaStats.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800">
                            <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-350">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold">{formatKecName(row.kecName)}</td>
                            <td className="py-3 px-4 font-normal">{row.koseka}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-500">{row.submit.toLocaleString("id-ID")}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-550">{row.approve.toLocaleString("id-ID")}</td>
                            <td className="py-3 px-4 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/20">{row.total.toLocaleString("id-ID")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Badan Pusat Statistik (BPS) Kabupaten Kepulauan Sangihe. Hak Cipta Dilindungi.</p>
          <p>
            Pengembang:{" "}
            <a
              href="http://hamdani-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              Hamdani
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
