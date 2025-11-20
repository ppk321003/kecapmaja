import React, { useState } from 'react';

interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golAkhir: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  status: string;
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  linkSKJabatan: string;
  linkSKPangkat: string;
}

interface LayananKarirProps {
  karyawan: Karyawan;
}

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState('konversi');

  console.log('Data karyawan:', karyawan); // Debug log

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Layanan Karir</h1>
      
      {/* Info dasar */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-semibold">{karyawan.nama}</h2>
        <p>NIP: {karyawan.nip}</p>
        <p>Jabatan: {karyawan.jabatan}</p>
        <p>Status: {karyawan.status}</p>
      </div>

      {/* Tabs sederhana */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'konversi' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('konversi')}
        >
          Konversi Predikat
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'penetapan' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('penetapan')}
        >
          Penetapan AK
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'akumulasi' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('akumulasi')}
        >
          Akumulasi AK
        </button>
      </div>

      {/* Content */}
      <div className="bg-white p-4 rounded-lg shadow">
        {activeTab === 'konversi' && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Konversi Predikat</h3>
            <p>AK Kumulatif: {karyawan.akKumulatif}</p>
            <p>Penghitungan Terakhir: {karyawan.tglPenghitunganAkTerakhir}</p>
          </div>
        )}
        
        {activeTab === 'penetapan' && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Penetapan AK</h3>
            <p>Content untuk penetapan AK</p>
          </div>
        )}
        
        {activeTab === 'akumulasi' && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Akumulasi AK</h3>
            <p>Content untuk akumulasi AK</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayananKarir;