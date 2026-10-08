// An in-memory stand-in for expo-secure-store. Tests reach the stored values with `secureStoreItems`.

export const secureStoreItems = new Map<string, string>();

export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 4;

export const getItemAsync = jest.fn(async (key: string) => secureStoreItems.get(key) ?? null);

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  secureStoreItems.set(key, value);
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  secureStoreItems.delete(key);
});
