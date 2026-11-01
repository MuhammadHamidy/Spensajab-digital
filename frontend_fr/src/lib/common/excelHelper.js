/**
 * Excel & CSV Helper for Digital Library Book Import / Export
 */

export const BOOK_TEMPLATE_COLUMNS = [
  "Judul",
  "ISBN",
  "Pengarang",
  "Penerbit",
  "Tahun",
  "Kategori",
  "NomorPanggil",
  "JumlahEksemplar",
  "Deskripsi",
];

export const SAMPLE_BOOK_IMPORT_DATA = [
  {
    Judul: "Clean Architecture: A Craftsman's Guide to Software Structure",
    ISBN: "978-0134494166",
    Pengarang: "Robert C. Martin",
    Penerbit: "Prentice Hall",
    Tahun: 2017,
    Kategori: "Teknologi",
    NomorPanggil: "005.1 MAR c",
    JumlahEksemplar: 3,
    Deskripsi: "Buku panduan arsitektur perangkat lunak modern untuk memisahkan domain dan infrastruktur.",
  },
  {
    Judul: "Bumi Manusia",
    ISBN: "978-979-97312-3-4",
    Pengarang: "Pramoedya Ananta Toer",
    Penerbit: "Lentera Dipantara",
    Tahun: 1980,
    Kategori: "Sastra & Sejarah",
    NomorPanggil: "813 TOE b",
    JumlahEksemplar: 4,
    Deskripsi: "Kisah roman sejarah pergerakan kebangkitan nasional Indonesia di era kolonial Belanda.",
  },
  {
    Judul: "Atomic Habits: Perubahan Kecil yang Memberikan Hasil Luar Biasa",
    ISBN: "978-602-06-3318-3",
    Pengarang: "James Clear",
    Penerbit: "Gramedia Pustaka Utama",
    Tahun: 2019,
    Kategori: "Pengembangan Diri",
    NomorPanggil: "158.1 CLE a",
    JumlahEksemplar: 5,
    Deskripsi: "Strategi praktis membangun kebiasaan baik dan menghilangkan kebiasaan buruk setiap hari.",
  },
  {
    Judul: "Cosmos: Menjelajahi Alam Semesta",
    ISBN: "978-602-424-695-2",
    Pengarang: "Carl Sagan",
    Penerbit: "Kepustakaan Populer Gramedia",
    Tahun: 2016,
    Kategori: "Sains & Astronomi",
    NomorPanggil: "520 SAG c",
    JumlahEksemplar: 2,
    Deskripsi: "Eksplorasi ilmu falak dan evolusi pemikiran manusia tentang alam semesta yang maha luas.",
  },
];

/**
 * Parses raw CSV or text content into an array of book objects.
 */
export function parseBookCSV(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headerTokens = splitCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCSVLine(lines[i], delimiter);
    if (rawCols.length < 2) continue;

    const row = {};
    headerTokens.forEach((key, idx) => {
      row[key] = (rawCols[idx] || "").trim();
    });

    const title = row["judul"] || row["title"] || rawCols[0] || "";
    const isbn = row["isbn"] || rawCols[1] || "";
    const author = row["pengarang"] || row["author"] || rawCols[2] || "";
    const publisher = row["penerbit"] || row["publisher"] || rawCols[3] || "";
    const year = parseInt(row["tahun"] || row["year"] || rawCols[4] || "2024", 10);
    const category = row["kategori"] || row["category"] || rawCols[5] || "Umum";
    const callNumber = row["nomorpanggil"] || row["call_number"] || row["rak"] || rawCols[6] || "";
    const copies = parseInt(row["jumlaheksemplar"] || row["copies"] || rawCols[7] || "1", 10);
    const desc = row["deskripsi"] || row["description"] || rawCols[8] || "";

    if (title && author) {
      results.push({
        title,
        isbn,
        author,
        publisher,
        publish_year: isNaN(year) ? 2024 : year,
        category,
        call_number: callNumber,
        copies_count: isNaN(copies) || copies <= 0 ? 1 : copies,
        description: desc,
      });
    }
  }

  return results;
}

function splitCSVLine(line, delimiter) {
  const tokens = [];
  let inQuotes = false;
  let current = "";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  tokens.push(current);
  return tokens;
}

/**
 * Triggers client-side browser download for standard CSV / Excel template.
 */
