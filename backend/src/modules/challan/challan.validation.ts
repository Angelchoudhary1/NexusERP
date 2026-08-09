import { z } from 'zod';

export const createChallanSchema = z.object({
  body: z.object({
    customer_id: z.number({ required_error: 'Customer ID is required' }).int(),
    status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
    items: z.array(
      z.object({
        product_id: z.number({ required_error: 'Product ID is required' }).int(),
        quantity: z.number({ required_error: 'Quantity is required' }).int().min(1, 'Quantity must be at least 1')
      })
    ).min(1, 'A challan must contain at least one item')
  })
});

export const updateChallanSchema = z.object({
  body: z.object({
    customer_id: z.number().int().optional(),
    status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
    items: z.array(
      z.object({
        product_id: z.number().int(),
        quantity: z.number().int().min(1)
      })
    ).min(1).optional()
  })
});
