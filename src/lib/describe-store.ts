import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Tone = "casual" | "professional" | "trendy";
export type Length = "short" | "medium" | "long";

export interface GenerationResult {
  id: string;
  description: string;
  hashtags: string[];
  detected_brand?: string;
  detected_category?: string;
  tone: Tone;
  length: Length;
  timestamp: number;
  imagePreview?: string; // thumbnail for history
}

interface FormState {
  image: string | null; // base64
  brand: string;
  category: string;
  condition: string;
  size: string;
  style_notes: string;
  tone: Tone;
  length: Length;
  model: string;
}

interface DescribeState {
  form: FormState;
  result: GenerationResult | null;
  loading: boolean;
  error: string | null;
  history: GenerationResult[];
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setImage: (image: string | null) => void;
  setResult: (result: GenerationResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addToHistory: (result: GenerationResult) => void;
  clearForm: () => void;
  generate: () => Promise<void>;
}

const initialForm: FormState = {
  image: null,
  brand: "",
  category: "",
  condition: "",
  size: "",
  style_notes: "",
  tone: "casual",
  length: "medium",
  model: "google/gemini-2.5-flash-lite",
};

/**
 * Resize an image to max dimensions while preserving aspect ratio.
 * Returns a compressed JPEG data URL suitable for API payloads.
 */
function resizeImage(dataUrl: string, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl); // fallback to original
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL("image/jpeg", 0.7);
        resolve(result);
      } catch {
        resolve(dataUrl); // fallback to original on any error
      }
    };
    img.onerror = () => resolve(dataUrl); // fallback if image can't load
    img.src = dataUrl;
  });
}

export const useDescribeStore = create<DescribeState>()(
  persist(
    (set, get) => ({
      form: initialForm,
      result: null,
      loading: false,
      error: null,
      history: [],

      setField: (key, value) =>
        set((state) => ({ form: { ...state.form, [key]: value } })),

      setImage: async (image) => {
        if (image) {
          // Resize immediately on upload so form.image is always API-ready
          const resized = await resizeImage(image, 1200);
          set((state) => ({ form: { ...state.form, image: resized } }));
        } else {
          set((state) => ({ form: { ...state.form, image: null } }));
        }
      },

      setResult: (result) => set({ result }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      addToHistory: (result) =>
        set((state) => ({
          history: [result, ...state.history].slice(0, 10),
        })),

      clearForm: () => set({ form: initialForm, result: null, error: null }),

      generate: async () => {
        const { form } = get();
        set({ loading: true, error: null });

        try {
          const res = await fetch("/api/describe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: form.image, // already resized at upload time
              brand: form.brand || undefined,
              category: form.category || undefined,
              condition: form.condition || undefined,
              size: form.size || undefined,
              style_notes: form.style_notes || undefined,
              tone: form.tone,
              length: form.length,
              model: form.model,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to generate description");
          }

          const data = await res.json();

          const result: GenerationResult = {
            id: crypto.randomUUID(),
            description: data.description,
            hashtags: data.hashtags,
            detected_brand: data.detected_brand,
            detected_category: data.detected_category,
            tone: form.tone,
            length: form.length,
            timestamp: Date.now(),
            imagePreview: form.image
              ? form.image.slice(0, 200)
              : undefined,
          };

          set({ result, loading: false });
          get().addToHistory(result);
        } catch (err) {
          set({
            loading: false,
            error:
              err instanceof Error ? err.message : "Something went wrong",
          });
        }
      },
    }),
    {
      name: "relist-describe-history",
      partialize: (state) => ({ history: state.history }),
    }
  )
);
