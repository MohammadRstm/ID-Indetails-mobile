import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ANDROID_CHANNELS, ensureAndroidChannels } from "./channels";

jest.mock("expo-notifications", () => ({
  ...jest.requireActual("expo-notifications"),
  setNotificationChannelAsync: jest.fn(),
}));

const setChannel = jest.mocked(Notifications.setNotificationChannelAsync);

afterEach(() => jest.restoreAllMocks());

describe("ensureAndroidChannels", () => {
  it("silences the timer and quiet hours, and leaves the sound out elsewhere so Android plays its default", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    setChannel.mockResolvedValue(null);
    await ensureAndroidChannels();

    expect(setChannel).toHaveBeenCalledTimes(ANDROID_CHANNELS.length);
    for (const [id, input] of setChannel.mock.calls) {
      if (id === "timer" || id === "quiet") expect(input).toHaveProperty("sound", null);
      else expect(input).not.toHaveProperty("sound");
    }
  });
});
