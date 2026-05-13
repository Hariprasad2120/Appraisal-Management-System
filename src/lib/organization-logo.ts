import { mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_DIRECTORY_ROOT = path.join(process.cwd(), "public", "uploads", "organizations");

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function getFileExtension(file: File) {
  const extension = MIME_EXTENSION_MAP[file.type];
  if (!extension) {
    throw new Error("Upload a PNG, JPG, WEBP, or SVG logo.");
  }
  return extension;
}

export async function saveOrganizationLogo(input: {
  organizationId: string;
  file: File;
  previousLogoUrl?: string | null;
}) {
  const { organizationId, file, previousLogoUrl } = input;

  if (file.size === 0) {
    throw new Error("Choose a logo file to upload.");
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("Logo file must be 2 MB or smaller.");
  }

  const extension = getFileExtension(file);
  const directory = path.join(LOGO_DIRECTORY_ROOT, organizationId);
  await mkdir(directory, { recursive: true });

  const existingFiles = await readdir(directory).catch(() => [] as string[]);
  await Promise.all(existingFiles.map((existingFile) => rm(path.join(directory, existingFile), { force: true })));

  const fileName = `logo-${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = path.join(directory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  if (previousLogoUrl?.startsWith("/uploads/organizations/")) {
    const previousPath = path.join(process.cwd(), "public", previousLogoUrl.replace(/^\//, ""));
    if (previousPath !== filePath) {
      await unlink(previousPath).catch(() => undefined);
    }
  }

  return `/uploads/organizations/${organizationId}/${fileName}`;
}
