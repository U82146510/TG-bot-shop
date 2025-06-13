import { IPayment, Payment } from "../models/Payment.ts";
import { logger } from "../logger/logger.ts";

export function startXmrPaymentWatcher():void{
    setInterval(async() => {
        const pendingPayments:IPayment[]= await Payment.find({status:'pending'});
        const expiryThreshhold:Date = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
        for(const payment of pendingPayments){
            try {
                const response = await fetch("http://localhost:18082/json_rpc",{
                    method:"POST",
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({
                        jsonrpc: "2.0",
                        id: "0",
                        method: "get_payments",
                        params: { payment_id: payment.paymentId },
                    }),
                })
                const data:any = response.json();
                const received = data.result?.payments?.length > 0;
                if(received){
                    payment.status = 'confirmed';
                    payment.confirmedAt = new Date();
                    await payment.save();
                    logger.info(`✅ Payment confirmed for ${payment.userId}`);
                }
            } catch (error) {
                logger.error("❌ Error checking XMR payment", error)
            }
            await Payment.updateMany({
                status:'pending', createdAt:{$lt:expiryThreshhold}},
            {status:'expired'})
        }
    }, 60_000);
}