import { Request, Response, NextFunction } from 'express';
import { CustomerService } from './customer.service.js';
import { sendSuccess } from '../../utils/response.js';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, type, status, limit, offset } = req.query;
    const result = await CustomerService.list({
      search: search as string,
      type: type as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    });
    return sendSuccess(res, result, 'Customers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await CustomerService.getById(id);
    return sendSuccess(res, result, 'Customer details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await CustomerService.create(req.body, userId);
    return sendSuccess(res, result, 'Customer created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await CustomerService.update(id, req.body);
    return sendSuccess(res, result, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

export const addFollowUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { note, follow_up_date } = req.body;
    const userId = req.user!.id;
    const result = await CustomerService.addFollowUp(id, note, follow_up_date, userId);
    return sendSuccess(res, result, 'Follow-up logged successfully', 201);
  } catch (error) {
    next(error);
  }
};
