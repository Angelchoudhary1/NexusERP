import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRouter from './modules/auth/auth.routes.js';
import customerRouter from './modules/customer/customer.routes.js';
import productRouter from './modules/product/product.routes.js';
import challanRouter from './modules/challan/challan.routes.js';

import { errorMiddleware } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://nexus-erp-3dc4.vercel.app'
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log('CORS Origin:', origin);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NexusERP API is running'
  });
});

app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/challans', challanRouter);

app.use(errorMiddleware);

export default app;