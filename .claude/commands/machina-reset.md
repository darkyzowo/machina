---
description: Reset pass ceiling and optionally phase after human review.
allowed-tools: Bash, Read, Write, Edit
---

# /machina reset

Reset the §0 pass-ceiling counter for the current session. Optionally reset phase to `orient`.

Run with Bash:

```bash
node -e "
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const sid=process.env.CLAUDE_SESSION_ID||crypto.createHash('md5').update(String(process.ppid)).digest('hex').slice(0,8);
function findRoot(start){let d=path.resolve(start);for(let i=0;i<25;i++){if(fs.existsSync(path.join(d,'.machina')))return d;const p=path.dirname(d);if(p===d)break;d=p;}return path.resolve(start);}
const root=findRoot(process.cwd());
const cf=path.join(root,'.machina','pass-counts',sid+'.json');
try{fs.unlinkSync(cf);console.log('Pass counter reset:',sid);}catch(e){console.log('No counter file');}
const sf=path.join(root,'.machina','state.json');
if(fs.existsSync(sf)){const s=JSON.parse(fs.readFileSync(sf,'utf8'));s.pass_count=0;fs.writeFileSync(sf,JSON.stringify(s,null,2)+'\n');}
"
```

Confirm: `Machina reset. Pass counter at 0.`
