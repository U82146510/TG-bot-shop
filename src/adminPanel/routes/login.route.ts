import { Router } from "express";
import {login} from '../controller/login.controller.ts';


export const loginRoute:Router = Router();

loginRoute.post('/login',login);