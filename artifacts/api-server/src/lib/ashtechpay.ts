const BASE_URL = "https://ashtechpay.top";

type AshtechResponse<T> = T & { error?: string; message?: string; code?: string };

function headers(key: string) {
  if (!key) throw new Error("Clé AshtechPay non configurée");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(key: string, path: string, options: RequestInit = {}): Promise<{ status: number; data: AshtechResponse<T> }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(key), ...(options.headers ?? {}) },
  });
  const data = await response.json() as AshtechResponse<T>;
  return { status: response.status, data };
}

export interface AshtechCountry {
  code: string;
  name: string;
  currency: string;
  operators: string[];
}

export function getCountries(key: string) {
  return request<AshtechCountry[]>(key, "/v1/countries");
}

export interface CollectParams {
  amount: number;
  currency: string;
  phone: string;
  operator: string;
  country_code: string;
  reference: string;
  notify_url: string;
  otp?: string;
}

export interface CollectResult {
  transaction_id?: string;
  reference?: string;
  status?: string;
  amount?: number;
  credited_amount?: number;
  fee_amount?: number;
  currency?: string;
  operator?: string;
  phone?: string;
  country_code?: string;
  flow?: string;
  wave_url?: string;
  ussd_code?: string | null;
}

export function collect(key: string, params: CollectParams) {
  return request<CollectResult>(key, "/v1/collect", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getTransaction(key: string, transactionId: string) {
  return request<{
    transaction_id: string;
    reference: string;
    status: "pending" | "success" | "failed";
    amount: number;
    credited_amount?: number;
    fee_amount?: number;
  }>(key, `/v1/transaction/${encodeURIComponent(transactionId)}`);
}