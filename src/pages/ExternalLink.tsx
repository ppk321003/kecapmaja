
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ExternalLink as LinkIcon } from "lucide-react";

interface ExternalLinkProps {
  url: string;
}

const ExternalLink: React.FC<ExternalLinkProps> = ({ url }) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.open(url, "_blank");
  }, [url]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Membuka Link Eksternal</h1>
        <p className="max-w-md text-muted-foreground">
          Jika link tidak terbuka secara otomatis, silahkan klik tombol di bawah ini:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button onClick={() => window.open(url, "_blank")} className="mt-4">
            <LinkIcon className="mr-2 h-4 w-4" /> Buka Link
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            Kembali
          </Button>
        </div>
        <div className="mt-4 rounded-md bg-muted p-4">
          <p className="break-all text-sm">{url}</p>
        </div>
      </div>
    </Layout>
  );
};

export default ExternalLink;
