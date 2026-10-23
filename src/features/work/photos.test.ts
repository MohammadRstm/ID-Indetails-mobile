import { env } from "@/config/env";
import { avatarSource, fileSource, photoOf, PHOTO_SIZE, thumbSource } from "./photos";

jest.mock("expo-image-manipulator", () => ({ ImageManipulator: {}, SaveFormat: { JPEG: "jpeg" } }));
jest.mock("expo-image-picker", () => ({}));

const file = (id: number, query = "") => `${env.apiUrl}/api/files/${id}${query}`;

describe("fileSource", () => {
  it("asks for the full file unless a size is given", () => {
    expect(fileSource(7).uri).toBe(file(7));
  });

  it("asks the API for a smaller copy when given a size", () => {
    expect(fileSource(7, 480).uri).toBe(file(7, "?size=480"));
  });
});

describe("photo sizes", () => {
  it("uses 160 for avatars, as the web does", () => {
    expect(PHOTO_SIZE.avatar).toBe(160);
    expect(avatarSource(3).uri).toBe(file(3, "?size=160"));
    expect(photoOf(3)?.uri).toBe(file(3, "?size=160"));
  });

  it("uses 480 for thumbnails in chats and work entries", () => {
    expect(PHOTO_SIZE.thumb).toBe(480);
    expect(thumbSource(3).uri).toBe(file(3, "?size=480"));
  });

  it("has no avatar for a person without a photo", () => {
    expect(photoOf(null)).toBeNull();
  });
});
