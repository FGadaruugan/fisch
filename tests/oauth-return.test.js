import test from 'node:test';
import assert from 'node:assert/strict';
let sessionForOAuthReturn;
try{({sessionForOAuthReturn}=await import('../js/account-return.js'));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const previous={access_token:'account-a-access',refresh_token:'account-a-refresh'};
test('cancelled Google login never falls back to the previous stored account',()=>{
  assert.equal(typeof sessionForOAuthReturn,'function');
  assert.throws(()=>sessionForOAuthReturn('#error=access_denied&error_description=Cancelled',previous),e=>e.code==='AUTH_FAILED');
});
test('a current OAuth return must match the verified session instead of accepting stale storage',()=>{
  assert.equal(typeof sessionForOAuthReturn,'function');
  assert.equal(sessionForOAuthReturn('',previous),null);
  const hash='#access_token=account-b-access&refresh_token=account-b-refresh&token_type=bearer';
  assert.throws(()=>sessionForOAuthReturn(hash,previous),e=>e.code==='AUTH_FAILED');
  const current={access_token:'account-b-access',refresh_token:'account-b-refresh'};assert.deepEqual(sessionForOAuthReturn(hash,current),current);
});
