import {type Request, type Response, type NextFunction} from 'express';
import { authUser } from '../models/authUser.ts';
import {z} from 'zod';

const userSchema = z.object({
    email:z.string().email(),
    password:z.string().min(14)
    .regex(/[A-Z]/)
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    pinCode:z.string().regex(/^\d{8}$/, 'Pin code must be exactly 8 digits')
});

export const signup = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
    const parsed = userSchema.safeParse(req.body);
    if(!parsed.success){
        res.status(400).json({status:'error',message:'Validation failed',errors:parsed.error.format()});
        return;
    }
    try {
        const {email,password,pinCode} = parsed.data;
        const userExists = await authUser.findOne({email:email});
        if(userExists){
            res.status(409).json({status:'error',message:'Email already in use',code:'EMAIL_EXIST'});
            return;
        }
        const user = await authUser.create({email,password,pinCode}); 

        const userResponse = {
            email:user.email,
            id:user._id,
        }
        res.status(201).json({status:'success',message:'Registration successful',data:userResponse});
    } catch (error) {
        res.status(500).json({error:'Internal server error'});
    }
};


export const updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.format()
    });
    return;
  }

  try {
    const { email, password, pinCode } = parsed.data;

    const user = await authUser.findOne({ email }).select('+pinCode');
    if (!user) {
      res.status(404).json({ message: 'This user does not exist' });
      return;
    }

    const isPinCorrect = await user.comparePin(pinCode);
    if (!isPinCorrect) {
      res.status(401).json({ message: 'Pin code is incorrect' });
      return;
    }

    user.password = password;
    await user.save();

    res.status(200).json({ message: 'Password is updated' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
