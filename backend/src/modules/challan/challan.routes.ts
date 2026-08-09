import { Router } from 'express';
import { getChallans, getChallan, createChallan, updateChallan } from './challan.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createChallanSchema, updateChallanSchema } from './challan.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), getChallans);
router.get('/:id', authorize(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), getChallan);
router.post('/', authorize(['ADMIN', 'SALES']), validate(createChallanSchema), createChallan);
router.put('/:id', authorize(['ADMIN', 'SALES']), validate(updateChallanSchema), updateChallan);

export default router;
