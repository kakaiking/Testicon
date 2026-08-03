import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

type UploadFolder = "icons" | "screenshots";

export async function savePublicFile(
  folder: UploadFolder,
  filename: string,
  data: Buffer,
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    const blob = await put(`${folder}/${filename}`, data, {
      access: "public",
      token,
    });
    return blob.url;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), data);
  return `/uploads/${folder}/${filename}`;
}
