import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const adminController = new AdminController();

router.get('/api/config', (req, res) => adminController.getConfig(req, res));
router.post('/tenants', (req, res) => adminController.createTenant(req, res));
router.post('/companies', (req, res) => adminController.createCompany(req, res));
router.post('/roles', (req, res) => adminController.createRole(req, res));

export default router;
