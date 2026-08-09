import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    product_name: z.string({ required_error: 'Product name is required' }).min(2, 'Name must be at least 2 characters'),
    sku: z.string({ required_error: 'SKU is required' }).min(2, 'SKU must be at least 2 characters'),
    category: z.string({ required_error: 'Category is required' }),
    unit_price: z.number({ required_error: 'Unit price is required' }).min(0, 'Price cannot be negative'),
    current_stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
    min_stock_alert: z.number().int().min(0, 'Min stock alert quantity cannot be negative').default(5),
    location: z.string().optional().nullable().or(z.literal('')),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    product_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    sku: z.string().min(2, 'SKU must be at least 2 characters').optional(),
    category: z.string().optional(),
    unit_price: z.number().min(0, 'Price cannot be negative').optional(),
    current_stock: z.number().int().min(0, 'Stock cannot be negative').optional(),
    min_stock_alert: z.number().int().min(0, 'Min stock alert quantity cannot be negative').optional(),
    location: z.string().optional().nullable().or(z.literal('')),
    is_active: z.boolean().optional(),
  }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    quantity: z.number({ required_error: 'Quantity is required' }).int().min(1, 'Quantity must be at least 1'),
    movement_type: z.enum(['IN', 'OUT'], { required_error: 'Movement type must be IN or OUT' }),
    reason: z.string({ required_error: 'Reason is required' }).min(1, 'Reason cannot be empty'),
  }),
});
