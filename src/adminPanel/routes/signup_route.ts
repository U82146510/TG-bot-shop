import { Router } from "express";
import {signup,updatePassword} from '../controller/signup.controller.ts';
export const signupRoute:Router = Router();

signupRoute.post('/signup',signup);
signupRoute.patch('/update',updatePassword);