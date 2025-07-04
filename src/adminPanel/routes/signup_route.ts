import { Router } from "express";
import {signup} from '../controller/signup.controller.ts';
import { protectRoute } from "../middleware/protectRoute.ts";
export const signupRoute:Router = Router();

signupRoute.use(protectRoute);
signupRoute.post('/signup',signup);