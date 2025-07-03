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
adminRoute.delete('/review/:id',deleteReview);   //done
adminRoute.patch('/review/:id',editReview);  //done


// Order related routes
adminRoute.get('/orders',getOrder);                 //done
adminRoute.patch('/orders/:orderId', editOrder);  //done
adminRoute.delete('/orders/:orderId',deleteOrder); //done

// Payment related routes
adminRoute.get('/payment',paymentHandler);  // done

// Product related routes
adminRoute.get('/product',getProduct); //done
adminRoute.patch('/product',editProduct); //working
adminRoute.post('/product',addProduct); //done
adminRoute.delete('/product',deleteProduct); //done


// Model related routes
adminRoute.delete('/model/:model',deleteModel);  //done
adminRoute.post('/model',uploadModel);  //done
adminRoute.get('/model/:model',getModel); //done


// User related routes.
adminRoute.get('/users/:username',getUser);           //done
adminRoute.patch('/users/:username',editUser);      //done
adminRoute.delete('/users/:username',delUser);      //done