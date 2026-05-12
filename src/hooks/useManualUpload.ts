// src/hooks/useManualUpload.ts
import { useState } from "react";

interface UploadOptions {
  brandId: string;
  modelId: string;
  file: File;
  adminEmail?: string;
}

interface UploadProgress {
  status:
    | "idle"
    | "generating-url"
    | "uploading"
    | "confirming"
    | "success"
    | "error";
  progress?: number;
  error?: string;
  manualId?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPE = "application/pdf";

export function useManualUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
  });

  const upload = async (options: UploadOptions): Promise<string | null> => {
    const { brandId, modelId, file, adminEmail } = options;

    try {
      // Step 1: Validate file on client
      if (file.size > MAX_FILE_SIZE) {
        setUploadProgress({
          status: "error",
          error: `File size exceeds 50MB limit. File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        });
        return null;
      }

      if (file.type !== ALLOWED_TYPE) {
        setUploadProgress({
          status: "error",
          error: "Only PDF files are allowed.",
        });
        return null;
      }

      // Step 2: Request presigned URL from server
      setUploadProgress({ status: "generating-url" });

      const generateUrlResponse = await fetch(
        "/api/manuals/generate-upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminEmail && { "x-admin-email": adminEmail }),
          },
          body: JSON.stringify({
            brandId,
            modelId,
            fileName: file.name,
            fileType: file.type,
          }),
        }
      );

      if (!generateUrlResponse.ok) {
        const errorData = await generateUrlResponse.json();
        setUploadProgress({
          status: "error",
          error: errorData.error || "Failed to generate upload URL.",
        });
        return null;
      }

      const { signedUrl, fileKey } = await generateUrlResponse.json();

      // Step 3: Direct upload to Backblaze B2 via presigned URL
      setUploadProgress({ status: "uploading", progress: 0 });

      const xhr = new XMLHttpRequest();
      let uploadResolve: (() => void) | null = null;
      let uploadReject: ((error: any) => void) | null = null;

      const uploadPromise = new Promise<void>((resolve, reject) => {
        uploadResolve = resolve;
        uploadReject = reject;
      });

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress({ status: "uploading", progress });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          if (uploadResolve) uploadResolve();
        } else {
          if (uploadReject)
            uploadReject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        if (uploadReject) uploadReject(new Error("Upload request failed."));
      });

      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);

      await uploadPromise;

      // Step 4: Confirm upload with server (save metadata)
      setUploadProgress({ status: "confirming" });

      const confirmResponse = await fetch("/api/manuals/confirm-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminEmail && { "x-admin-email": adminEmail }),
        },
        body: JSON.stringify({
          fileKey,
          fileName: file.name,
          brandId,
          modelId,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        setUploadProgress({
          status: "error",
          error: errorData.error || "Failed to confirm upload.",
        });
        return null;
      }

      const { manualId } = await confirmResponse.json();

      // Step 5: Success
      setUploadProgress({
        status: "success",
        manualId,
      });

      return manualId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setUploadProgress({
        status: "error",
        error: errorMessage,
      });
      return null;
    }
  };

  const reset = () => {
    setUploadProgress({ status: "idle" });
  };

  return {
    upload,
    uploadProgress,
    reset,
  };
}
