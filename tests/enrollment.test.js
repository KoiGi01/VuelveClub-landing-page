import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnrollment, validateRegistration } from '../lib/enrollment.js';
import { createHandler } from '../api/enrollment.js';
import { WalletError } from '../lib/google-wallet.js';

const input={slug:'11111111-1111-4111-8111-111111111111',designId:'22222222-2222-4222-8222-222222222222',token:'a'.repeat(64),name:'  Alex Demo ',email:'ALEX@EXAMPLE.COM',phone:'999 123 4567',termsAccepted:true,termsVersion:'v1'};
test('public registration validates consent, identity, phone and capability before any database call',()=>{
  assert.deepEqual(validateRegistration(input),{name:'Alex Demo',email:'alex@example.com',phone:'+529991234567'});
  for(const bad of [{termsAccepted:false},{token:'guess'},{email:'bad'},{phone:'bad'},{name:'<script>'},{website:'spam'},{slug:'org_one'}])assert.throws(()=>validateRegistration({...input,...bad}),e=>e.code==='INVALID_REQUEST');
});
test('registration hashes capability, payload and IP; commits first and retries Wallet with the same card',async()=>{
  const calls=[];let issue=0;
  const member={cardId:'private-card-id',name:'Alex',design:{}};
  const service=createEnrollment({env:{SUPABASE_SECRET_KEY:'test-server-only'},database:{rpc:async(n,b)=>{calls.push([n,b]);return n==='vc_enrollment_rate'?true:member;}},wallet:{issueMember:async m=>{assert.equal(m,member);if(++issue===1)throw new WalletError('GOOGLE_UNAVAILABLE');return{saveUrl:'wallet-link'};}}});
  await assert.rejects(service.register(input,'127.0.0.1'),WalletError);
  assert.deepEqual(await service.register(input,'127.0.0.1'),{saveUrl:'wallet-link'});
  assert.deepEqual(calls[1],calls[3]);assert.notEqual(calls[1][1].p_token,input.token);
  assert.match(calls[0][1].p_bucket,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(calls).includes('127.0.0.1'));
});
test('public endpoint limits origins, sanitizes Wallet failures and never returns enrollment internals',async()=>{
  const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}});
  let calls=0;const service={register:async()=>{calls++;throw new WalletError('GOOGLE_CREATE_FAILED');},profile:async()=>({name:'Cafe'})};const handler=createHandler({service});
  let res=response();await handler({method:'POST',headers:{origin:'https://evil.example'},body:input},res);assert.equal(res.statusCode,403);assert.equal(calls,0);
  res=response();await handler({method:'POST',headers:{origin:'https://app.vuelveclub.com','x-vercel-forwarded-for':'127.0.0.1'},body:input},res);assert.equal(res.statusCode,503);assert.deepEqual(res.body,{error:'WALLET_PENDING'});
  res=response();await handler({method:'GET',headers:{},query:{slug:input.slug}},res);assert.deepEqual(res.body,{name:'Cafe'});assert.equal(res.headers['Cache-Control'],'no-store');
});
