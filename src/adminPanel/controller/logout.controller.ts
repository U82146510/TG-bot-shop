import { type Request,type Response,type NextFunction } from "express";
import { logger } from "../../bot/logger/logger.ts";
export const logOut = async(req:Request,res:Response,next:NextFunction)=>{
    try {
       if(req.session){
        req.session.destroy((err)=>{
            if(err){
                logger.error("Error destroying session:", err);
                return res.status(500).json({ error: "Logout failed" });
            }
            res.clearCookie('admin.sid',{
                httpOnly:true,
                sameSite:'strict',
                secure:false
            })
            res.status(200).json({ message: "Logged out successfully" });
        });
       }else{
        res.status(200).json({ message: "No active session" });
       }
    } catch (error) {
        res.status(500).json({error:'Internal server error'});
    }
};