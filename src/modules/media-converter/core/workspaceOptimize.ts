import { convertImageFile } from "./browserConvert";

export const WORKSPACE_IMAGE_LIMIT_BYTES = 8 * 1024 * 1024;

const WORKSPACE_OPTIMIZE_ATTEMPTS = [
  { quality: 90, maxSize: 2400 },
  { quality: 84, maxSize: 2000 },
  { quality: 78, maxSize: 1800 },
] as const;

export type WorkspaceOptimizeResult = {
  file: File;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  usedAttempt: number;
};

function buildWorkspaceOptimizedFilename(filename: string) {
  const clean = filename.trim() || "image";
  const dot = clean.lastIndexOf(".");
  const basename = dot > 0 ? clean.slice(0, dot) : clean;

  return `${basename}-workspace.jpg`;
}

export async function optimizeImageForWorkspace(file: File): Promise<WorkspaceOptimizeResult> {
  let lastResult: WorkspaceOptimizeResult | null = null;

  for (let index = 0; index < WORKSPACE_OPTIMIZE_ATTEMPTS.length; index++) {
    const attempt = WORKSPACE_OPTIMIZE_ATTEMPTS[index]!;
    const result = await convertImageFile(file, {
      outputFormat: "JPG",
      quality: attempt.quality,
      maxWidth: attempt.maxSize,
      maxHeight: attempt.maxSize,
      backgroundColor: "#ffffff",
    });

    const optimizedFile = new File(
      [result.blob],
      buildWorkspaceOptimizedFilename(file.name),
      { type: result.mimeType || "image/jpeg" },
    );

    lastResult = {
      file: optimizedFile,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      width: result.width,
      height: result.height,
      usedAttempt: index + 1,
    };

    if (optimizedFile.size <= WORKSPACE_IMAGE_LIMIT_BYTES) {
      return lastResult;
    }
  }

  if (lastResult) return lastResult;
  throw new Error("workspace-optimization-failed");
}
