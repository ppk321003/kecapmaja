import React from "react";
import { KuitansiStoreProfile } from "@/contexts/KuitansiStoreContext";
import { formatNumberWithSeparator } from "@/lib/formatNumber";

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
    // COMPACT STYLE (Adreena Store - like Adreena)
    return (
      <div className="receipt-container bg-white border border-gray-300 rounded p-6 font-mono text-sm max-w-2xl relative">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-6">
          <div className="font-bold text-2xl mb-2">{store.storageName}</div>
          <div className="text-sm">{store.storeAddress}</div>
          <div className="text-sm">{store.storePhone}</div>
        </div>

        {/* Details */}
        <div className="space-y-1 mb-6 text-sm">
          <div className="flex justify-between">
            <span>No. Kuitansi:</span>
            <span className="font-semibold">{kuitansi.no_kuitansi || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{kuitansi.tanggal || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Penerima:</span>
            <span className="font-semibold">{kuitansi.penerima || "-"}</span>
          </div>
        </div>

        {/* Item Details Table */}
        <div className="border-y-2 border-dashed border-gray-400 py-4 mb-6">
          {kuitansi.nama_barang && (
            <div className="flex justify-between mb-2 text-sm">
              <span>Barang:</span>
              <span className="font-semibold">{kuitansi.nama_barang}</span>
            </div>
          )}
          {kuitansi.harga && (
            <div className="flex justify-between mb-2 text-sm">
              <span>Harga:</span>
              <span className="font-semibold">{formatNumberWithSeparator(kuitansi.harga)}</span>
            </div>
          )}
          <div className="flex justify-between mb-2 text-sm">
            <span>Qty:</span>
            <span className="font-semibold">{formatNumberWithSeparator(kuitansi.jumlah)}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 pt-2 flex justify-between font-bold text-lg">
            <span>TOTAL:</span>
            <span>{kuitansi.total ? formatNumberWithSeparator(kuitansi.total) : formatNumberWithSeparator(kuitansi.jumlah)}</span>
          </div>
        </div>

        {kuitansi.keterangan && (
          <div className="mb-6 text-sm border-l-4 border-gray-400 pl-3">
            <span className="font-semibold">Keterangan:</span>
            <p>{kuitansi.keterangan}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-dashed border-gray-400 pt-4 text-center text-sm">
          <p className="font-semibold">{store.storeFooter}</p>
          <p className="text-sm mt-2">{new Date().toLocaleDateString("id-ID")}</p>
        </div>

        {/* Logo - Bottom Right */}
        <div className="absolute bottom-4 right-4">
          <img
            src={`/lovable-uploads/${store.storeLogoId}.png`}
            alt="Logo"
            className="h-36 w-36 object-contain opacity-70"
            crossOrigin="anonymous"
          />
        </div>
      </div>
    );
  } else {
    // PROFESSIONAL STYLE (Alzena Point - like invoice)
    return (
      <div className="receipt-container bg-white border border-gray-200 rounded-lg p-6 relative" id="receipt">
        {/* Logo - Bottom Right */}
        <div className="absolute bottom-4 right-4">
          <img
            src={`/lovable-uploads/${store.storeLogoId}.png`}
            alt="Logo"
            className="h-30 w-30 object-contain opacity-80"
            crossOrigin="anonymous"
          />
        </div>
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

        {/* Penerima */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Kepada:</h3>
          <div className="border border-gray-200 rounded p-3 bg-gray-50">
            <p className="font-medium text-gray-900">{kuitansi.penerima || "Pelanggan"}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Rincian Barang</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Keterangan</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 w-20">Harga</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-700 w-16">Qty</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2">
                  {kuitansi.nama_barang ? (
                    <>
                      <p className="font-medium text-gray-900">{kuitansi.nama_barang}</p>
                      {kuitansi.keterangan && (
                        <p className="text-xs text-gray-600 mt-1">{kuitansi.keterangan}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600">-</p>
                  )}
                </td>
                <td className="text-right py-3 px-2 text-gray-900">
                  {kuitansi.harga ? (
                    <span className="font-medium">Rp {formatNumberWithSeparator(kuitansi.harga)}</span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="text-center py-3 px-2 text-gray-900">
                  <span className="font-medium">{formatNumberWithSeparator(kuitansi.jumlah)}</span>
                </td>
                <td className="text-right py-3 px-2 text-gray-900">
                  <span className="font-semibold text-lg">Rp {kuitansi.total ? formatNumberWithSeparator(kuitansi.total) : formatNumberWithSeparator(kuitansi.jumlah)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        <div className="mb-6 border-t-2 border-b-2 border-gray-300 py-4">
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between mb-2 text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>Rp {kuitansi.total ? formatNumberWithSeparator(kuitansi.total) : formatNumberWithSeparator(kuitansi.jumlah)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span>Rp {kuitansi.total ? formatNumberWithSeparator(kuitansi.total) : formatNumberWithSeparator(kuitansi.jumlah)}</span>
              </div>
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
        <div className="border-t border-gray-200 pt-4 mt-6 pb-24">
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
