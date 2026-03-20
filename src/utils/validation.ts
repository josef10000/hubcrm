import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  cpfCnpj: z.string().refine(
    val => !val || val.replace(/\D/g, '').length === 11 || val.replace(/\D/g, '').length === 14, 
    "CPF/CNPJ deve ter 11 ou 14 dígitos"
  ).optional().or(z.literal('')),
  whatsapp: z.string().refine(
    val => !val || val.replace(/\D/g, '').length >= 10, 
    "WhatsApp deve ter pelo menos 10 dígitos"
  ).optional().or(z.literal('')),
});
