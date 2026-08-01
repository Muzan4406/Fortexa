export function formatCurrency(amount: number, decimals: number = 0): string {
  const fixed = amount.toFixed(decimals);
  const parts = fixed.split('.');
  
  // Format integer part with spaces as thousands separators
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Combine with decimal part if exists
  const formatted = parts[1] ? `${integerPart}.${parts[1]}` : integerPart;
  
  return `${formatted} FCFA`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
