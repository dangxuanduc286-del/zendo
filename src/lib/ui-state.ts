/** True when a global storefront overlay (e.g. marketing popup) is visible — support panel defers to it. */
export let isGlobalOverlayOpen = false;

const overlayListeners = new Set<() => void>();

export function subscribeGlobalOverlayOpen(callback: () => void): () => void {
  overlayListeners.add(callback);
  return () => {
    overlayListeners.delete(callback);
  };
}

export function notifyGlobalOverlayOpenChanged(): void {
  overlayListeners.forEach((cb) => {
    cb();
  });
}

export function setGlobalOverlayOpen(next: boolean): void {
  if (isGlobalOverlayOpen === next) return;
  isGlobalOverlayOpen = next;
  notifyGlobalOverlayOpenChanged();
}
