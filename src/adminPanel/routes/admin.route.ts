import { Router } from "express";
import {orderHandler} from '../controller/order.controller.ts';
import {getUser,editUser,delUser} from '../controller/user.controler.ts';
import {getProduct,editProduct,deleteModel,uploadModel,addVariant} from '../controller/product.controller.ts';
import {paymentHandler} from '../controller/payment.controller.ts';


export const adminRoute:Router = Router();

// Order related routes
adminRoute.get('/orders',orderHandler);

// Payment related routes
adminRoute.get('/payments',paymentHandler);

// Product related routes
adminRoute.get('/product',getProduct);
adminRoute.patch('/product',editProduct);
adminRoute.delete('/product',deleteModel);
adminRoute.post('/product',uploadModel);
adminRoute.put('/product',addVariant);

// User related routes.
adminRoute.get('/users/:username',getUser);
adminRoute.put('/users/:username',editUser);
adminRoute.delete('/users/:username',delUser);