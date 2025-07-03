import {type Request,type Response,type NextFunction} from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Product } from '../../bot/models/Products.ts';
import {z} from 'zod';



const variantActionSchema = z.object({
  model: z.string().min(1).transform((val) => val.toLowerCase()),
  option: z.string().min(1).transform((val) => val.toLowerCase()),
  variant: z.string().min(1).transform((val) => val.toLowerCase())
});


const addVariantSchema = z.object({
  model: z.string().min(1).transform((str) => str.toLowerCase()),
  product: z.string().min(1).transform((str) => str.toLowerCase()),
  variant: z.object({
    name: z.string().min(1).transform((str) => str.toLowerCase()),
    price: z.coerce.number().gt(0),
    quantity: z.coerce.number(),
    description: z.string()
  })
});


export const editProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
  
    const parsedBody = addVariantSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: 'Finish pushing some bullshit data into a product edit' });
      return;
    }

    const updateData = Object.entries(parsedBody.data.variant).reduce((acc, [key, val]) => {
      acc[`models.$[modelElem].options.$[optionElem].${key}`] = val;
      return acc;
    }, {} as Record<string, any>);

    const editProduct = await Product.findOneAndUpdate(
      {
        name: parsedBody.data.model,
        'models.name': parsedBody.data.product,
        'models.options.name': parsedBody.data.variant.name
      },
      {
        $set: updateData
      },
      {
        arrayFilters: [
          { 'modelElem.name': parsedBody.data.product },
          { 'optionElem.name':parsedBody.data.variant.name }
        ],
        new: true
      }
    );

    if (!editProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.status(200).json({message:`Updated ${parsedBody.data.variant.name} successfully`});
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error at editProduct' });
  }
};

export const addProduct = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const bodyParsed = addVariantSchema.safeParse(req.body);
        if(!bodyParsed.success){
            res.status(400).json({error:'invalid input at adding Variants'});
            return;
        }
        const {product,model} = bodyParsed.data;

           const existingVariant = await Product.findOne({
            name: product,
            'models.name': model,
            'models.options.name': bodyParsed.data.variant.name
        });

        if (existingVariant) {
            res.status(409).json({ error: 'Variant with this name already exists for this model' });
            return;
        }
        console.log(bodyParsed.data)
        const variant = await Product.findOneAndUpdate(
            {name:model,'models.name':product},{
                $push:{'models.$.options':bodyParsed.data.variant}
            },{
              new:true
        });

        if(!variant){
            res.status(404).json({error:'Product or model not found'});
            return;
        }
        res.status(201).json({ message: `Variant added`, variant: bodyParsed.data.variant });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal server error at addVariant' });
    }
};


export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = variantActionSchema.safeParse(req.query);
    console.log(parsed.data)
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






export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const parsed = variantActionSchema.safeParse(req.body);
  try {
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input at deleteProduct' });
      return;
    }

    const { model, option, variant } = parsed.data;
    const product = await Product.findOne({ name: model });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const targetModel = product.models.find((m) => m.name === option);
    if (!targetModel) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    const initialLen = targetModel.options.length;
    targetModel.options = targetModel.options.filter((opt) => opt.name !== variant);

    if (targetModel.options.length === initialLen) {
      res.status(404).json({ error: 'Variant not found' });
      return;
    }

    await product.save();
    res.status(200).json({ message: `Variant ${variant} deleted` });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error at deleteProduct' });
  }
};
