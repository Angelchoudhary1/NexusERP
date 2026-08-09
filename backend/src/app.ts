import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routers
import authRouter from './modules/auth/auth.routes.js';
import customerRouter from './modules/customer/customer.routes.js';
import productRouter from './modules/product/product.routes.js';
import challanRouter from './modules/challan/challan.routes.js';

// Import error handler
import { errorMiddleware } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "NexusERP API is running"
  });
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/challans', challanRouter);

// Global Error Handler (must be registered last)
app.use(errorMiddleware);

export default app;
