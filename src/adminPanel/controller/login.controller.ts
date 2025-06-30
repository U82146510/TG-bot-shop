import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';

export const login = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        
    } catch (error) {
        logger.error(error);
        res.status(500).json({error:'error at login route'});
    }
}