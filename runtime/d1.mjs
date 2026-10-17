import { DatabaseSync } from 'node:sqlite';
export function createD1(path) {
  const database = new DatabaseSync(path);
  try{database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');}catch(error){database.close();throw error;}
  const prepare = (sql, args = []) => ({
    bind(...values) { return prepare(sql, values); },
    first(column) { const row = database.prepare(sql).get(...args) ?? null; return Promise.resolve(column ? row?.[column] ?? null : row); },
    all() { return Promise.resolve(this.execute()); },
    run() { return Promise.resolve(this.execute()); },
    execute() {
      const statement = database.prepare(sql);
      if (statement.columns().length) return { success: true, results: statement.all(...args), meta: { changes: 0 } };
      const result = statement.run(...args);
      return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    },
  });
  return { database, prepare, exec(sql) { database.exec(sql); return Promise.resolve({count: 1, duration: 0}); },
    async batch(statements) {
      database.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(statement => statement.execute()); database.exec('COMMIT'); return results; }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
}

const transientSqliteCodes = new Set(['SQLITE_BUSY','SQLITE_LOCKED','EBUSY']);

function isTransientDatabaseLock(error) {
  if(transientSqliteCodes.has(String(error?.code??'').toUpperCase()))return true;
  const sqliteCode=Number(error?.errcode);
  if(Number.isInteger(sqliteCode)&&[5,6].includes(Math.abs(sqliteCode)&0xff))return true;
  return /\b(?:database|table) is (?:busy|locked)\b/i.test([error?.errstr,error?.message].filter(Boolean).join(' '));
}

export function serializeStartupError(error) {
  const fields=['name','message','code','errno','syscall','address','port','errcode','errstr'];
  const result={};
  for(const field of fields){
    const value=error?.[field];
    if(value!==undefined&&value!==null&&['string','number','boolean'].includes(typeof value))result[field]=value;
  }
  if(!('message' in result))result.message=String(error);
  return result;
}

export async function retryTransientDatabaseStartup(operation,{maxAttempts=3,delaysMs=[250,1000],sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onRetry=()=>{}}={}) {
  if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1)throw new RangeError('maxAttempts must be a positive integer');
  for(let attempt=1;;attempt++){
    try{return{value:await operation(),attempts:attempt};}
    catch(error){
      if(!isTransientDatabaseLock(error)||attempt>=maxAttempts)throw error;
      const delayMs=Math.max(0,Number(delaysMs[Math.min(attempt-1,delaysMs.length-1)]??0)||0);
      onRetry({error,attempt,delayMs});
      if(delayMs>0)await sleep(delayMs);
    }
  }
}
