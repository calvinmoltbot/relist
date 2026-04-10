"use client";

import { useRef, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportButtonProps {
  onImported: () => void;
}

export function ImportButton({ onImported }: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setImporting(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Import failed");
        }

        const data = await res.json();
        setResult({ imported: data.imported, skipped: data.skipped });
        onImported();

        // Clear result after 5 seconds
        setTimeout(() => setResult(null), 5000);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [onImported],
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-3.5" />
        {importing ? "Importing..." : result ? `${result.imported} imported` : "Import"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
