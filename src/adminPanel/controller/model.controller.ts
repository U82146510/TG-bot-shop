import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Product } from '../../bot/models/Products.ts';
import {z} from 'zod';



const modelParamsSchema = z.object({
    model:z.string().min(1)
});

export const deleteModel = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const parsed = modelParamsSchema.safeParse(req.query);
        if(!parsed.success){
            res.status(400).json({error:'again you small dick? stop inserting wrong inputs'})
            return;
        }
        const {model} = parsed.data;
        const exits = await Product.findOne({name:model});
        if(!exits){
            res.status(404).json({error:'Such a product does not exists'});
            return;
        }
        const product = await Product.findOneAndDelete({name:model});
        if(!product){
            res.status(404).json({error:'Model does not exist you little fagget'});
            return;
        }
        res.status(200).json({message:`product ${product.name} deleted`});
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal server error at deleteModel' });
    }
};


const uploadModelSchema = z.object({
  name: z.string(),
  models: z.array(
    z.object({
      name: z.string(),
      options: z.array( 
        z.object({
          name: z.string(),
          price: z.number(),
          quantity: z.number(),
          description: z.string(),
        })
      )
    })
  )
});


export const uploadModel = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const parsed = uploadModelSchema.safeParse(req.body);
        if(!parsed.success){
            res.status(400).json({error:'You tried to upload incomplet data'});
            return;
        }

        const existingProduct = await Product.findOne({ name: parsed.data.name });
        if (existingProduct) {
            res.status(409).json({ error: 'Product with this name already exists' });
            return;
        }

        const product = await Product.create(parsed.data);
        res.status(201).json({message:`Product ${product.name} uploaded`})
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal server error at uploadModel' });
    }
};


const getModelParamsSchema = z.object({
    model:z.string().min(1).optional()
});

export const getModel = async(req:Request,res:Response,next:NextFunction)=>{
  const parsed = getModelParamsSchema.safeParse(req.query);
  try {
    if(!parsed.success){
      res.status(400).json({error:'wrong input'});
      return;
    }
    const filter:Record<string,any> = {};
    if(parsed.data.model) filter.name = parsed.data.model;
    const model = await Product.find(filter).exec();
    if(model.length===0){
      res.status(404).json({message:'There are no models DB'});
      return;
    }
    res.status(200).json(model);
  } catch (error) {
    logger.error(error);
  }
}