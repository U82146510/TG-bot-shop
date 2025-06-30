import express,{type Application} from 'express';
import { logger } from '../bot/logger/logger.ts';
import {adminRoute} from './routes/admin.route.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app:Application = express();
const port:number = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname,'../..',"public")))

app.use('/admin',adminRoute);

export const startAdminPanel = async()=>{
    try {
        app.listen(port,()=>logger.info('Server is ON'));
    } catch (error) {
        logger.error(error);
    }
};