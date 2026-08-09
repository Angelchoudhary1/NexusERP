import { Request, Response, NextFunction } from 'express';
import { ChallanService } from './challan.service.js';
import { sendSuccess } from '../../utils/response.js';

export const getChallans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, customerId, limit, offset } = req.query;
    const result = await ChallanService.list({
      status: status as string,
      customerId: customerId ? parseInt(customerId as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    });
    return sendSuccess(res, result, 'Challans retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await ChallanService.getById(id);
    return sendSuccess(res, result, 'Challan details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await ChallanService.create(req.body, userId);
    return sendSuccess(res, result, 'Challan created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const result = await ChallanService.update(id, req.body, userId);
    return sendSuccess(res, result, 'Challan updated successfully');
  } catch (error) {
    next(error);
  }
};
