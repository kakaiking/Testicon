"use client";

import { useRef, useState } from "react";

type IconUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

export default function IconUpload({ value, onChange }: IconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/upload/icon", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }

    onChange(data.url);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt="App icon preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No icon</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-[var(--text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--accent)] file:text-white hover:file:opacity-90 file:cursor-pointer disabled:opacity-50"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">JPEG, PNG, WebP, or GIF · max 2 MB</p>
        </div>
      </div>
      {uploading && <p className="text-xs text-[var(--text-muted)]">Uploading...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
