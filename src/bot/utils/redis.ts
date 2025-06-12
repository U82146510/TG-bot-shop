import { createClient,type RedisClientType } from "redis";
import {logger} from '../logger/logger.ts'

type RedisConfig = {
    host:string;
    port:number;
    password?:string;
    maxRetries?:number;
    retryDelays:number;
};

export class RedisClient {
    private client:RedisClientType;
    private config:RedisConfig;

    constructor(config:Partial<RedisConfig>={}){
        this.config = {
            host:'localhost',
            port:6379,
            maxRetries:5,
            retryDelays:5000,
            ...config
        };
        this.client = createClient({
            socket:{
                host:this.config.host,
                port:this.config.port,
                reconnectStrategy:(retries)=>{
                    if(retries>=5){
                        return new Error('Max retries reached')
                    }
                    return this.config.retryDelays
                }
            },
            password:this.config.password
        });
        this.setupEventListener();
    }
    private setupEventListener():void{
        this.client.on('connect',()=>{
            logger.info('Redis connecting...');
        });
        this.client.on('ready',()=>{
            logger.info('Redis connected and ready');
        });
        this.client.on('error',(error:Error)=>{
            logger.error('Redis error',error)
        });
        this.client.on('end',()=>{
            logger.info('Redis disconnected');
        });
        this.client.on('reconnecting',()=>{
            logger.info('Redis reconnecting...');
        });
    }
    public async connect():Promise<void>{
        try {
            await this.client.connect();
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Redis connection failed', { message: error.message, stack: error.stack });
            } else {
                logger.error('Redis connection failed with unknown error:', error);
            }
            throw error;
        }
    }
    public async disconnect():Promise<void>{
        try {
            await this.client.quit();
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Redis disconnection failed', { message: error.message, stack: error.stack });
            } else {
                logger.error('Redis disconnection failed with unknown error:', error);
            }
            throw error;
        }
    }
    public async set(key:string,value:string, options?:{ttl?:number}):Promise<void>{
        if(options?.ttl){
            await this.client.setEx(key,options.ttl,value);
        }else{
            await this.client.set(key,value);
        }
    }
    public async get(key:string):Promise<string|null>{
        return await this.client.get(key);
    }
    public async delete(key:string):Promise<boolean>{
        const result = await this.client.del(key);
        return result > 0;
    }
    public async exists(key:string):Promise<boolean>{
        const result = await this.client.exists(key);
        return result === 1;
    }
}
