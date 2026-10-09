import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { http } from "@/api/http";
import type { FileInfo } from "@/api/types";
import { tokenManager } from "@/auth/tokenManager";
import { env } from "@/config/env";
import type { AvatarPhoto } from "@/ui";

/*
 * Photos and videos for work entries, chat and the profile (phase-0-plan.md section 12). Photos are shrunk to
 * 2048 px on the long side and re-encoded as JPEG at 0.8 before they leave the phone: re-encoding drops the EXIF
 * data, so the location a photo was taken at is never uploaded. Videos go as they are.
 */

export const MAX_PHOTO_SIDE = 2048;
const PHOTO_QUALITY = 0.8;
/** Uploads take longer than the API's usual 30 seconds on a site's connection. */
const UPLOAD_TIMEOUT_MS = 180_000;

export type PickedMedia = {
  uri: string;
  kind: "image" | "video";
  name: string;
  mimeType: string;
  /** Null when the phone didn't say. */
  sizeBytes: number | null;
};

export type PickResult =
  { status: "picked"; media: PickedMedia[] } | { status: "cancelled" } | { status: "denied" };

/** The resize that brings a photo within the limit on its long side, or null when it already fits. */
export function shrinkTo(
  width: number,
  height: number,
  max: number = MAX_PHOTO_SIDE,
): { width: number } | { height: number } | null {
  if (width <= max && height <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

async function shrinkPhoto(asset: ImagePicker.ImagePickerAsset): Promise<PickedMedia> {
  const context = ImageManipulator.manipulate(asset.uri);
  const resize = shrinkTo(asset.width, asset.height);
  if (resize) context.resize(resize);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  return {
    uri: saved.uri,
    kind: "image",
    name: "photo.jpg",
    mimeType: "image/jpeg",
    sizeBytes: null,
  };
}

function asVideo(asset: ImagePicker.ImagePickerAsset): PickedMedia {
  return {
    uri: asset.uri,
    kind: "video",
    name: asset.fileName ?? "video.mp4",
    mimeType: asset.mimeType ?? "video/mp4",
    sizeBytes: asset.fileSize ?? null,
  };
}

type PickOptions = {
  /** Videos may be picked too (chat only). */
  videos?: boolean;
  /** How many may be picked at once from the library; one by default. */
  limit?: number;
};

/** Takes a photo, or picks from the library, asking for the permission the first time. */
export async function pickMedia(
  source: "camera" | "library",
  { videos = false, limit = 1 }: PickOptions = {},
): Promise<PickResult> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: videos ? ["images", "videos"] : ["images"],
    quality: 1,
    exif: false,
    allowsMultipleSelection: source === "library" && limit > 1,
    selectionLimit: limit,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) return { status: "cancelled" };

  const media: PickedMedia[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    media.push(asset.type === "video" ? asVideo(asset) : await shrinkPhoto(asset));
  }
  return { status: "picked", media };
}

/** Uploads one picked photo or video (`POST /api/files`); its id is then attached to what it belongs to. */
export async function uploadMedia(media: PickedMedia): Promise<FileInfo> {
  const form = new FormData();
  // React Native's FormData takes a file as its address, name and type.
  form.append("file", {
    uri: media.uri,
    name: media.name,
    type: media.mimeType,
  } as unknown as Blob);
  const { data } = await http.post<FileInfo>("/files", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data;
}

/**
 * A protected file as an image source: downloaded with the signed-in person's token in a header (never in the
 * address) and cached on disk by its address, which carries only the file id.
 */
export function fileSource(fileId: number): AvatarPhoto {
  const token = tokenManager.getAccessToken();
  return {
    uri: `${env.apiUrl}/api/files/${fileId}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

/** A person's uploaded photo as an avatar source, or null for the generated face. */
export function photoOf(photoFileId: number | null | undefined): AvatarPhoto | null {
  return photoFileId ? fileSource(photoFileId) : null;
}
