import {type Request,type Response,type NextFunction} from 'express';
import {Review} from '../../bot/models/Rewievs.ts';
import { logger } from '../../bot/logger/logger.ts';
import {z} from 'zod';
import mongoose from 'mongoose';




const idSchema = z.object({
    id:z.string().min(1)
});

export const getReviews = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const review = await Review.find({post:false});
        if(review.length===0){
            res.status(404).json({error:'No pending comments available for approval'});;
            return;
        }
        res.status(200).json(review);
    } catch (error) {
        logger.error(error)
        res.status(500).json({error:'Server error while fetching pending reviews'});
    }
};

export const delteReview = async(req:Request,res:Response,next:NextFunction)=>{
    const parsed = idSchema.safeParse(req.query);
    try {
        if(!parsed.success){
            res.status(400).json({error:'Invalid review ID format'});
            return;
        }
        const {id} = parsed.data;
        const reviewId = new mongoose.Types.ObjectId(id);
        const review = await Review.findOneAndDelete({_id:reviewId});
        if(!review){
            res.status(404).json({message:'No review found with the provided ID'});
            return;
        }

        res.status(201).json({message:`Successfully removed comment for ${review.variantName} variant`})
    } catch (error) {
        logger.error(error)
        res.status(500).json({error:'Failed to delete review'});
    }
};

export const editReview = async(req:Request,res:Response,next:NextFunction)=>{
    const parsed = idSchema.safeParse(req.query);
    try {
        if(!parsed.success){
            res.status(400).json({error:'Invalid review ID format'});
            return;
        }
        const {id} = parsed.data;
        const reviewId = new mongoose.Types.ObjectId(id);
        const review = await Review.findOneAndUpdate({_id:reviewId},{
            $set:{post:true}
        },{ new: true });

        if(!review){
            res.status(404).json({message:'No review found with the provided ID'});
            return;
        }
        res.status(200).json({message:`Successfully approved comment for ${review.variantName} variant`})
    } catch (error) {
        logger.error(error)
        res.status(500).json({error:'Failed to approve review'});
    }
}