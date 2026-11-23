// 旬レーダーのフィードバックの受け口（Google Apps Script）。
// ページのボタンから届いた 1 件を、Google ドライブの feedback.jsonl に 1 行で書き足す。
// KEY は合言葉。このひな形には書かない（合言葉入りの写しは private/ にある）。
const KEY = 'REPLACE_WITH_KEY';
const FOLDERS = ['Claude成果物', 'weekend-planner', 'feedback'];
const NAME = 'feedback.jsonl';
const RATES = ['like', 'meh'];
const REASONS = ['遠い', '興味がない', 'もう知っている', '高い'];

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out('bad'); }
  if (d.key !== KEY) return out('no');
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    who: String(d.who || '').slice(0, 20),
    id: String(d.id || '').slice(0, 100),
    title: String(d.title || '').slice(0, 120),
    rate: RATES.indexOf(d.rate) >= 0 ? d.rate : null,
    reason: REASONS.indexOf(d.reason) >= 0 ? d.reason : null,
    went: d.went === true,
  }) + '\n';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const f = file();
    f.setContent(f.getBlob().getDataAsString('UTF-8') + line);
  } finally { lock.releaseLock(); }
  return out('ok');
}

// 動作確認用: <宛先>?key=<合言葉> を開くと、これまでに届いた件数を返す
function doGet(e) {
  if (!e.parameter || e.parameter.key !== KEY) return out('no');
  const n = file().getBlob().getDataAsString('UTF-8').split('\n').filter(String).length;
  return out('ok ' + n);
}

function file() {
  let dir = DriveApp.getRootFolder();
  FOLDERS.forEach(function (name) {
    const it = dir.getFoldersByName(name);
    dir = it.hasNext() ? it.next() : dir.createFolder(name);
  });
  const it = dir.getFilesByName(NAME);
  return it.hasNext() ? it.next() : dir.createFile(NAME, '', 'text/plain');
}

function out(s) { return ContentService.createTextOutput(s); }
