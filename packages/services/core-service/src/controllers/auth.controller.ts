import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema } from '../schemas';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-para-dev';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, tenantId, companyId } = registerSchema.parse(req.body);
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword
        }
      });

      let role = await prisma.role.findFirst({
        where: { name: 'USER', tenantId }
      });

      if (!role) {
        role = await prisma.role.create({
          data: { name: 'USER', tenantId }
        });
      }

      await prisma.membership.create({
        data: {
          userId: user.id,
          tenantId,
          companyId,
          roleId: role.id
        }
      });

      const { password: _, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(400).json({ error: 'Erro ao registrar usuário.', details: error });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: {
              tenant: true,
              role: true
            }
          }
        }
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          tenants: user.memberships.map(m => ({
            id: m.tenantId,
            role: m.role.name
          }))
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }
}
