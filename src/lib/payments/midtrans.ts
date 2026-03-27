import { env } from "@/lib/env";
import crypto from "node:crypto";

type MidtransQrisChargeResponse = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_status: string;
  fraud_status?: string;
  qr_string?: string;
  actions?: Array<{ name: string; method: string; url: string }>;
};

type MidtransTransactionStatusResponse = {
  status_code: string;
  status_message: string;
  transaction_id?: string;
  order_id?: string;
  payment_type?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
};

export type CreateMidtransQrisChargeInput = {
  orderId: string;
  grossAmount: number;
  notificationUrl: string;
};

export type CreateMidtransQrisChargeResult = {
  provider: "midtrans";
  providerRef: string;
  providerStatus: string;
  qrString: string;
  qrImageUrl: string | null;
  raw: unknown;
};

function getMidtransApiBase() {
  const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function getBasicAuthHeader(serverKey: string) {
  const token = Buffer.from(`${serverKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function formatMidtransErrorMessage(status: number, bodyText: string) {
  try {
    const obj = JSON.parse(bodyText) as Record<string, unknown>;
    const statusMessage = typeof obj.status_message === "string" ? obj.status_message : null;
    const statusCode = typeof obj.status_code === "string" ? obj.status_code : null;
    const validationMessages = Array.isArray(obj.validation_messages)
      ? obj.validation_messages.filter((v): v is string => typeof v === "string")
      : [];
    const extra = validationMessages.length ? ` | ${validationMessages.join(" | ")}` : "";
    if (statusMessage) {
      return `Midtrans QRIS gagal: ${statusMessage}${statusCode ? ` (code ${statusCode})` : ""} (HTTP ${status})${extra}`;
    }
  } catch {}

  const trimmed = bodyText.trim();
  return `Midtrans QRIS gagal (HTTP ${status}): ${trimmed || "Unknown error"}`;
}

export async function createMidtransQrisCharge(
  input: CreateMidtransQrisChargeInput,
): Promise<CreateMidtransQrisChargeResult> {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY belum diset");
  }

  const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
  if (isProd && env.MIDTRANS_SERVER_KEY.startsWith("SB-")) {
    throw new Error("Konfigurasi Midtrans tidak valid: MIDTRANS_IS_PRODUCTION=true tapi MIDTRANS_SERVER_KEY sandbox");
  }

  const amountInt = Math.round(input.grossAmount);
  if (!Number.isFinite(amountInt) || amountInt <= 0) {
    throw new Error("Nominal QRIS tidak valid");
  }

  const res = await fetch(`${getMidtransApiBase()}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getBasicAuthHeader(env.MIDTRANS_SERVER_KEY),
      "X-Override-Notification": input.notificationUrl,
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: input.orderId,
        gross_amount: amountInt,
      },
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(formatMidtransErrorMessage(res.status, bodyText));
  }

  const data = JSON.parse(bodyText) as MidtransQrisChargeResponse;
  if (data.status_code !== "201") {
    throw new Error(
      `Midtrans QRIS gagal: ${data.status_message || "Unknown error"} (code ${data.status_code || "?"})`,
    );
  }
  if (!data.transaction_id || typeof data.transaction_id !== "string") {
    throw new Error("Midtrans tidak mengembalikan transaction_id");
  }
  const qrString = data.qr_string;
  if (!qrString || typeof qrString !== "string") {
    throw new Error("Midtrans tidak mengembalikan qr_string");
  }

  const qrImageUrl =
    data.actions?.find((a) => typeof a?.url === "string" && a.url.startsWith("http"))?.url ?? null;

  return {
    provider: "midtrans",
    providerRef: data.transaction_id,
    providerStatus: data.transaction_status,
    qrString,
    qrImageUrl,
    raw: data,
  };
}

export async function getMidtransTransactionStatus(orderId: string): Promise<MidtransTransactionStatusResponse> {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY belum diset");
  }
  if (!orderId) throw new Error("orderId tidak valid");

  const res = await fetch(`${getMidtransApiBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: getBasicAuthHeader(env.MIDTRANS_SERVER_KEY),
    },
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(formatMidtransErrorMessage(res.status, bodyText));
  }

  return JSON.parse(bodyText) as MidtransTransactionStatusResponse;
}

export function verifyMidtransSignature(payload: unknown) {
  if (!env.MIDTRANS_SERVER_KEY) return false;
  const obj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

  const orderId = typeof obj.order_id === "string" ? obj.order_id : "";
  const statusCode = typeof obj.status_code === "string" ? obj.status_code : "";
  const grossAmount = typeof obj.gross_amount === "string" ? obj.gross_amount : "";
  const signatureKey = typeof obj.signature_key === "string" ? obj.signature_key : "";
  if (!orderId || !statusCode || !grossAmount || !signatureKey) return false;

  const computed = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");

  return computed === signatureKey;
}