export function downloadBookImportTemplate(includeSample = true) {
  let csvContent = BOOK_TEMPLATE_COLUMNS.join(",") + "\n";
  const dataToExport = includeSample ? SAMPLE_BOOK_IMPORT_DATA : [];

  dataToExport.forEach((item) => {
    const row = [
      `"${item.Judul.replace(/"/g, '""')}"`,
      `"${item.ISBN}"`,
      `"${item.Pengarang.replace(/"/g, '""')}"`,
      `"${item.Penerbit.replace(/"/g, '""')}"`,
      item.Tahun,
      `"${item.Kategori}"`,
      `"${item.NomorPanggil}"`,
      item.JumlahEksemplar,
      `"${item.Deskripsi.replace(/"/g, '""')}"`,
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "template_import_buku_perpustakaan.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Excel & CSV Helper for Member (Siswa & Guru) Import
 */
export const MEMBER_TEMPLATE_COLUMNS = [
  "NamaLengkap",
  "TipeAnggota",
  "NomorIdentitas",
  "KelasAtauJabatan",
  "Email",
  "NomorHP",
  "BatasPinjam",
];

export const SAMPLE_MEMBER_IMPORT_DATA = [
  {
    NamaLengkap: "Muhammad Rayhan Al-Fatih",
    TipeAnggota: "SISWA",
    NomorIdentitas: "2023010",
    KelasAtauJabatan: "X-IPA-2",
    Email: "rayhan.fatih@sekolah.sch.id",
    NomorHP: "081298765431",
    BatasPinjam: 3,
  },
  {
    NamaLengkap: "Annisa Rahmadani",
    TipeAnggota: "SISWA",
    NomorIdentitas: "2023011",
    KelasAtauJabatan: "XI-IPS-1",
    Email: "annisa.r@sekolah.sch.id",
    NomorHP: "081298765432",
    BatasPinjam: 3,
  },
  {
    NamaLengkap: "Dra. Hj. Sri Wahyuni, M.Pd",
    TipeAnggota: "GURU",
    NomorIdentitas: "NIP. 197805122005012003",
    KelasAtauJabatan: "Guru Biologi",
    Email: "sri.wahyuni@smpn1jabon.sch.id",
    NomorHP: "081387654321",
    BatasPinjam: 5,
  },
  {
    NamaLengkap: "Fajar Nugraha, S.Kom",
    TipeAnggota: "GURU",
    NomorIdentitas: "NIP. 199104152019031005",
    KelasAtauJabatan: "Guru TIK / Lab Komputer",
    Email: "fajar.nugraha@smpn1jabon.sch.id",
    NomorHP: "081387654322",
    BatasPinjam: 5,
  },
  {
    NamaLengkap: "Zahra Salsabila",
    TipeAnggota: "SISWA",
    NomorIdentitas: "2023012",
    KelasAtauJabatan: "XII-IPA-1",
    Email: "zahra.s@sekolah.sch.id",
    NomorHP: "081298765433",
    BatasPinjam: 3,
  },
];

export function parseMemberCSV(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headerTokens = splitCSVLine(lines[0], delimiter).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCSVLine(lines[i], delimiter);
    if (rawCols.length < 2) continue;

    const row = {};
    headerTokens.forEach((key, idx) => {
      row[key] = (rawCols[idx] || "").trim();
    });

    const fullName =
      row["namalengkap"] || row["nama"] || row["name"] || rawCols[0] || "";
    let memberType = (
      row["tipeanggota"] ||
      row["tipe"] ||
      row["role"] ||
      rawCols[1] ||
      "SISWA"
    ).toUpperCase();
    if (memberType.includes("GURU") || memberType.includes("TEACHER")) {
      memberType = "GURU";
    } else {
      memberType = "SISWA";
    }

    const identityNumber =
      row["nomoridentitas"] ||
      row["nisn"] ||
      row["nip"] ||
      row["nim"] ||
      rawCols[2] ||
      "";
    const className =
      row["kelasataujabatan"] ||
      row["kelas"] ||
      row["jabatan"] ||
      row["rombel"] ||
      rawCols[3] ||
      (memberType === "GURU" ? "Tenaga Pendidik" : "X-Umum");
    const email = row["email"] || rawCols[4] || "";
    const phone = row["nomorhp"] || row["hp"] || row["telepon"] || rawCols[5] || "";
    const limit = parseInt(
      row["bataspinjam"] || row["limit"] || rawCols[6] || (memberType === "GURU" ? "5" : "3"),
      10
    );

    if (fullName) {
      results.push({
        id: `usr-${Date.now()}-${i}`,
        full_name: fullName,
        member_type: memberType,
        identity_number: identityNumber || `ID-${Date.now()}-${i}`,
        class_name: className,
        email: email,
        phone: phone,
        max_borrow_limit: isNaN(limit) ? (memberType === "GURU" ? 5 : 3) : limit,
        is_enrolled: false,
        photo_url: null,
      });
    }
  }

  return results;
}

export function downloadMemberImportTemplate(includeSample = true) {
  let csvContent = MEMBER_TEMPLATE_COLUMNS.join(",") + "\n";
  const dataToExport = includeSample ? SAMPLE_MEMBER_IMPORT_DATA : [];

  dataToExport.forEach((item) => {
    const row = [
      `"${item.NamaLengkap.replace(/"/g, '""')}"`,
      `"${item.TipeAnggota}"`,
      `"${item.NomorIdentitas}"`,
      `"${item.KelasAtauJabatan}"`,
      `"${item.Email}"`,
      `"${item.NomorHP}"`,
      item.BatasPinjam,
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "template_import_anggota_perpustakaan.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
