import {Bot,InlineKeyboard,Context} from 'grammy';
import { logger } from '../logger/logger.ts';
import { Product } from '../models/Products.ts';
import { Review } from '../models/Rewievs.ts';
import {redis} from '../utils/redis.ts';
import {deleteCachedMessages} from '../utils/cleanup.ts';
import { UserFlowState } from '../models/UserFlowState.ts';
import {z} from 'zod';
import mongoose from 'mongoose';



export function registerReviewHandler(bot:Bot){
    bot.callbackQuery('review',async(ctx:Context)=>{
        await ctx.answerCallbackQuery();
        const userId = ctx.from?.id;
        if(!userId) return;

        try {
              await ctx.deleteMessage(); // delete triggering button msg (if any)
        } catch (e) {
              logger.debug(`No message to delete when entering orders view for user ${userId}`);
        }

        try {
            const product = (await Product.find().select('models'));
            const models = product.flatMap(arg=>arg.models);
            const variants = models.flatMap(arg=>arg.options);
            if(!product){
                logger.error('Products does not exist');
                return
            }
            if(!models){
                logger.error('models does not exist');
                return
            }
            if(!variants){
                logger.error('variants does not exist');
                return
            }
            const keyboard = new InlineKeyboard();
            for(const arg of variants){
                keyboard.text(`${arg.name}`,`comments_${arg._id}`).row()

            }
            keyboard.text("🔙 Back", "back_to_home");
            const redisKey = `review_menu_${userId}`;
            const msg = await ctx.reply('Rewiev menu:',{reply_markup:keyboard});
            redis.pushList(redisKey,[String(msg.message_id)]);
        } catch (error) {
            logger.error('this is an error that happend at itemReview handler',error);
        }
    });


    bot.callbackQuery(/^comments_([a-f0-9]{24})$/,async(ctx:Context)=>{
        const userId = ctx.from?.id;
        if(!userId) return;
        await deleteCachedMessages(ctx,`review_menu_${userId}`);
        try {
            const [_,id] = ctx.match ?? [];
            const objectId = new mongoose.Types.ObjectId(id);


            const product = await Product.find();
            const model = product.flatMap(arg=>arg.models)
            const variants = model.flatMap(arg=>arg.options);
            const variant = variants.find(arg=>objectId.equals(arg._id));
            if(!variant){
                logger.error('variant is not found')
            }
            const keyboard = new InlineKeyboard()
            const reviews = await Review.find({_id:{$in:variant?.review}});

            for(const arg of reviews){
                ctx.reply(`${arg.comment}`)
            }

            // aici trebu de sters the flowstate in caz ca el apasa back
            await UserFlowState.findOneAndUpdate({userId:String(userId)},{
                $set:{
                    flow:'await_comment',
                    data:id
                }
            },{ upsert: true})

            keyboard.text("🔙 Back", "review").row();

            const redisKey =`comment_${userId}`;
            const msg = await ctx.reply('Enter your comment:',{reply_markup:keyboard});
            redis.pushList(redisKey,[String(msg.message_id)]);
        } catch (error) {
            logger.error('there is an error at the interReview comment handler');
        }
       
    });

    
    bot.on('message:text',async(ctx:Context,next)=>{
        const userId = ctx.from?.id;
        if(!userId) return;

        const inputSchema = z.string().max(500).transform(val => val.trim().toLowerCase());

        await deleteCachedMessages(ctx,`comment_${userId}`);
        try {
            const flowState = await UserFlowState.findOne({ userId: String(userId) });
            if (!flowState || flowState.flow !== 'await_comment') return next();
            const input = ctx.message?.text;
            const parsed = inputSchema.safeParse(input);
            if(!parsed.success){
                logger.error('there is an error at the comment input');
                return;
            }
            const comment = await Review.create({
                comment:parsed.data
            });
            const variantId = new mongoose.Types.ObjectId(flowState.data);
            await Product.findOneAndUpdate({
                'models.options._id':variantId // do not forget to replace it
            },{
                $push:{
                    'models.$[].options.$[opt].review': comment.id
                }
            },{
                arrayFilters: [
                    { 'opt._id': variantId } // do not forget to replace it
                ]
            })
            await UserFlowState.deleteOne({ userId: String(userId) });
            await ctx.reply('comment added');
        } catch (error) {
            logger.error(error)
        }
    });
}