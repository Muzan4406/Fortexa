/**
 * Sendavapay API SDK client — server-side only.
 * The SDK key must never be exposed to the frontend.
 * CORS client endpoints (initiate-payment, submit-otp) are also proxied
 * through this module so the frontend never calls Sendavapay directly.
 */

const BASE_URL = "https://sendavapay.com/api/sdk/v1";

function sdkHeaders(key: string): Record<string, string> {
  if (!key) throw new Error("Clé Sendavapay non configurée — configurez-la dans les paramètres admin");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function corsHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

async function sdkFetch<T = unknown>(
  key: string,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: sdkHeaders(key),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

// ─── Backend (SDK-key) endpoints ─────────────────────────────────────────────

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  description?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  payerCountry: string;
  webhookUrl: string;
  externalReference: string;
}

export interface CreatePaymentResult {
  success: boolean;
  data?: {
    reference: string;
    paymentToken: string;
    expiresAt: string;
    amount: number;
    currency: string;
    status: string;
    walletRouting: { detectedCountry: string; targetWallet: string };
  };
  error?: string;
  code?: string;
}

export function createPayment(key: string, params: CreatePaymentParams): Promise<CreatePaymentResult> {
  return sdkFetch(key, "/create-payment", { method: "POST", body: params });
}

export interface VerifyPaymentResult {
  success: boolean;
  data?: {
    reference: string;
    externalReference: string;
    amount: string;
    fee: string;
    currency: string;
    status: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    paymentMethod: string;
    createdAt: string;
    completedAt: string | null;
  };
  error?: string;
}

export function verifyPayment(key: string, reference: string): Promise<VerifyPaymentResult> {
  return sdkFetch(key, "/verify-payment", { method: "POST", body: { reference } });
}

export interface PaymentStatusResult {
  success: boolean;
  data?: {
    reference: string;
    status: string;
    amount: string;
    currency: string;
    completedAt: string | null;
  };
  error?: string;
}

export interface PaymentTokenResult {
  success: boolean;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    description?: string;
    ownerName?: string;
    status: string;
  };
  error?: string;
  code?: string;
}

export function getPaymentToken(paymentToken: string): Promise<PaymentTokenResult> {
  return fetch(`${BASE_URL}/payment-token/${encodeURIComponent(paymentToken)}`)
    .then((res) => res.json() as Promise<PaymentTokenResult>);
}

export function getPaymentStatus(key: string, reference: string): Promise<PaymentStatusResult> {
  return sdkFetch(key, `/payment-status/${reference}`);
}

// ─── CORS client endpoints (no SDK key, proxied for security) ────────────────

export interface OperatorInfo {
  id: string;
  name: string;
  requiresOtp: boolean;
  status: string;
}

export interface GetOperatorsResult {
  success: boolean;
  data?: OperatorInfo[];
  error?: string;
}

export async function getOperators(countryCode: string): Promise<GetOperatorsResult> {
  const res = await fetch(`${BASE_URL}/operators/${countryCode}`, {
    headers: corsHeaders(),
  });
  return res.json() as Promise<GetOperatorsResult>;
}

export interface InitiatePaymentParams {
  paymentToken: string;
  payerName: string;
  payerPhone: string;
  payerEmail?: string;
  payerCountry: string;
  operatorId: string;
}

export interface InitiatePaymentResult {
  success: boolean;
  requiresOtp?: boolean;
  otpToken?: string;
  requiresRedirect?: boolean;
  redirectUrl?: string;
  reference?: string;
  message?: string;
  error?: string;
  code?: string;
}

export async function initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
  const res = await fetch(`${BASE_URL}/initiate-payment`, {
    method: "POST",
    headers: corsHeaders(),
    body: JSON.stringify(params),
  });
  const result = await res.json() as InitiatePaymentResult;
  if (!result.success && !result.error && result.message) {
    result.error = result.message;
  }
  return result;
}

export interface SubmitOtpResult {
  success: boolean;
  reference?: string;
  message?: string;
  error?: string;
}

export async function submitOtp(params: { otpToken: string; otp: string }): Promise<SubmitOtpResult> {
  const res = await fetch(`${BASE_URL}/submit-otp`, {
    method: "POST",
    headers: corsHeaders(),
    body: JSON.stringify(params),
  });
  return res.json() as Promise<SubmitOtpResult>;
}
