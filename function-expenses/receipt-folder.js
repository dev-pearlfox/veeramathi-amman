// Saves receipt pictures into one folder (Downloads > Receipt) instead of dropping them loose in Downloads.
// A web page may not pick or create folders by itself, so the clerk chooses the folder ONCE (gear in the header, receipt-settings.js);
// the browser then lets this page write into just that folder. The folder is remembered in this browser (IndexedDB) and Chrome
// may ask "allow editing?" again on a new visit: one click. Only desktop Chrome / Edge can do this (showDirectoryPicker);
// elsewhere receiptFolderSupported() is false and the pictures keep going to the normal Downloads.

const RF_DB = "veeramathi-receipts", RF_STORE = "handles", RF_KEY = "folder";
const RF_MODE = { mode: "readwrite" };

const receiptFolderSupported = () => typeof window.showDirectoryPicker === "function";

function rfStore(mode) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(RF_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(RF_STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => resolve(open.result.transaction(RF_STORE, mode).objectStore(RF_STORE));
  });
}
const rfRun = async (mode, action) => new Promise((resolve, reject) => {
  rfStore(mode).then((store) => {
    const req = action(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }, reject);
});

// The chosen folder, or null (never chosen, or this browser cannot do it).
const getReceiptFolder = () => (receiptFolderSupported() ? rfRun("readonly", (s) => s.get(RF_KEY)).then((h) => h || null).catch(() => null) : Promise.resolve(null));

// Must be called from a click. Rejects with AbortError if the clerk closes the picker.
async function chooseReceiptFolder() {
  const handle = await window.showDirectoryPicker({ id: "veeramathi-receipts", mode: "readwrite", startIn: "downloads" });
  await rfRun("readwrite", (s) => s.put(handle, RF_KEY));
  return handle;
}

// Writes the picture into the chosen folder and returns the folder's name; "" when no folder was chosen (the caller then
// does its normal thing). Throws when a folder IS chosen but cannot be written (deleted, or the clerk said no).
async function saveReceiptToFolder(blob, fileName) {
  const dir = await getReceiptFolder();
  if (!dir) return "";
  if ((await dir.queryPermission(RF_MODE)) !== "granted" && (await dir.requestPermission(RF_MODE)) !== "granted") {
    throw new Error("permission was not given");
  }
  const writer = await (await dir.getFileHandle(fileName, { create: true })).createWritable();
  await writer.write(blob);
  await writer.close();
  return dir.name;
}
