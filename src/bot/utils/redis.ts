import { createClient,type RedisClientType } from "redis";

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
            }
        });
    }
}
