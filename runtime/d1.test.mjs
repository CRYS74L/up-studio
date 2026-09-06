import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1 } from './d1.mjs';
test('D1 supports bindings and first/all/run; failed batches roll back all writes',async()=>{
 const db=createD1(':memory:');
 try {
  await db.exec('CREATE TABLE sample(id INTEGER PRIMARY KEY,value TEXT)');
  const result=await db.prepare('INSERT INTO sample VALUES(?,?)').bind(1,'original').run();
  assert.equal(result.meta.changes,1);
  await assert.rejects(db.batch([db.prepare('INSERT INTO sample VALUES(2,\'temporary\')'),db.prepare('INSERT INTO sample VALUES(1,\'duplicate\')')]));
  assert.equal(await db.prepare('SELECT count(*) AS n FROM sample').first('n'),1);
  assert.deepEqual((await db.prepare('SELECT value FROM sample').all()).results.map(x=>x.value),['original']);
 }finally{db.database.close();}
});
