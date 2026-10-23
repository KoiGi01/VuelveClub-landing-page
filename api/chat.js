import {createSupportChat,validateChat,ChatError,fallbackAnswer} from '../lib/support-chat.js';
import {createSupportLimit} from '../lib/support-limit.js';
export function createHandler({chat=createSupportChat(),limit=createSupportLimit()}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
    if(!['https://www.vuelveclub.com','https://vuelveclub.com','https://app.vuelveclub.com'].includes(req.headers?.origin))return res.status(403).json({error:'INVALID_ORIGIN'});
    try{
      if(Number(req.headers?.['content-length'])>20000)throw new ChatError('INVALID_REQUEST');
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(JSON.stringify(body||'').length>20000)throw new ChatError('INVALID_REQUEST');
      const input=validateChat(body);
      if(!await limit(req,'chat'))return res.status(429).json({error:'TRY_AGAIN_LATER',...fallbackAnswer()});
      return res.status(200).json(await chat.answer(input));
    }catch(error){
      if(error instanceof ChatError||error instanceof SyntaxError)return res.status(400).json({error:'INVALID_REQUEST'});
      return res.status(503).json({error:'CHAT_UNAVAILABLE',...fallbackAnswer()});
    }
  };
}
export default createHandler();
