import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Product } from '../../bot/models/Products.ts';
import {z} from 'zod';



const variantActionSchema = z.object({
  model: z.string().min(1).transform(decodeURIComponent),
  option: z.string().min(1).transform(decodeURIComponent),
  variant: z.string().min(1).transform(decodeURIComponent)
});

const variantUpdateSchema = z.object({
  price: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  description: z.string().max(500).optional()
}).strict();


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


export const addVariant = async(req:Request,res:Response,next:NextFunction)=>{
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