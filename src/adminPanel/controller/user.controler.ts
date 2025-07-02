import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '../../bot/logger/logger.ts';
import { User } from '../../bot/models/User.ts';
import { z } from 'zod';

const userUpdateSchema = z.object({
  telegramId: z.string()
    .regex(/^\d+$/, "Telegram ID must contain only digits")
    .min(5, "Telegram ID too short")
    .max(32, "Telegram ID too long")
    .optional(),

  username: z.string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional()
    .transform(val => val?.toLowerCase()),

  balance: z.coerce.number()
    .min(0, "Balance cannot be negative")
    .max(1_000_000, "Balance exceeds maximum limit")
    .optional()
}).strict().superRefine((data, ctx) => {
  if (!data.telegramId && !data.username && !data.balance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update"
    });
  }
});

const usernameParamSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .transform(val => val.toLowerCase()),
});

export const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paramValidation = usernameParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      res.status(400).json({ error: 'Invalid username parameter in request.' });
      return;
    }
    const { username } = paramValidation.data;

    const bodyValidation = userUpdateSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({ error: 'Invalid request body for user update.' });
      return;
    }

    const updateUser = await User.findOneAndUpdate(
      { username },
      bodyValidation.data,
      { new: true, runValidators: true, lean: true }
    );

    if (!updateUser) {
      res.status(404).json({ message: 'User not found in database.' });
      return;
    }
    res.status(200).json(updateUser);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Server error while editing user.' });
  }
};

export const delUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = usernameParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid username parameter.' });
      return;
    }
    const { username } = parsed.data;
    const user = await User.findOneAndDelete({ username });
    if (!user) {
      res.status(404).json({ message: 'User not found in database.' });
      return;
    }
    res.status(200).json({ message: `Username ${username} deleted.` });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Server error while deleting user.' });
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = usernameParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid username parameter.' });
      return;
    }
    const { username } = parsed.data;
    const filter: Record<string, any> = {};
    if (username) filter.username = username;
    const user = await User.findOne(filter)
      .populate({
        path: 'orders',
        select: '-__v',
        options: { sort: { createdAt: -1 } }
      })
      .select('-__v')
      .lean();

    if (!user) {
      res.status(404).json({ message: 'User not found in database.' });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Server error while fetching user.' });
  }
};