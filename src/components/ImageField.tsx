import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/queries";

/**
 * Campo de imagen para el panel: permite escribir una ruta/URL o subir
 * un archivo desde la galería del dispositivo.
 */
export default function ImageField({
  value,
  onChange,
  folder = "productos",
  label = "Imagen",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadMedia(file, folder);
      onChange(url);
      toast.success("Imagen subida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img
          src={value}
          alt={label}
          loading="lazy"
          className="h-14 w-12 shrink-0 rounded-sm object-cover"
        />
      ) : null}
      <input
        className="min-w-0 flex-1 border border-input bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
        placeholder={`${label} (URL o ruta)`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="press inline-flex shrink-0 items-center gap-2 border border-border px-4 py-3 text-[10px] tracking-[0.22em] uppercase hover:border-primary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        Galería
      </button>
    </div>
  );
}
