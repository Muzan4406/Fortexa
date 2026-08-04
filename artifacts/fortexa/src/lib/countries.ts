export type Currency = "FCFA (XOF)" | "USDT (BEP20)";

export interface Country {
  name: string;
  currency: Currency;
}

export const FCFA_COUNTRIES: Country[] = [
  { name: "Togo", currency: "FCFA (XOF)" },
  { name: "Bénin", currency: "FCFA (XOF)" },
  { name: "Burkina Faso", currency: "FCFA (XOF)" },
  { name: "Côte d'Ivoire", currency: "FCFA (XOF)" },
  { name: "Sénégal", currency: "FCFA (XOF)" },
  { name: "Mali", currency: "FCFA (XOF)" },
  { name: "Niger", currency: "FCFA (XOF)" },
  { name: "Guinée-Bissau", currency: "FCFA (XOF)" },
];

export const USDT_COUNTRIES: Country[] = [
  { name: "Cameroun", currency: "USDT (BEP20)" },
  { name: "Congo", currency: "USDT (BEP20)" },
  { name: "République démocratique du Congo", currency: "USDT (BEP20)" },
  { name: "Gabon", currency: "USDT (BEP20)" },
  { name: "Centrafrique", currency: "USDT (BEP20)" },
  { name: "Tchad", currency: "USDT (BEP20)" },
  { name: "Guinée équatoriale", currency: "USDT (BEP20)" },
  { name: "Guinée", currency: "USDT (BEP20)" },
  { name: "Ghana", currency: "USDT (BEP20)" },
  { name: "Nigeria", currency: "USDT (BEP20)" },
  { name: "Sierra Leone", currency: "USDT (BEP20)" },
  { name: "Libéria", currency: "USDT (BEP20)" },
  { name: "Mauritanie", currency: "USDT (BEP20)" },
  { name: "Cabo Verde", currency: "USDT (BEP20)" },
  { name: "São Tomé-et-Príncipe", currency: "USDT (BEP20)" },
  { name: "Rwanda", currency: "USDT (BEP20)" },
  { name: "Burundi", currency: "USDT (BEP20)" },
  { name: "Kenya", currency: "USDT (BEP20)" },
  { name: "Tanzanie", currency: "USDT (BEP20)" },
  { name: "Ouganda", currency: "USDT (BEP20)" },
  { name: "Angola", currency: "USDT (BEP20)" },
  { name: "Madagascar", currency: "USDT (BEP20)" },
  { name: "Comores", currency: "USDT (BEP20)" },
  { name: "Djibouti", currency: "USDT (BEP20)" },
  { name: "Éthiopie", currency: "USDT (BEP20)" },
  { name: "Érythrée", currency: "USDT (BEP20)" },
  { name: "Somalie", currency: "USDT (BEP20)" },
  { name: "Soudan", currency: "USDT (BEP20)" },
  { name: "Soudan du Sud", currency: "USDT (BEP20)" },
  { name: "Maroc", currency: "USDT (BEP20)" },
  { name: "Algérie", currency: "USDT (BEP20)" },
  { name: "Tunisie", currency: "USDT (BEP20)" },
  { name: "Libye", currency: "USDT (BEP20)" },
  { name: "Égypte", currency: "USDT (BEP20)" },
  { name: "Afrique du Sud", currency: "USDT (BEP20)" },
  { name: "Mozambique", currency: "USDT (BEP20)" },
  { name: "Zambie", currency: "USDT (BEP20)" },
  { name: "Zimbabwe", currency: "USDT (BEP20)" },
  { name: "Namibie", currency: "USDT (BEP20)" },
  { name: "Botswana", currency: "USDT (BEP20)" },
  { name: "Malawi", currency: "USDT (BEP20)" },
  { name: "Lesotho", currency: "USDT (BEP20)" },
  { name: "Eswatini", currency: "USDT (BEP20)" },
  { name: "Gambie", currency: "USDT (BEP20)" },
];

export const ALL_COUNTRIES: Country[] = [...FCFA_COUNTRIES, ...USDT_COUNTRIES];

/** Retourne la devise associée à un pays */
export function getCurrencyForCountry(countryName: string): Currency | null {
  const found = ALL_COUNTRIES.find((c) => c.name === countryName);
  return found?.currency ?? null;
}

/** Retourne true si le pays utilise le FCFA (XOF) */
export function isFcfaCountry(countryName: string): boolean {
  return FCFA_COUNTRIES.some((c) => c.name === countryName);
}
