import "server-only";

import type { ConversionDispatchProvider } from "@prisma/client";

export type ConversionDispatchContext = {
  provider: ConversionDispatchProvider;
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
  orderId: string;
  eventTimeSec: number;
  eventId: string;
  currency: string;
  value: number;
  contentIds: string[];
  customerEmailHash: string | null;
  customerPhoneHash: string | null;
  ttclid: string | null;
  fbclid: string | null;
};

export type ConversionDispatchResult = {
  ok: boolean;
  httpStatus: number;
  latencyMs: number;
  providerEventName: string;
  /** Truncated — no tokens or raw PII. */
  responseSnippet: string | null;
};

export interface ConversionProviderAdapter {
  readonly provider: ConversionDispatchProvider;
  sendPurchase(ctx: ConversionDispatchContext): Promise<ConversionDispatchResult>;
}
