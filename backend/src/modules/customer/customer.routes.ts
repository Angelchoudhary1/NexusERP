import { Router } from 'express';
import { getCustomers, getCustomer, createCustomer, updateCustomer, addFollowUp } from './customer.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createCustomerSchema, updateCustomerSchema, addFollowUpSchema } from './customer.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['ADMIN', 'SALES', 'ACCOUNTS']), getCustomers);
router.get('/:id', authorize(['ADMIN', 'SALES', 'ACCOUNTS']), getCustomer);
router.post('/', authorize(['ADMIN', 'SALES']), validate(createCustomerSchema), createCustomer);
router.put('/:id', authorize(['ADMIN', 'SALES']), validate(updateCustomerSchema), updateCustomer);
router.post('/:id/follow-ups', authorize(['ADMIN', 'SALES']), validate(addFollowUpSchema), addFollowUp);

export default router;
