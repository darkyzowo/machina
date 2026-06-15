Reset the §0 pass-ceiling counter for the current session.

Use this after a human review has cleared a legitimate loop — it zeroes
the edit counter so the agent can continue without triggering the halt.

Run the following with the Bash tool:

```bash
node -e "
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const sid = process.env.CLAUDE_SESSION_ID
  || crypto.createHash('md5').update(String(process.ppid)).digest('hex').slice(0, 8);
const f = path.join(os.homedir(), '.claude', 'pass-counts', sid + '.json');
try {
  fs.unlinkSync(f);
  console.log('✓ Pass counter reset for session ' + sid);
} catch (e) {
  console.log('ℹ No counter found for session ' + sid + ' (already reset or never set)');
}
"
```

Confirm with: "Pass counter reset. Resuming from pass 0."
