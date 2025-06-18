import { Context } from "grammy";
import { logger } from "../logger/logger.ts";
import { redis } from "./redis.ts";

export async function deleteCachedMessages(ctx: Context, redisKey: string) {
  try {
    const messageIds = await redis.getList(redisKey);
    for (const id of messageIds) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, Number(id));
      } catch (e) {
        logger.debug(`Failed to delete message ${id} from ${redisKey}`);
      }
    }
    await redis.delete(redisKey);
  } catch (e) {
    logger.warn(`Failed to clean messages for ${redisKey}`);
  }
}