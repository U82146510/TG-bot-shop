import { Router } from "express";
import {logOut} from '../controller/logout.controller.ts';
import { protectRoute } from "../middleware/protectRoute.ts";

const logOutRoute:Router = Router();
logOutRoute.use(protectRoute);

logOutRoute.post('/logout',logOut);
