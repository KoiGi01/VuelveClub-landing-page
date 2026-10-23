import {clean,emailPattern,escapeHtml as esc,recipients,sendMail} from '../lib/mail.js';
import {createSupportLimit} from '../lib/support-limit.js';
export function createHandler({env=process.env,send=sendMail,limit=createSupportLimit({env})}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Method not allowed'});}
    if(req.headers?.origin&&!['https://www.vuelveclub.com','https://vuelveclub.com','https://app.vuelveclub.com'].includes(req.headers.origin))return res.status(403).json({ok:false,error:'Origen inválido'});
    let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{}
    if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>16000)return res.status(400).json({ok:false,error:'Datos inválidos'});
    if(clean(body.company))return res.status(200).json({ok:true});
    const nombre=clean(body.nombre,120),email=clean(body.email,254),negocio=clean(body.negocio,160),asunto=clean(body.asunto,160),mensaje=clean(body.mensaje,5000);
    if(!nombre||!emailPattern.test(email)||!asunto||!mensaje||/[\r\n]/.test(nombre+email+negocio+asunto))return res.status(400).json({ok:false,error:'Completa los campos requeridos con un correo válido'});
    try{
      if(!await limit(req,'support'))return res.status(429).json({ok:false,error:'Espera unos minutos antes de volver a intentar'});
      const source=body.source==='chat'?'Chat de ayuda':'Formulario de soporte';
      const page=['landing','support','dashboard','login','enrollment','example'].includes(body.page)?body.page:'';
      const rows=[['Origen',source],['Página',page],['Nombre',nombre],['Correo',email],['Negocio',negocio],['Asunto',asunto]].filter(([,v])=>v);
      await send(env,{category:'support',from:`VuelveClub Soporte <${env.LEAD_FROM_EMAIL||'support@vuelveclub.com'}>`,
        to:recipients(env.SUPPORT_TO_EMAIL,'support@vuelveclub.com'),replyTo:email,subject:`Soporte VuelveClub — ${asunto}`,
        text:['Nuevo ticket de soporte de VuelveClub','',...rows.map(([k,v])=>`${k}: ${v}`),'','Consulta:',mensaje].join('\n'),
        html:`<h2>Nuevo ticket de soporte</h2><table>${rows.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table><h3>Consulta</h3><p style="white-space:pre-wrap">${esc(mensaje)}</p>`},body.requestId);
      return res.status(200).json({ok:true});
    }catch{return res.status(502).json({ok:false,error:'No pudimos confirmar el envío. Tus datos se conservan para volver a intentar.'});}
  };
}
export default createHandler();
