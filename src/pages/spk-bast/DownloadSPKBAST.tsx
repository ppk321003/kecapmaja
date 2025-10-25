<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download SPK & BAST</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* Header Styles */
        header {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            padding: 1rem 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 1.8rem;
            font-weight: bold;
        }

        nav ul {
            display: flex;
            list-style: none;
            gap: 2rem;
        }

        nav ul li a {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            transition: background-color 0.3s;
        }

        nav ul li a:hover, nav ul li a.active {
            background-color: rgba(255, 255, 255, 0.2);
        }

        /* Main Content */
        main {
            padding: 2rem 0;
            min-height: calc(100vh - 200px);
        }

        .page-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .page-title {
            font-size: 2.5rem;
            color: #1e40af;
            margin-bottom: 0.5rem;
        }

        .page-subtitle {
            color: #64748b;
            font-size: 1.1rem;
        }

        /* Card Styles */
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
            margin-bottom: 2rem;
        }

        .card-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            background-color: #f8fafc;
        }

        .card-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.5rem;
            color: #1e293b;
        }

        .card-icon {
            color: #3b82f6;
        }

        .card-description {
            color: #64748b;
            margin-top: 0.5rem;
        }

        .card-content {
            padding: 1.5rem;
        }

        /* Loading & Error States */
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            color: #64748b;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-left: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-message {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #fecaca;
            margin-bottom: 1rem;
        }

        /* Table Styles */
        .table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
        }

        .data-table th {
            background-color: #3b82f6;
            color: white;
            font-weight: 600;
            text-align: left;
            padding: 1rem;
            white-space: nowrap;
        }

        .data-table td {
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }

        .data-table tr:hover {
            background-color: #f8fafc;
        }

        /* Link Icon */
        .link-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background-color: #3b82f6;
            color: white;
            border-radius: 6px;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .link-icon:hover {
            background-color: #1d4ed8;
            transform: translateY(-2px);
        }

        /* Footer */
        footer {
            background-color: #1e293b;
            color: white;
            text-align: center;
            padding: 1.5rem 0;
            margin-top: 3rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 1rem;
            }
            
            nav ul {
                gap: 1rem;
            }
            
            .page-title {
                font-size: 2rem;
            }
            
            .data-table {
                font-size: 0.875rem;
            }
            
            .data-table th,
            .data-table td {
                padding: 0.75rem 0.5rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo">Perusahaan Kita</div>
                <nav>
                    <ul>
                        <li><a href="#">Beranda</a></li>
                        <li><a href="#">Proyek</a></li>
                        <li><a href="#" class="active">Download SPK & BAST</a></li>
                        <li><a href="#">Kontak</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    </header>

    <main>
        <div class="container">
            <div class="page-header">
                <h1 class="page-title">Download SPK & BAST</h1>
                <p class="page-subtitle">Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <svg class="card-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Dokumen SPK & BAST
                    </h2>
                    <p class="card-description">Daftar dokumen SPK dan BAST yang tersedia untuk diunduh</p>
                </div>
                <div class="card-content">
                    <div id="loading" class="loading">
                        <div class="spinner"></div>
                        <p>Memuat data dari Google Sheets...</p>
                    </div>
                    
                    <div id="error-message" class="error-message" style="display: none;">
                        <p id="error-text"></p>
                        <button id="retry-button" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Coba Lagi
                        </button>
                    </div>
                    
                    <div id="data-container" style="display: none;">
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Periode (Bulan) SPK</th>
                                        <th>Nilai Perjanjian Rp.</th>
                                        <th>Nilai Realisasi Rp.</th>
                                        <th>% Realisasi</th>
                                        <th>Link</th>
                                    </tr>
                                </thead>
                                <tbody id="table-body">
                                    <!-- Data akan diisi oleh JavaScript -->
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top: 1rem; text-align: center; color: #64748b;">
                            <p>Total dokumen: <span id="document-count">0</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2024 Perusahaan Kita. Semua hak dilindungi.</p>
        </div>
    </footer>

    <script>
        // Konfigurasi
        const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQfmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc/pub?output=csv';
        
        // Elemen DOM
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        const retryButton = document.getElementById('retry-button');
        const dataContainer = document.getElementById('data-container');
        const tableBody = document.getElementById('table-body');
        const documentCount = document.getElementById('document-count');
        
        // Format angka ke Rupiah
        function formatRupiah(angka) {
            if (!angka || angka === '-' || isNaN(angka)) return '-';
            
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(angka));
        }
        
        // Format persentase
        function formatPersentase(angka) {
            if (!angka || angka === '-' || isNaN(angka)) return '-';
            
            return parseFloat(angka).toFixed(2) + '%';
        }
        
        // Fungsi untuk memuat data dari Google Sheets
        async function loadData() {
            try {
                // Tampilkan loading, sembunyikan error dan data
                loadingElement.style.display = 'flex';
                errorElement.style.display = 'none';
                dataContainer.style.display = 'none';
                
                console.log('Mengambil data dari Google Sheets...');
                
                // Tambahkan timestamp untuk menghindari cache
                const url = SHEET_URL + '&t=' + new Date().getTime();
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const csvData = await response.text();
                console.log('Data CSV diterima:', csvData);
                
                // Parse data CSV
                const rows = csvData.split('\n').filter(row => row.trim() !== '');
                
                if (rows.length === 0) {
                    throw new Error('Tidak ada data yang ditemukan di Google Sheets');
                }
                
                // Parse header
                const headers = rows[0].split(',').map(header => 
                    header.trim().replace(/^"(.*)"$/, '$1').toLowerCase()
                );
                
                console.log('Header kolom:', headers);
                
                // Cari indeks kolom berdasarkan header yang diharapkan
                const noIndex = headers.findIndex(header => header.includes('no'));
                const periodeIndex = headers.findIndex(header => 
                    header.includes('periode') || header.includes('bulan')
                );
                const nilaiPerjanjianIndex = headers.findIndex(header => 
                    header.includes('nilai perjanjian')
                );
                const nilaiRealisasiIndex = headers.findIndex(header => 
                    header.includes('nilai realisasi')
                );
                const persenRealisasiIndex = headers.findIndex(header => 
                    header.includes('%') || header.includes('persen') || header.includes('realisasi')
                );
                const linkIndex = headers.findIndex(header => 
                    header.includes('link') || header.includes('url')
                );
                
                console.log('Indeks kolom:', {
                    noIndex, periodeIndex, nilaiPerjanjianIndex, 
                    nilaiRealisasiIndex, persenRealisasiIndex, linkIndex
                });
                
                // Validasi kolom
                const missingColumns = [];
                if (noIndex === -1) missingColumns.push('No');
                if (periodeIndex === -1) missingColumns.push('Periode (Bulan) SPK');
                if (nilaiPerjanjianIndex === -1) missingColumns.push('Nilai Perjanjian Rp.');
                if (nilaiRealisasiIndex === -1) missingColumns.push('Nilai Realisasi Rp.');
                if (persenRealisasiIndex === -1) missingColumns.push('% Realisasi');
                if (linkIndex === -1) missingColumns.push('Link');
                
                if (missingColumns.length > 0) {
                    throw new Error(
                        `Kolom berikut tidak ditemukan: ${missingColumns.join(', ')}. ` +
                        `Pastikan header tabel sesuai dengan yang diharapkan.`
                    );
                }
                
                // Kosongkan tabel
                tableBody.innerHTML = '';
                
                // Parse data baris
                let validDocuments = 0;
                
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.trim() === '') continue;
                    
                    // Parse CSV dengan handling quotes
                    const cells = row.split(',').map(cell => {
                        let cleaned = cell.trim();
                        // Remove surrounding quotes if present
                        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                            cleaned = cleaned.slice(1, -1);
                        }
                        return cleaned;
                    });
                    
                    // Skip baris kosong
                    if (cells.every(cell => cell === '')) continue;
                    
                    const rowElement = document.createElement('tr');
                    
                    // Kolom No
                    const noCell = document.createElement('td');
                    noCell.textContent = cells[noIndex] || '-';
                    rowElement.appendChild(noCell);
                    
                    // Kolom Periode
                    const periodeCell = document.createElement('td');
                    periodeCell.textContent = cells[periodeIndex] || '-';
                    rowElement.appendChild(periodeCell);
                    
                    // Kolom Nilai Perjanjian
                    const nilaiPerjanjianCell = document.createElement('td');
                    nilaiPerjanjianCell.textContent = formatRupiah(cells[nilaiPerjanjianIndex]);
                    rowElement.appendChild(nilaiPerjanjianCell);
                    
                    // Kolom Nilai Realisasi
                    const nilaiRealisasiCell = document.createElement('td');
                    nilaiRealisasiCell.textContent = formatRupiah(cells[nilaiRealisasiIndex]);
                    rowElement.appendChild(nilaiRealisasiCell);
                    
                    // Kolom % Realisasi
                    const persenRealisasiCell = document.createElement('td');
                    persenRealisasiCell.textContent = formatPersentase(cells[persenRealisasiIndex]);
                    rowElement.appendChild(persenRealisasiCell);
                    
                    // Kolom Link
                    const linkCell = document.createElement('td');
                    const linkUrl = cells[linkIndex];
                    
                    if (linkUrl && linkUrl.trim() !== '' && linkUrl !== '-') {
                        const linkElement = document.createElement('a');
                        linkElement.href = linkUrl.trim();
                        linkElement.target = '_blank';
                        linkElement.className = 'link-icon';
                        linkElement.innerHTML = `
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        `;
                        linkElement.title = 'Download Dokumen';
                        linkCell.appendChild(linkElement);
                    } else {
                        linkCell.textContent = '-';
                        linkCell.style.color = '#94a3b8';
                    }
                    
                    rowElement.appendChild(linkCell);
                    tableBody.appendChild(rowElement);
                    validDocuments++;
                }
                
                // Update jumlah dokumen
                documentCount.textContent = validDocuments;
                
                // Tampilkan data, sembunyikan loading
                loadingElement.style.display = 'none';
                dataContainer.style.display = 'block';
                
                console.log(`Data berhasil dimuat: ${validDocuments} dokumen`);
                
            } catch (error) {
                console.error('Error loading data:', error);
                
                // Tampilkan pesan error
                loadingElement.style.display = 'none';
                errorElement.style.display = 'block';
                errorText.textContent = error.message;
                dataContainer.style.display = 'none';
            }
        }
        
        // Event listener untuk tombol retry
        retryButton.addEventListener('click', loadData);
        
        // Muat data saat halaman dimuat
        document.addEventListener('DOMContentLoaded', loadData);
    </script>
</body>
</html>