import { useRef, useState, type DragEvent } from "react";
import { Upload, ImagePlus } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  variant?: "hero" | "compact";
}

export function Uploader({ onFiles, variant = "hero" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    handleFiles(e.dataTransfer.files);
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 border border-dashed border-foreground/30 bg-background text-foreground/60 transition hover:border-foreground hover:text-foreground"
        aria-label="Add more images"
      >
        <ImagePlus className="h-6 w-6" strokeWidth={1.25} />
        <span className="font-display text-sm tracking-tight">Add frames</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </button>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center gap-6 border border-dashed px-6 py-20 text-center transition ${
        over ? "border-foreground bg-accent" : "border-foreground/30 bg-card"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/30">
        <Upload className="h-6 w-6" strokeWidth={1.25} />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-3xl md:text-4xl">Drop your images here</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Upload screenshots, photos, or sketches. We'll arrange them into an ordered story you can edit.
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-sm font-medium tracking-wide text-background transition hover:bg-foreground/85"
      >
        <ImagePlus className="h-4 w-4" />
        Choose images
      </button>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        PNG · JPG · WEBP — multiple at once
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}