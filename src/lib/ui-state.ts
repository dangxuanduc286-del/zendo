/** True when a global storefront overlay (e.g. marketing popup) is visible — support panel defers to it. */
let isGlobalOverlayOpen = false;

export function setGlobalOverlayOpen(next: boolean): void {
  if (isGlobalOverlayOpen === next) return;
  isGlobalOverlayOpen = next;
}
