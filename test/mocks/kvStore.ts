// An in-memory stand-in for expo-sqlite/kv-store.

const items = new Map<string, string>();

const storage = {
  getItemSync: (key: string) => items.get(key) ?? null,
  setItemSync: (key: string, value: string) => {
    items.set(key, value);
  },
  getItem: async (key: string) => items.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    items.set(key, value);
  },
  removeItem: async (key: string) => {
    items.delete(key);
  },
  clear: async () => {
    items.clear();
  },
};

export default storage;
export const Storage = storage;
export const AsyncStorage = storage;
