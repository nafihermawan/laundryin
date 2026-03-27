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

export async function createMidtransQrisCharge(
  input: CreateMidtransQrisChargeInput,
): Promise<CreateMidtransQrisChargeResult> {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY belum diset");
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
    throw new Error(`Midtrans create QRIS gagal (${res.status}): ${bodyText}`);
  }

  const data = JSON.parse(bodyText) as MidtransQrisChargeResponse;
  const qrString = data.qr_string;
  if (!qrString || typeof qrString !== "string") {
    throw new Error("Midtrans tidak mengembalikan qr_string");
  }

  return {
    provider: "midtrans",
    providerRef: data.transaction_id,
    providerStatus: data.transaction_status,
    qrString,
    raw: data,
  };
}

export function verifyMidtransSignature(payload: {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
}) {
  if (!env.MIDTRANS_SERVER_KEY) return false;
  const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
  const statusCode = typeof payload.status_code === "string" ? payload.status_code : "";
  const grossAmount = typeof payload.gross_amount === "string" ? payload.gross_amount : "";
  const signatureKey = typeof payload.signature_key === "string" ? payload.signature_key : "";
  if (!orderId || !statusCode || !grossAmount || !signatureKey) return false;

  const computed = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");

  return computed === signatureKey;
}

