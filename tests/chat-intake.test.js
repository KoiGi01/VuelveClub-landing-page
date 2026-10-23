import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isSalesQuestion,normalizePhone,chatVisible,assistantName} from '../chat/contact.js';
import {createSupportChat,shortReply} from '../lib/support-chat.js';
import {createHandler} from '../api/lead.js';

const res=()=>({setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}});
test('pricing and commercial questions ask for contact first, while existing customer help stays available',()=>{
  for(const text of ['¿Cuánto cuesta?','Quiero ver precios','Quiero una demo','Me interesa contratar','Send me more info'])assert.equal(isSalesQuestion(text),true,text);
  for(const text of ['No puedo entrar','Quiero cancelar mi plan','No quiero contratar','Recuperar mi tarjeta','Como cambio el color'])assert.equal(isSalesQuestion(text),false,text);
  assert.equal(assistantName,'Mía');
});
test('commercial intake precedes the AI answer, resumes after consent/decline and never forwards contact fields',async()=>{
  let calls=0,body;
  const chat=createSupportChat({env:{GEMINI_API_KEY:'test'},request:async(url,options)=>{calls++;body=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({parts:[{text:'Cuesta $349 MXN al mes por sucursal.',section:'none'}],handoff:false,intent:'sales'})}]}}]});}});
  const input={messages:[{role:'user',text:'¿Cuánto cuesta?'}],page:'landing',email:'private@example.com',name:'Private Name',phone:'+529991234567'};
  assert.equal((await chat.answer(input)).collect,'sales');assert.equal(calls,0);
  const answer=await chat.answer({...input,salesReady:true});assert.equal(calls,1);assert.equal(answer.collect,undefined);assert.match(answer.parts[0].text,/349/);
  assert.ok(!JSON.stringify(body).includes('private@example.com'));assert.ok(!JSON.stringify(body).includes('Private Name'));assert.ok(!JSON.stringify(body).includes('+529991234567'));
});
test('semantic sales intent also collects contact and concise answers retain safe section links',async()=>{
  const chat=createSupportChat({env:{GEMINI_API_KEY:'test'},request:async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({parts:[{text:'Muchos detalles',section:'none'}],handoff:false,intent:'sales'})}]}}]})});
  assert.equal((await chat.answer({messages:[{role:'user',text:'Busco fidelizar a mi comunidad'}]})).collect,'sales');
  const parts=shortReply([{text:'Abre ',section:'none'},{text:'Tu tarjeta',section:'card'},{text:' y '+('más detalles '.repeat(200)),section:'none'}]);
  assert.ok(parts.some(p=>p.section==='card'));assert.ok(parts.map(p=>p.text).join('').length<=420);assert.ok(parts.map(p=>p.text).join('').trim().split(/\s+/).length<=60);
});
test('the widget only mounts on the landing and business app, with no login/support/enrollment script',async()=>{
  for(const [hostname,pathname] of [['www.vuelveclub.com','/'],['vuelveclub.com','/'],['app.vuelveclub.com','/equipo'],['app.vuelveclub.com','/admin']])assert.equal(chatVisible({hostname,pathname}),true);
  for(const pathname of ['/iniciar-sesion','/acceso.html','/soporte','/tarjeta/123','/propuestas/ritmo','/'])assert.equal(chatVisible({hostname:'app.vuelveclub.com',pathname}),false);
  for(const file of ['acceso.html','soporte.html','tarjeta/index.html','propuestas/index.html','propuestas/plataforma.html'])assert.ok(!(await readFile(new URL('../'+file,import.meta.url),'utf8')).includes('/chat/widget.js'));
});
test('chat leads only ask for WhatsApp when chosen and send the chosen channel to both inboxes',async()=>{
  const sent=[];const handler=createHandler({env:{},limit:async()=>true,send:async(env,mail,id)=>sent.push({mail,id})});
  const input={source:'chat',nombre:'Alex',email:'alex@example.com',preferredChannel:'email',contactConsent:true,mensaje:'Quiero precios',requestId:'11111111-1111-4111-8111-111111111111'};
  let response=res();await handler({method:'POST',body:input},response);assert.equal(response.statusCode,200);assert.deepEqual(sent[0].mail.to,['luismedlozn@gmail.com','support@vuelveclub.com']);assert.match(sent[0].mail.text,/Correo electrónico/);assert.ok(!sent[0].mail.text.includes('+52'));
  response=res();await handler({method:'POST',body:input},response);assert.deepEqual(sent[1],sent[0]);
  response=res();await handler({method:'POST',body:{...input,preferredChannel:'whatsapp',whatsapp:'999 123 4567'}},response);assert.equal(response.statusCode,200);assert.match(sent[2].mail.text,/WhatsApp/);assert.match(sent[2].mail.text,/\+529991234567/);
  for(const invalid of [{contactConsent:false},{preferredChannel:'sms'},{preferredChannel:'whatsapp'},{nombre:''}]){response=res();await handler({method:'POST',body:{...input,...invalid}},response);assert.equal(response.statusCode,400);}
  assert.equal(normalizePhone('+1 (212) 555-1234'),'+12125551234');assert.equal(normalizePhone('no-phone'),null);
});
