import { savePublicFile } from "@/lib/file-storage";

const MAX_SIZE = 5 * 1024 * 1024;

export async function saveScreenshot(dataUrl: string): Promise<string | null> {
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/i);
  if (!match) return null;

  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_SIZE) return null;

  const filename = `${crypto.randomUUID()}.${ext}`;
  return savePublicFile("screenshots", filename, buffer);
}
