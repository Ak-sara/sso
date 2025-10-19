# KEBIJAKAN PRIVASI DAN PERLINDUNGAN DATA PRIBADI
# AKSARA SSO SYSTEM

**Versi**: 1.0
**Tanggal Berlaku**: [Tanggal]
**Organisasi**: [Nama Perusahaan]

---

## 1. PENDAHULUAN

Kebijakan ini menjelaskan bagaimana [Nama Perusahaan] mengumpulkan, menggunakan, menyimpan, dan melindungi Data Pribadi Anda melalui sistem Aksara SSO (Single Sign-On), sesuai dengan:

- **UU No. 27 Tahun 2022** tentang Perlindungan Data Pribadi
- **PP No. 71 Tahun 2019** tentang Penyelenggaraan Sistem dan Transaksi Elektronik
- **Peraturan Menteri Kominfo No. 20 Tahun 2016** tentang Perlindungan Data Pribadi

---

## 2. DEFINISI

### 2.1 Data Pribadi
Informasi yang dapat mengidentifikasi individu, termasuk:
- **Data Pribadi Umum**: Nama, email, nomor telepon
- **Data Pribadi Spesifik**: NIK (KTP), NPWP, tanggal lahir, informasi kesehatan

### 2.2 Pengendali Data Pribadi
[Nama Perusahaan] sebagai entitas yang menentukan tujuan dan cara pengolahan Data Pribadi.

### 2.3 Pemroses Data Pribadi
Sistem Aksara SSO sebagai sistem yang memproses Data Pribadi atas instruksi Pengendali.

### 2.4 Subjek Data Pribadi
Karyawan, partner, atau pengguna lain yang data pribadinya diolah dalam sistem.

---

## 3. DATA YANG DIKUMPULKAN

### 3.1 Data Akun SSO (Login)
- Email kerja
- Username
- Password (terenkripsi dengan Argon2)
- Nama lengkap
- Peran/role dalam sistem
- Riwayat login (timestamp, IP address)

### 3.2 Data Karyawan
#### A. Data Identitas
- Nama lengkap
- Nomor Induk Karyawan (NIK)
- **NIK (Nomor Induk Kependudukan)** 🔴 *Sensitif*
- **NPWP (Nomor Pokok Wajib Pajak)** 🔴 *Sensitif*
- **Tanggal lahir** 🔴 *Sensitif*
- Jenis kelamin

#### B. Data Kontak
- Email perusahaan
- Email pribadi (opsional)
- Nomor telepon

#### C. Data Kepegawaian
- Organisasi/entitas
- Unit kerja
- Posisi/jabatan
- Tipe kepegawaian (PKWT, tetap, outsource)
- Status kepegawaian (aktif, non-aktif)
- Tanggal bergabung
- Tanggal berakhir kontrak
- Lokasi kerja
- Atasan langsung

#### D. Data Historis
- Riwayat mutasi/transfer
- Riwayat promosi/demosi
- Riwayat penempatan
- SK (Surat Keputusan) terkait

### 3.3 Data Partner/Eksternal
- Nama perusahaan
- Nama kontak
- Email
- Nomor telepon
- Tipe partner
- Nomor kontrak
- Periode kontrak

---

## 4. TUJUAN PENGUMPULAN DATA

### 4.1 Administrasi Kepegawaian
- Manajemen data karyawan
- Manajemen struktur organisasi
- Penempatan dan mutasi karyawan

### 4.2 Akses dan Keamanan Sistem
- Autentikasi pengguna (login/logout)
- Otorisasi akses ke aplikasi terintegrasi
- Audit trail aktivitas sistem

### 4.3 Kewajiban Hukum
- Pelaporan pajak (NPWP)
- Kepatuhan ketenagakerjaan
- Audit internal/eksternal

### 4.4 Integrasi Sistem
- Single Sign-On (SSO) ke aplikasi perusahaan
- Sinkronisasi dengan Microsoft Entra ID
- Provisioning akses otomatis (SCIM)

---

## 5. DASAR HUKUM PENGOLAHAN DATA

Pengolahan Data Pribadi dilakukan berdasarkan:

