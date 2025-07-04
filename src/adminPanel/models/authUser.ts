import { Document,model,Schema,Types } from "mongoose";
import bcrypt from "bcryptjs";
import { logger } from "../../bot/logger/logger.ts";

interface IauthUser extends Document{
    email:string;
    password:string;
    pinCode:string;
    comparePasswords(password:string):Promise<boolean>;
    comparePin(pin:string):Promise<boolean>;
    _id: Types.ObjectId;
};

const userSchema = new Schema<IauthUser>({
    email:{type:String,unique:true,trim:true,lowercase:true,required:true},
    password:{type:String,minlength:14,required:true},
    pinCode: { type: String, required: true, select: false }
},
  { timestamps: true }
);

userSchema.pre<IauthUser>('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified('pinCode')) {
      const salt = await bcrypt.genSalt(10);
      this.pinCode = await bcrypt.hash(this.pinCode, salt);
    }

    next();
  } catch (error:unknown) {
    if(error instanceof Error){
        logger.error(error);
        next(error);
    } 
  }
});



userSchema.methods.comparePasswords = async function(password:string):Promise<boolean> {
    try {
        return await bcrypt.compare(password,this.password);
    } catch (error) {
        logger.error(error);
        return false;
    }
};

userSchema.methods.comparePin = async function (pin: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, this.pinCode);
  } catch (error) {
    logger.error(error);
    return false;
  }
};


export const authUser = model<IauthUser>('authUser',userSchema);