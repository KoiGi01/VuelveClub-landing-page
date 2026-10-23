import {Resend} from 'resend';
export const emailPattern=/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clean=(value,max=1000)=>typeof value==='string'?value.trim().slice(0,max):'';
export function recipients(value,defaults){
  const result=[...new Set((value||defaults).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))];
  if(!result.length||result.length>5||result.some(x=>!emailPattern.test(x)))throw Error('MAIL_NOT_CONFIGURED');
  return result;
}
export async function sendMail(env,message,requestId){
  if(!env.RESEND_API_KEY)throw Error('MAIL_NOT_CONFIGURED');
  const resend=new Resend(env.RESEND_API_KEY);
  const options=/^[a-f0-9-]{36}$/.test(requestId||'')?{idempotencyKey:`vuelveclub-${message.category}-${requestId}`}:{ };
  const {category,...payload}=message;
  const result=await resend.emails.send(payload,options);
  if(result.error||!result.data?.id)throw Error('MAIL_UNAVAILABLE');
}