### 5.1 Persetujuan (Consent)
- Anda memberikan persetujuan eksplisit saat onboarding
- Persetujuan dapat ditarik kapan saja

### 5.2 Kewajiban Kontrak
- Diperlukan untuk melaksanakan kontrak kerja
- Administrasi kepegawaian

### 5.3 Kewajiban Hukum
- Pelaporan pajak (NPWP)
- Compliance dengan UU Ketenagakerjaan

### 5.4 Kepentingan Sah
- Keamanan sistem informasi
- Manajemen organisasi

---

## 6. PENYIMPANAN DAN KEAMANAN DATA

### 6.1 Lokasi Penyimpanan
- **Database**: MongoDB Atlas (cloud server di Singapore)
- **File**: [Sesuai implementasi cloud storage]
- **Backup**: [Lokasi backup]

### 6.2 Enkripsi
- **In Transit**: TLS 1.3 (HTTPS)
- **At Rest**: Field-level encryption untuk data sensitif (NIK, NPWP)
- **Password**: Argon2 hashing

### 6.3 Kontrol Akses
| Role | Akses Data |
|------|------------|
| User | Data pribadi sendiri saja |
| Manager | Data tim langsung (terbatas) |
| HR | Semua data karyawan |
| Admin | Full access (dengan audit) |

### 6.4 Audit Trail
Semua akses ke data sensitif dicatat:
- Siapa mengakses
- Data apa yang diakses
- Kapan diakses
- Dari IP address mana
- Tujuan akses (jika diminta)

### 6.5 Masa Penyimpanan Data
- **Karyawan Aktif**: Selama masa kerja
- **Karyawan Non-Aktif**: 5 tahun (sesuai UU Ketenagakerjaan)
- **Data Sensitif**: 2 tahun setelah keluar
- **Audit Log**: 2 tahun
- **Session Data**: 24 jam

---

## 7. PEMBAGIAN DATA KEPADA PIHAK KETIGA

### 7.1 Pihak yang Berhak Mengakses
- **Internal**: Departemen HR, Finance, Management
- **Eksternal**:
  - Kantor pajak (untuk pelaporan NPWP)
  - BPJS (untuk kepesertaan)
  - Auditor eksternal (dengan perjanjian kerahasiaan)
  - Vendor IT (MongoDB, cloud provider) dengan Data Processing Agreement

### 7.2 Transfer Data Internasional
Data disimpan di server MongoDB Atlas (Singapore). Vendor telah memiliki:
- ISO 27001 certification
- SOC 2 Type II compliance
- Data Processing Agreement yang memenuhi standar UU PDP

### 7.3 Tidak Ada Penjualan Data
Kami **TIDAK PERNAH** menjual atau menyewakan Data Pribadi Anda kepada pihak ketiga.

---

## 8. HAK SUBJEK DATA PRIBADI

Sesuai UU No. 27 Tahun 2022, Anda memiliki hak:

### 8.1 Hak Akses
- Melihat data pribadi Anda yang kami simpan
- Meminta salinan data dalam format terstruktur

**Cara menggunakan**: Login ke Aksara SSO → Profil Saya

### 8.2 Hak Pembetulan
- Memperbaiki data yang tidak akurat
- Melengkapi data yang tidak lengkap

**Cara menggunakan**: Login → Profil Saya → Edit Profil

### 8.3 Hak Penghapusan ("Right to be Forgotten")
- Meminta penghapusan data pribadi
- Berlaku jika tidak ada kewajiban hukum untuk menyimpan

**Cara menggunakan**: Hubungi HR atau DPO

### 8.4 Hak Portabilitas Data
- Meminta data dalam format CSV/JSON
- Memindahkan data ke sistem lain

**Cara menggunakan**: Login → Profil Saya → Export Data

### 8.5 Hak Menolak Pemrosesan
- Menolak pemrosesan untuk tujuan tertentu
- Catatan: Beberapa pemrosesan wajib untuk kontrak kerja

**Cara menggunakan**: Hubungi DPO

### 8.6 Hak Penarikan Persetujuan
- Menarik persetujuan yang telah diberikan
- Tidak berlaku surut untuk pemrosesan sebelumnya

