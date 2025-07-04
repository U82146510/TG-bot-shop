import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { Product } from '../../bot/models/Products.ts';
import { z } from 'zod';


const modelParamsSchema = z.object({
  model: z.string().min(1),
});

export const deleteModel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = modelParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ error: 'Invalid model name format.' });
      return;
    }

    const { model } = parsed.data;

    const exists = await Product.findOne({ name: model });
    if (!exists) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const product = await Product.findOneAndDelete({ name: model });
    if (!product) {
      res.status(404).json({ error: 'Failed to delete: Product not found.' });
      return;
    }

    res.status(200).json({ message: `Product '${product.name}' deleted successfully.` });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Server error while deleting product.' });
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
          price: z.coerce.number(),
          quantity: z.coerce.number(),
          description: z.string(),
        })
      ),
    })
  ),
});

export const uploadModel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(req.body);

    const parsed = uploadModelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: 'Invalid or incomplete product data.' }); // 422 Unprocessable Entity
      return;
    }

    const existingProduct = await Product.findOne({ name: parsed.data.name });
    if (existingProduct) {
      res.status(409).json({ error: 'A product with this name already exists.' }); // 409 Conflict
      return;
    }

    const product = await Product.create(parsed.data);
    res.status(201).json({ message: `Product '${product.name}' uploaded successfully.` }); // 201 Created
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Server error while uploading product.' });
  }
};


const getModelParamsSchema = z.object({
  model: z.string().min(1).optional(),
});

export const getModel = async (req: Request, res: Response, next: NextFunction) => {
  const parsed = getModelParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(422).json({ error: 'Invalid request parameters.' });
    return;
  }

  try {
    const filter: Record<string, any> = {};
    if (parsed.data.model) filter.name = parsed.data.model;

    const models = await Product.find(filter).exec();

    if (models.length === 0) {
      res.status(404).json({ message: 'No models found.' });
      return;
    }

    res.status(200).json(models);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Server error while fetching models.' });
  }
};
