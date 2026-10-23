import { createHmac } from 'node:crypto';
import { createDatabase } from './database.js';
export function requestIp(req) {
  const forwarded=req.headers?.['x-vercel-forwarded-for']||req.headers?.['x-forwarded-for'];
  return typeof forwarded==='string'?forwarded.split(',')[0].trim():req.socket?.remoteAddress;
}
export function createSupportLimit({env=process.env,database=createDatabase({env})}={}){
  return async(req,kind)=>{
    if(!env.SUPABASE_SECRET_KEY||!env.SUPABASE_URL)return env.VERCEL_ENV!=='production';
    const ip=requestIp(req);if(!ip)return false;
    const hash=value=>createHmac('sha256',env.SUPABASE_SECRET_KEY).update(value).digest('hex');
    const scope=kind==='chat'?'chat_ip':'mail_ip';
    const allowed=await database.rpc('vc_support_limit',{p_scope:scope,p_bucket:hash(`${kind}:${ip}`)});
    if(!allowed||kind!=='chat')return allowed;
    return database.rpc('vc_support_limit',{p_scope:'chat_global',p_bucket:hash('vuelveclub:chat:global')});
  };
}
