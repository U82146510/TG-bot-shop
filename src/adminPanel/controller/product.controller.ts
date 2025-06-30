import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Product } from '../../bot/models/Products.ts';
import {z} from 'zod';


const variantActionSchema = z.object({
  model: z.string().min(1),
  option: z.string().min(1),
  variant: z.string().min(1)
});


const addVariantSchema = z.object({
  product: z.string().min(1),
  model: z.string().min(1)
});

const variantSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  description: z.string()
});


export const addProduct = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const queryParsed = addVariantSchema.safeParse(req.query);
        const bodyParsed = variantSchema.safeParse(req.body);
        if(!queryParsed.success || !bodyParsed.success){
            res.status(400).json({error:'invalid input at adding Variants'});
            return;
        }
        const {product,model} = queryParsed.data;

           const existingVariant = await Product.findOne({
            name: product,
            'models.name': model,
            'models.options.name': bodyParsed.data.name
        });

        if (existingVariant) {
            res.status(409).json({ error: 'Variant with this name already exists for this model' });
            return;
        }

        const variant = await Product.findOneAndUpdate(
            {name:product,'models.name':model},{
                $push:{'models.$.options':bodyParsed.data}
            },{
                new:true
            });
        if(!variant){
            res.status(404).json({error:'Product or model not found'});
            return;
        }
        res.status(201).json({message:`Variant ${variant.name} added`});
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal server error at addVariant' });
    }
};


export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = variantActionSchema.safeParse(req.query);
    try{
        if(!parsed.success){
            res.status(400).json({error:'Keep away your cheap stupid inputs from get product'});
            return;
        }
        const {model,option,variant} = parsed.data;
        
        const product = await Product.aggregate([
        { $match: { name: model } },
        { $unwind: '$models' },
        { $match: { 'models.name': option } }, 
        { $unwind: '$models.options' },
        { $match: { 'models.options.name': variant } },
        {
            $lookup: {
            from: 'reviews',
            localField: 'models.options.review',
            foreignField: '_id',
            as: 'reviewDocs'
            }
        },
        {
            $project: {
            _id: 0,
            variant: '$models.options',
            reviews: '$reviewDocs'
            }
        },
        { $limit: 1 }
        ]);

        res.status(200).json(product)
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal server error at getProduct route' });
    }
};

const variantUpdateSchema = z.object({
  price: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  description: z.string().max(500).optional()
}).strict();



export const editProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = variantActionSchema.safeParse(req.query);
    const parsedBody = variantUpdateSchema.safeParse(req.body);

    if (!parsedBody.success || !parsedQuery.success) {
      res.status(400).json({ error: 'Finish pushing some bullshit data into a product edit' });
      return;
    }

    const { model, option, variant } = parsedQuery.data;

    const updateData = Object.entries(parsedBody.data).reduce((acc, [key, val]) => {
      acc[`models.$[modelElem].options.$[optionElem].${key}`] = val;
      return acc;
    }, {} as Record<string, any>);

    const product = await Product.findOneAndUpdate(
      {
        name: model,
        'models.name': option,
        'models.options.name': variant
      },
      {
        $set: updateData
      },
      {
        arrayFilters: [
          { 'modelElem.name': option },
          { 'optionElem.name': variant }
        ],
        new: true
      }
    );

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.status(200).json({message:`Updated ${variant} successfully`});
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error at editProduct' });
  }
};

export const deleteProduct = async(req:Request,res:Response,next:NextFunction)=>{
  const parsed = variantActionSchema.safeParse(req.query);
  try {
      if(!parsed.success){
            res.status(400).json({error:'Keep away your cheap stupid inputs from get product'});
            return;
      }
      const {model,option,variant} = parsed.data;
      const product = await Product.findOneAndUpdate(
        {name:model,"models.name":option},
        {
        $pull:{
          "models.$.options":{name:variant}
        }
      },{
        new:true
      });
      if(!product){
        res.status(404).json({error:'there is no product to be deleted'});
        return;
      }
      res.status(200).json({message:`Product ${variant} deleted`});
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error at editProduct' });
  }
};