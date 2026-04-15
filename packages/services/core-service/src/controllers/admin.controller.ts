import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { tenantSchema, companySchema, roleSchema } from '../schemas';

const prisma = new PrismaClient();

export class AdminController {
  async getConfig(req: Request, res: Response) {
    return res.json({
      UNAUTHED_ERR_MSG: 'Please login (10001)',
      NOT_ADMIN_ERR_MSG: 'You do not have required permission (10002)',
      AXIOS_TIMEOUT_MS: 30000,
      COOKIE_NAME: 'app_session_id'
    });
  }

  async createTenant(req: Request, res: Response) {
    try {
      const { name } = tenantSchema.parse(req.body);
      const tenant = await prisma.tenant.create({ data: { name } });
      return res.status(201).json(tenant);
    } catch (error) {
      console.error('Erro ao criar tenant:', error);
      return res.status(400).json({ error: 'Erro ao criar tenant.', details: error });
    }
  }

  async createCompany(req: Request, res: Response) {
    try {
      const { name, tenantId } = companySchema.parse(req.body);
      const company = await prisma.company.create({ data: { name, tenantId } });
      return res.status(201).json(company);
    } catch (error) {
      console.error('Erro ao criar company:', error);
      return res.status(400).json({ error: 'Erro ao criar company.' });
    }
  }

  async createRole(req: Request, res: Response) {
    try {
      const { name, tenantId } = roleSchema.parse(req.body);
      const role = await prisma.role.create({ data: { name, tenantId } });
      return res.status(201).json(role);
    } catch (error) {
      console.error('Erro ao criar role:', error);
      return res.status(400).json({ error: 'Erro ao criar role.' });
    }
  }
}
