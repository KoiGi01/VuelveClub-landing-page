import {sectionLabels} from '../chat/links.js';
import {supportKnowledge} from './support-knowledge.js';
export class ChatError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
export function validateChat(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||!Array.isArray(input.messages)||input.messages.length<1||input.messages.length>12||input.company)throw new ChatError('INVALID_REQUEST');
  let total=0;
  const messages=input.messages.map((m,i)=>{
    if(!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim()||m.text.length>1800||(i===0&&m.role!=='user')||(i&&input.messages[i-1].role===m.role))throw new ChatError('INVALID_REQUEST');
    total+=m.text.length;return{role:m.role,text:m.text.trim()};
  });
  if(total>8000||messages.at(-1).role!=='user')throw new ChatError('INVALID_REQUEST');
  return{messages,page:['landing','support','dashboard','login','enrollment','example'].includes(input.page)?input.page:'landing'};
}
const sections=['none',...Object.keys(sectionLabels)];
const schema={type:'object',properties:{parts:{type:'array',items:{type:'object',properties:{text:{type:'string'},section:{type:'string',enum:sections}},required:['text','section']},minItems:1,maxItems:12},handoff:{type:'boolean'}},required:['parts','handoff']};
export const fallbackAnswer=()=>({parts:[{text:'No pude resolver tu consulta en este momento. Puedo pasársela al equipo para que te responda por correo.',section:'none'}],handoff:true,available:false});
export function createSupportChat({env=process.env,request=fetch}={}){
  return{async answer(input){
    const {messages,page}=validateChat(input);
    if(!env.GEMINI_API_KEY)return fallbackAnswer();
    const model=env.GEMINI_CHAT_MODEL||'gemini-3.5-flash-lite';
    if(model.length>100||!/^gemini-[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(model))return fallbackAnswer();
    try{
      const response=await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
        method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({systemInstruction:{parts:[{text:supportKnowledge+`\nPágina actual (contexto público): ${page}.`}]},
          contents:messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.text}]})),
          generationConfig:{temperature:.2,maxOutputTokens:1000,responseMimeType:'application/json',responseJsonSchema:schema}}),
        signal:AbortSignal.timeout(18000),redirect:'error'});
      if(!response.ok)return fallbackAnswer();
      const body=await response.json();
      const text=body.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('');
      const result=JSON.parse(text||'');
      if(typeof result.handoff!=='boolean'||!Array.isArray(result.parts)||!result.parts.length||result.parts.length>12)throw Error();
      let length=0;
      const parts=result.parts.map(part=>{
        if(!part||!sections.includes(part.section)||typeof part.text!=='string'||part.text.length>1800||/https?:\/\/|<\/?[a-z][^>]*>/i.test(part.text))throw Error();
        const text=part.section==='none'?part.text:sectionLabels[part.section];length+=text.length;
        return{text,section:part.section};
      });
      if(length>1800||!parts.some(p=>p.text.trim()))throw Error();
      const wantsHuman=/\b(humano|persona real|hablar con (alguien|soporte)|human|real person|email support)\b/i.test(messages.at(-1).text);
      return{parts,handoff:result.handoff||wantsHuman,available:true};
    }catch{return fallbackAnswer();}
  }};
}
