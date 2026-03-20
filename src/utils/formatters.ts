/**
 * Utility formatters for currency, dates, and phone numbers
 */

export const formatCurrency = (value: number): string => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('pt-BR');
};

export const formatDateFull = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const cleanCpfCnpj = (cpfCnpj: string): string => {
  return cpfCnpj.replace(/\D/g, '');
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
