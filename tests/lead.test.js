import{test}from'node:test';
import assert from'node:assert/strict';
import{createHandler as leadHandler}from'../api/lead.js';
import{createHandler as supportHandler}from'../api/support.js';
import{sendMail}from'../lib/mail.js';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
const body={source:'demo',nombre:'Ana',email:'ana@example.com',negocio:'Cafe',requestId:'11111111-1111-4111-8111-111111111111'};
test('landing forms notify both owner and support while support/chat sends only to support',async()=>{
  const sent=[];const send=async(env,mail,id)=>sent.push({mail,id});
  let res=response();await leadHandler({env:{},send,limit:async()=>true})({method:'POST',body},res);assert.equal(res.statusCode,200);assert.deepEqual(sent[0].mail.to,['luismedlozn@gmail.com','support@vuelveclub.com']);assert.equal(sent[0].mail.replyTo,body.email);
  res=response();await supportHandler({env:{},send,limit:async()=>true})({method:'POST',body:{...body,source:'chat',asunto:'Chat',mensaje:'Question <script> & answer'}},res);assert.equal(res.statusCode,200);assert.deepEqual(sent[1].mail.to,['support@vuelveclub.com']);assert.match(sent[1].mail.text,/Chat de ayuda/);assert.ok(sent[1].mail.html.includes('&lt;script&gt;'));
});
test('mail delivery handles provider failure, bad recipients, malformed requests and quotas without claiming success',async()=>{
  let count=0;
  const send=async()=>{count++;throw Error('provider private diagnostic');};
  const handler=leadHandler({env:{},send,limit:async()=>true});
  for(const invalid of [undefined,[],{},'{',{...body,email:'bad'},{...body,negocio:'header\r\ninjection'}]){let res=response();await handler({method:'POST',body:invalid},res);assert.equal(res.statusCode,400);}
  let res=response();await handler({method:'POST',body},res);assert.equal(res.statusCode,502);assert.equal(res.body.ok,false);assert.ok(!JSON.stringify(res.body).includes('diagnostic'));
  res=response();await leadHandler({env:{},send,limit:async()=>false})({method:'POST',body},res);assert.equal(res.statusCode,429);assert.equal(count,1);
  res=response();await handler({method:'POST',body:{...body,company:'bot'}},res);assert.equal(res.body.ok,true);assert.equal(count,1);
});
test('mail retries supply Resend with a stable idempotency key and comma-separated recipients are normalized',async(t)=>{
  let sent,header;
  t.mock.method(globalThis,'fetch',async(url,opts)=>{sent=JSON.parse(opts.body);header=new Headers(opts.headers).get('Idempotency-Key');return Response.json({id:'mock-only'});});
  const handler=leadHandler({env:{RESEND_API_KEY:'re_test',LEAD_TO_EMAIL:'luismedlozn@gmail.com, support@vuelveclub.com,luismedlozn@gmail.com'},send:sendMail,limit:async()=>true});
  const res=response();await handler({method:'POST',body},res);assert.equal(res.statusCode,200);assert.equal(header,'vuelveclub-lead-'+body.requestId);assert.deepEqual(sent.to,['luismedlozn@gmail.com','support@vuelveclub.com']);
});
