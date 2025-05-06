
import React from "react";
import Layout from "@/components/Layout";
import MenuGrid from "@/components/MenuGrid";

const Index: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang di Kecap Maja: Keuangan Cekatan Anggaran Pengadaan
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Menu</h2>
          <MenuGrid />
        </section>

        <section className="space-y-4 pt-6">
          <h2 className="text-xl font-semibold">Informasi Terkini</h2>
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow">
            <p>Aplikasi Keuangan Cekatan Anggaran Pengadaan (Kecap Maja) dikembangkan untuk memudahkan pengelolaan dokumen keuangan.</p>
            <p className="mt-4 text-sm text-muted-foreground">Versi aplikasi: 2.0.0</p>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
