import express,{type Application} from 'express';
import { logger } from '../bot/logger/logger.ts';
import {adminRoute} from './routes/admin.route.ts';
import {loginRoute} from './routes/login.route.ts';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {protectRoute} from './middleware/protectRoute.ts';
import {signupRoute} from './routes/signup_route.ts';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app:Application = express();
const port:number = 3000;

app.use(helmet({
    hsts:false
}));
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

dotenv.config({path:path.resolve('../../.env')});

const connect_db = process.env.atlas;

if(!connect_db){
    throw new Error('missing atlas connection in the app.ts');
}
const secretKey = process.env.secret;
if(!secretKey){
    throw new Error('missing session key in app.ts');
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, try again later.'
});

app.use(limiter);


app.use(session({
    name:'admin.sid',
    secret:secretKey,
    resave:false,
    saveUninitialized:false,
    store:MongoStore.create({
        mongoUrl:connect_db,
        ttl: 60 * 60
    }),
    cookie:{
        httpOnly:true,
        secure:true,
        sameSite:'strict',
        maxAge:1000*60*60
    }
}));


app.use('/admin', protectRoute, express.static(path.join(__dirname, '../..', 'public/admin')));
app.use(express.static(path.join(__dirname,'../..',"public")))

app.use('/admin',adminRoute);
app.use('/admin',signupRoute);
app.use('/',loginRoute);

export const startAdminPanel = async()=>{
    try {
        app.listen(port,()=>logger.info('Server is ON'));
    } catch (error) {
        logger.error(error);
    }
};