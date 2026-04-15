import { z } from 'zod';

export const tenantSchema = z.object({
  name: z.string().min(1, 'Nome do tenant é obrigatório'),
});

export const companySchema = z.object({
  name: z.string().min(1, 'Nome da empresa é obrigatório'),
  tenantId: z.string().min(1, 'Tenant ID é obrigatório'),
});

export const roleSchema = z.object({
  name: z.string().min(1, 'Nome da role é obrigatória'),
  tenantId: z.string().min(1, 'Tenant ID é obrigatório'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  tenantId: z.string().min(1, 'Tenant ID é obrigatório'),
  companyId: z.string().min(1, 'Company ID é obrigatório'),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});
