import React from "react";
import { KuitansiStoreProfile } from "@/contexts/KuitansiStoreContext";

interface KuitansiReceiptProps {
  store: KuitansiStoreProfile;
  kuitansi: {
    no_kuitansi: string;
    penerima: string;
    nama_barang?: string;
    harga?: string;
    jumlah: string;
    total?: string;
    keterangan?: string;
    tanggal: string;
  };
  isCompact?: boolean;
}

const KuitansiReceipt: React.FC<KuitansiReceiptProps> = ({
  store,
  kuitansi,
  isCompact = false,
}) => {
  const isCompactType = store.storeType === "compact";

  if (isCompactType) {
    // COMPACT STYLE (PPK Satker 3210 - like Adreena)
    return (
      <div className="receipt-container bg-white border border-gray-300 rounded p-6 font-mono text-sm max-w-md">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-4">
          <img
            src={`/lovable-uploads/${store.storeLogoId}.png`}
            alt="Logo"
            className="h-16 mx-auto mb-2"
          />
          <div className="font-bold">{store.storageName}</div>
          <div className="text-xs">{store.storeAddress}</div>
          <div className="text-xs">{store.storePhone}</div>
        </div>

        {/* Details */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between">
            <span className="font-semibold">No. Kuitansi:</span>
            <span>{kuitansi.no_kuitansi || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Tanggal:</span>
            <span>{kuitansi.tanggal || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Penerima:</span>
            <span>{kuitansi.penerima || "-"}</span>
          </div>
          {kuitansi.nama_barang && (
            <div className="flex justify-between">
              <span className="font-semibold">Barang:</span>
              <span>{kuitansi.nama_barang}</span>
            </div>
          )}
          {kuitansi.harga && (
            <div className="flex justify-between">
              <span className="font-semibold">Harga:</span>
              <span>{kuitansi.harga}</span>
            </div>
          )}
        </div>

        <div className="border-y-2 border-dashed border-gray-400 py-3 mb-4">
          <div className="flex justify-between font-bold">
            <span>{kuitansi.total ? "Total:" : "Jumlah:"}</span>
            <span>{kuitansi.total || kuitansi.jumlah || "-"}</span>
          </div>
        </div>

        {kuitansi.keterangan && (
          <div className="mb-4 text-xs">
            <span className="font-semibold">Keterangan:</span>
            <p>{kuitansi.keterangan}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-dashed border-gray-400 pt-3 text-center text-xs">
          <p className="font-semibold">{store.storeFooter}</p>
          <p>{new Date().toLocaleDateString("id-ID")}</p>
        </div>
      </div>
    );
  } else {
    // PROFESSIONAL STYLE (Alzena Point - like invoice)
    return (
      <div className="receipt-container bg-white border border-gray-200 rounded-lg p-6" id="receipt">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">KUITANSI/NOTA</h1>
            <p className="text-gray-600 mt-1">{store.storageName}</p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-sm text-gray-600">Nomor Kuitansi</span>
              <div className="font-semibold text-lg">{kuitansi.no_kuitansi}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Tanggal</span>
              <div className="font-semibold">{kuitansi.tanggal}</div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4 mb-4">
          <p className="text-sm text-gray-600">{store.storeAddress}</p>
          <p className="text-sm text-gray-600">{store.storePhone}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Penerima
            </h3>
            <div className="border-t border-gray-200 pt-2">
              <p className="font-medium">{kuitansi.penerima || "Pelanggan"}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Informasi Toko
            </h3>
            <div className="border-t border-gray-200 pt-2">
              <p className="font-medium">{store.storageName}</p>
              <p className="text-xs text-gray-600">{store.storeAddress}</p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Detail Barang</h3>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-2">
            {kuitansi.nama_barang && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Barang:</span>
                <span className="font-medium">{kuitansi.nama_barang}</span>
              </div>
            )}
            {kuitansi.harga && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Harga Satuan:</span>
                <span className="font-medium">{kuitansi.harga}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Qty:</span>
              <span className="font-medium">{kuitansi.jumlah}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-gray-900">{kuitansi.total || kuitansi.jumlah || "-"}</span>
            </div>
          </div>
        </div>

        {/* Keterangan */}
        {kuitansi.keterangan && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Keterangan
            </h3>
            <p className="text-sm text-gray-600 border-l-4 border-gray-300 pl-3">
              {kuitansi.keterangan}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 mt-6">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-700">
              {store.storeFooter}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {new Date().toLocaleDateString("id-ID")}
            </p>
          </div>
        </div>
      </div>
    );
  }
};

export default KuitansiReceipt;
