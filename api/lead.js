import {clean,emailPattern,escapeHtml as esc,recipients,sendMail} from '../lib/mail.js';
import {createSupportLimit} from '../lib/support-limit.js';
import {normalizePhone,assistantName} from '../chat/contact.js';
export function createHandler({env=process.env,send=sendMail,limit=createSupportLimit({env})}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Method not allowed'});}
    if(req.headers?.origin&&!['https://www.vuelveclub.com','https://vuelveclub.com','https://app.vuelveclub.com'].includes(req.headers.origin))return res.status(403).json({ok:false,error:'Origen inválido'});
    let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{}
    if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>12000)return res.status(400).json({ok:false,error:'Datos inválidos'});
    if(clean(body.company))return res.status(200).json({ok:true});
    const source=clean(body.source,10),email=clean(body.email,254),nombre=clean(body.nombre,120),negocio=clean(body.negocio,160),tipo=clean(body.tipo,100);
    let whatsapp=clean(body.whatsapp,40);
    if(!['hero','demo','chat'].includes(source)||!emailPattern.test(email)||/[\r\n]/.test(email+nombre+negocio))return res.status(400).json({ok:false,error:'Revisa los datos del formulario'});
    if(source==='chat'){
      if(!nombre||body.contactConsent!==true||!['email','whatsapp'].includes(body.preferredChannel))return res.status(400).json({ok:false,error:'Confirma tu nombre, correo y cómo prefieres recibir información'});
      whatsapp=body.preferredChannel==='whatsapp'?normalizePhone(whatsapp):'';
      if(body.preferredChannel==='whatsapp'&&!whatsapp)return res.status(400).json({ok:false,error:'Revisa tu número de WhatsApp'});
    }
    try{
      if(!await limit(req,'lead'))return res.status(429).json({ok:false,error:'Espera unos minutos antes de volver a intentar'});
      const rows=[['Origen',source==='chat'?'Chat de '+assistantName:source==='hero'?'Formulario hero':'Formulario demo'],['Correo',email],['Nombre',nombre],['Negocio',negocio],['WhatsApp',whatsapp],['Tipo de negocio',tipo],
        ...(source==='chat'?[['Canal elegido',body.preferredChannel==='whatsapp'?'WhatsApp':'Correo electrónico'],['Solicitud de seguimiento','Aceptada al elegir el canal'],['Consulta',clean(body.mensaje,5000)]]:[])].filter(([,v])=>v);
      await send(env,{category:'lead',from:`VuelveClub <${env.LEAD_FROM_EMAIL||'support@vuelveclub.com'}>`,
        to:recipients(env.LEAD_TO_EMAIL,'luismedlozn@gmail.com,support@vuelveclub.com'),replyTo:email,
        subject:`Nuevo lead VuelveClub${negocio?' — '+negocio:''} (${source})`,text:rows.map(([k,v])=>`${k}: ${v}`).join('\n'),
        html:`<h2>Nuevo lead VuelveClub</h2><table>${rows.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`},body.requestId);
      return res.status(200).json({ok:true});
    }catch{return res.status(502).json({ok:false,error:'No pudimos confirmar el envío. Intenta de nuevo.'});}
  };
}
export default createHandler();