**Cara menggunakan**: Hubungi DPO

### 8.7 Hak Pengajuan Keberatan
- Mengajukan keberatan kepada otoritas pengawas (Kementerian Kominfo)

---

## 9. COOKIES DAN TEKNOLOGI PELACAKAN

### 9.1 Cookie yang Digunakan
- **Session Cookie**: Menyimpan sesi login (httpOnly, secure)
- **Expires**: 24 jam atau saat logout

### 9.2 Tidak Ada Tracking Cookie
Sistem ini **TIDAK** menggunakan:
- Cookie iklan
- Cookie pihak ketiga
- Tracking pixel
- Fingerprinting agresif

---

## 10. PEMBERITAHUAN PELANGGARAN DATA

### 10.1 Kewajiban Pemberitahuan
Jika terjadi pelanggaran data (data breach), kami akan:
- **Dalam 3x24 jam**: Memberitahu Anda dan Kementerian Kominfo
- **Konten Notifikasi**:
  - Data apa yang terkompromi
  - Kapan pelanggaran terjadi
  - Dampak yang mungkin terjadi
  - Langkah yang kami ambil
  - Langkah yang harus Anda ambil

### 10.2 Cara Pemberitahuan
- Email ke alamat email terdaftar
- Notifikasi dalam sistem
- Portal pengumuman resmi perusahaan

---

## 11. PERUBAHAN KEBIJAKAN

### 11.1 Update Berkala
Kebijakan ini dapat berubah seiring:
- Perubahan regulasi
- Perubahan operasional
- Peningkatan keamanan

### 11.2 Notifikasi Perubahan
Kami akan memberitahu Anda:
- 30 hari sebelum perubahan berlaku
- Melalui email dan notifikasi sistem
- Memberikan opsi untuk meninjau perubahan

---

## 12. DATA PROTECTION OFFICER (DPO)

### Kontak DPO
**Nama**: [Nama DPO]
**Jabatan**: Data Protection Officer
**Email**: dpo@[perusahaan].co.id
**Telepon**: [Nomor Telepon]
**Alamat**: [Alamat Kantor]

**Jam Kerja**: Senin-Jumat, 09:00-17:00 WIB

### Kapan Menghubungi DPO?
- Pertanyaan tentang data pribadi Anda
- Menggunakan hak subjek data
- Melaporkan dugaan pelanggaran privasi
- Komplain tentang pemrosesan data
- Permintaan penghapusan data

---

## 13. OTORITAS PENGAWAS

Jika Anda tidak puas dengan respons kami, Anda dapat mengajukan keluhan ke:

**Kementerian Komunikasi dan Informatika RI**
Direktorat Jenderal Aplikasi Informatika
Jl. Medan Merdeka Barat No. 9, Jakarta Pusat 10110
Email: kontakkami@kominfo.go.id
Website: www.kominfo.go.id

---

## 14. PERSETUJUAN

Dengan menggunakan sistem Aksara SSO, Anda menyatakan telah:
- ✅ Membaca dan memahami Kebijakan Privasi ini
- ✅ Menyetujui pengumpulan dan pemrosesan Data Pribadi Anda
- ✅ Memahami hak-hak Anda sebagai Subjek Data Pribadi

---

## 15. KONTAK

Untuk pertanyaan tentang kebijakan ini:

**Email**: privacy@[perusahaan].co.id
**Telepon**: [Nomor Telepon]
**Alamat**: [Alamat Kantor]

---

**Terakhir Diperbarui**: [Tanggal]
**Versi**: 1.0
**Berlaku Sejak**: [Tanggal]

---

## LAMPIRAN A: FORMULIR PERSETUJUAN

[Lihat file terpisah: FORMULIR_PERSETUJUAN.md]

## LAMPIRAN B: PROSEDUR PENGGUNAAN HAK

[Lihat file terpisah: PROSEDUR_HAK_SUBJEK_DATA.md]

## LAMPIRAN C: REGISTER AKTIVITAS PENGOLAHAN DATA (ROPA)

[Lihat file terpisah: ROPA.md]
