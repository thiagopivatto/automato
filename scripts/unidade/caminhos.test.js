import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

describe('caminhos ULTRON_DATA_DIR', () => {
    it('honra ULTRON_DATA_DIR absoluto', () => {
        const data = path.join('C:', 'ultron-data-test-xyz')
        const code = `
          process.env.ULTRON_DATA_DIR = ${JSON.stringify(data)};
          const m = await import(${JSON.stringify(pathToFileURL(path.resolve('bot/lib/caminhos.js')).href)});
          if (m.dirDados !== ${JSON.stringify(path.normalize(data))}) {
            console.error('got', m.dirDados);
            process.exit(1);
          }
        `
        const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
            encoding: 'utf8',
            cwd: path.resolve('.')
        })
        assert.equal(r.status, 0, r.stderr || r.stdout)
    })
})
