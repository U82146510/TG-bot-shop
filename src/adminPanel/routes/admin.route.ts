import { Router } from "express";
import {getOrder,editOrder,deleteOrder} from '../controller/order.controller.ts';
import {getUser,editUser,delUser} from '../controller/user.controler.ts';
import {getProduct,editProduct,addProduct,deleteProduct} from '../controller/product.controller.ts';
import {deleteModel,uploadModel,getModel} from '../controller/model.controller.ts';
import {paymentHandler} from '../controller/payment.controller.ts';
import {getReviews,deleteReview,editReview} from '../controller/review.controller.ts';

export const adminRoute:Router = Router();


// Review related routes
adminRoute.get('/review',getReviews);             //done
adminRoute.delete('/review/:id',deleteReview);
adminRoute.patch('/review/:id',editReview);


// Order related routes
adminRoute.get('/orders',getOrder);                 //done
adminRoute.patch('/orders/:orderId', editOrder);
adminRoute.delete('/orders/:orderId',deleteOrder);

// Payment related routes
adminRoute.get('/payment',paymentHandler);  // working

// Product related routes
adminRoute.get('/product',getProduct);
adminRoute.patch('/product',editProduct);
adminRoute.put('/product',addProduct);
adminRoute.delete('/product',deleteProduct);


// Model related routes
adminRoute.delete('/model',deleteModel);
adminRoute.post('/model',uploadModel);
adminRoute.get('/model',getModel);


// User related routes.
adminRoute.get('/users/:username',getUser);           //done
adminRoute.patch('/users/:username',editUser);
adminRoute.delete('/users/:username',delUser);