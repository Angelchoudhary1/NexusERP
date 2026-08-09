import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';
import { sendSuccess } from '../../utils/response.js';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, limit, offset } = req.query;
    const result = await ProductService.list({
      search: search as string,
      category: category as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    });
    return sendSuccess(res, result, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await ProductService.getById(id);
    return sendSuccess(res, result, 'Product details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await ProductService.create(req.body, userId);
    return sendSuccess(res, result, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await ProductService.update(id, req.body);
    return sendSuccess(res, result, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { movement_type, quantity, reason } = req.body;
    const userId = req.user!.id;
    const result = await ProductService.adjustStock(id, movement_type, quantity, reason, userId);
    return sendSuccess(res, result, 'Stock level adjusted successfully');
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await ProductService.getMovements(id);
    return sendSuccess(res, result, 'Stock movements retrieved successfully');
  } catch (error) {
    next(error);
  }
};
