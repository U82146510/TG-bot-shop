import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import {z} from 'zod';
import { authUser } from '../models/authUser.ts';
import bcrypt from 'bcryptjs';

const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5KfUdiW.SiV3X2XnFk4Ltp0jJX61ZxW';

const userSchema  = z.object({
    email:z.string().email(),
    password:z.string().min(14)
    .regex(/[A-Z]/)
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    pinCode:z.string().regex(/^\d{8}$/, 'Pin code must be exactly 8 digits')
});

export const login = async(req:Request,res:Response,next:NextFunction)=>{
    const parsed = userSchema.safeParse(req.body);
    try {
        if(!parsed.success){
            res.status(400).json({error:'Wrong input'});
            return;
        }
        const {email,password,pinCode} = parsed.data;
        const user = await authUser.findOne({email:email}).select('+pinCode');;
        if(!user){
            res.status(404).json({message:'There no such a user'});
            return;
        }
        const isMatchPassword = await user.comparePasswords(password);
        if(!isMatchPassword){
            await bcrypt.compare(password, DUMMY_HASH);
            res.status(401).json({message:'Incorrect password'});
            return;
        }
        const isMatchPin = await user.comparePin(pinCode);
        if(!isMatchPin){
            await bcrypt.compare(password, DUMMY_HASH);
            res.status(401).json({message:'Incorrect pin'});
            return;
        }


        req.session.userId = user._id.toString()
        res.status(200).json({message:'successfully logged in'});
    } catch (error) {
        logger.error(error);
        res.status(500).json({error:'error at login route'});
    }
};