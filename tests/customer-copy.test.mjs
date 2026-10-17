import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import ts from 'typescript'

const source=await readFile(new URL('../lib/customer-copy.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText
const {creditActivity}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

test('credit history distinguishes a hold, spent credits and returned credits',()=>{
  assert.equal(creditActivity({operation:'RESERVE',available_delta:-60,reserved_delta:60}),'60 reserved')
  assert.equal(creditActivity({operation:'SETTLE',available_delta:0,reserved_delta:-60}),'60 spent')
  assert.equal(creditActivity({operation:'RELEASE',available_delta:60,reserved_delta:-60}),'60 returned')
  assert.equal(creditActivity({operation:'GRANT',available_delta:500,reserved_delta:0}),'+500 credits')
})
