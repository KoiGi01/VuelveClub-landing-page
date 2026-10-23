import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBusinessData } from '../lib/business-data.js';
import { DatabaseError } from '../lib/database.js';
import { createHandler } from '../api/business.js';

const session = {userId:'user_owner',role:'member'};
const design = {business:'My cafe',reward:'Coffee',goal:10,color:'#CBDE2A',termsUrl:'https://example.com/t',privacyUrl:'https://example.com/p',termsVersion:'v1'};
test('business data verifies current access before every read/write and scopes provider records to the verified business', async () => {
  const calls=[];
  const management={businessAccess:async(s,id,write)=>{calls.push(['access',s.userId,id,write]);if(id==='org_other'||write&&s.userId==='user_staff')throw new DatabaseError('FORBIDDEN',403);return{business:{id:'org_one',name:'One'},businesses:[],canManage:s.userId!=='user_staff'};}};
  const database={syncBusiness:async b=>{calls.push(['sync',b.id]);return{enrollment_slug:'public-slug'};},customers:async id=>{calls.push(['customers',id]);return{customers:[],customerCount:0};},designs:async()=>[],rpc:async(name,body)=>{calls.push([name,body]);return{};}};
  const service=createBusinessData({management,database});
  await assert.rejects(service.read(session,'org_other'),e=>e.code==='FORBIDDEN');assert.equal(calls.length,1);
  await service.read(session,'org_one',{view:'customers'});assert.deepEqual(calls.slice(-3),[['access','user_owner','org_one',undefined],['sync','org_one'],['customers','org_one']]);
  await assert.rejects(service.write({userId:'user_staff'},{action:'save',organizationId:'org_one',design}),e=>e.code==='FORBIDDEN');
  await service.write(session,{action:'save',organizationId:'org_one',design});
  assert.equal(calls.at(-1)[0],'vc_save_design');assert.equal(calls.at(-1)[1].p_business,'org_one');assert.equal(calls.at(-1)[1].p_user,'user_owner');
  await assert.rejects(service.write(session,{action:'save',organizationId:'org_one',design:{...design,termsUrl:'javascript:alert(1)'}}),e=>e.code==='INVALID_REQUEST');
});
test('saving an existing business logo does not trust an arbitrary browser URL',async()=>{
  let saved;
  const service=createBusinessData({management:{businessAccess:async()=>({business:{id:'org_one',name:'One'},canManage:true})},database:{syncBusiness:async()=>{},designs:async()=>[{status:'active',logo_url:'stored-approved-logo'}],rpc:async(n,b)=>{saved=b;}}});
  await service.write(session,{action:'save',organizationId:'org_one',design:{...design,keepLogo:true,logoUrl:'https://evil.example/logo'}});
  assert.equal(saved.p_design.logoUrl,'stored-approved-logo');
});
test('card recovery requires current management access and reads only the requested business membership card',async()=>{
  let allowed=false,calls=0;
  const member={businessId:'org_one',cardId:'card',name:'Alex',design:{}};
  const service=createBusinessData({management:{businessAccess:async()=>({business:{id:'org_one'},canManage:allowed})},database:{member:async(org,id)=>{assert.equal(org,'org_one');assert.equal(id,'customer');calls++;return member;}},wallet:{issueMember:async value=>{assert.equal(value,member);return{saveUrl:'private-wallet-link'};}}});
  await assert.rejects(service.write(session,{action:'recover',organizationId:'org_one',customerId:'customer'}),e=>e.code==='FORBIDDEN');assert.equal(calls,0);
  allowed=true;assert.deepEqual(await service.write(session,{action:'recover',organizationId:'org_one',customerId:'customer'}),{saveUrl:'private-wallet-link'});
});
const res = () => ({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
test('business HTTP endpoint rejects unauthenticated/cross-origin writes and sanitizes provider failures',async()=>{
  const service={read:async()=>{throw new DatabaseError('DATABASE_UNAVAILABLE');}};
  let response=res();await createHandler({service,verify:async()=>{throw Error();}})({method:'GET',headers:{},query:{}},response);assert.equal(response.statusCode,401);
  response=res();await createHandler({service,verify:async()=>session})({method:'POST',headers:{origin:'https://evil.example'},body:{}},response);assert.equal(response.statusCode,403);
  response=res();await createHandler({service,verify:async()=>session})({method:'GET',headers:{},query:{}},response);assert.deepEqual(response.body,{error:'DATABASE_UNAVAILABLE'});assert.equal(response.headers['Cache-Control'],'no-store');
});
