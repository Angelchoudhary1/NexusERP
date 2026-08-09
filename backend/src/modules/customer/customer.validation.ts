import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    customer_name: z.string({ required_error: 'Customer name is required' }).min(2, 'Name must be at least 2 characters'),
    mobile: z.string({ required_error: 'Mobile number is required' }).min(10, 'Mobile must be at least 10 digits'),
    email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
    business_name: z.string().optional().nullable().or(z.literal('')),
    gst_number: z.string().max(15, 'GST number cannot exceed 15 characters').optional().nullable().or(z.literal('')),
    customer_type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'], {
      required_error: 'Customer type must be RETAIL, WHOLESALE, or DISTRIBUTOR',
    }),
    address: z.string().optional().nullable().or(z.literal('')),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
    follow_up_date: z.string().datetime({ offset: true }).optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()).or(z.literal('')),
    notes: z.string().optional().nullable().or(z.literal('')),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    customer_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    mobile: z.string().min(10, 'Mobile must be at least 10 digits').optional(),
    email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
    business_name: z.string().optional().nullable().or(z.literal('')),
    gst_number: z.string().max(15, 'GST number cannot exceed 15 characters').optional().nullable().or(z.literal('')),
    customer_type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
    address: z.string().optional().nullable().or(z.literal('')),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
    follow_up_date: z.string().optional().nullable().or(z.literal('')),
    notes: z.string().optional().nullable().or(z.literal('')),
  }),
});

export const addFollowUpSchema = z.object({
  body: z.object({
    note: z.string({ required_error: 'Follow-up note is required' }).min(1, 'Note cannot be empty'),
    follow_up_date: z.string({ required_error: 'Next follow-up date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  }),
});
