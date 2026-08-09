import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, adjustStock, getMovements } from './product.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createProductSchema, updateProductSchema, adjustStockSchema } from './product.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', authorize(['ADMIN', 'WAREHOUSE']), validate(createProductSchema), createProduct);
router.put('/:id', authorize(['ADMIN', 'WAREHOUSE']), validate(updateProductSchema), updateProduct);
router.get('/:id/movements', authorize(['ADMIN', 'WAREHOUSE', 'ACCOUNTS']), getMovements);
router.post('/:id/stock', authorize(['ADMIN', 'WAREHOUSE']), validate(adjustStockSchema), adjustStock);

export default router;
