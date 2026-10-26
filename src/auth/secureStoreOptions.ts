import * as SecureStore from "expo-secure-store";

/** Where refresh tokens are kept: on this device only, never in backups, readable once it was first unlocked. */
export const TOKEN_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
