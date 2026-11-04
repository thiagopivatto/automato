/**
 * PM2 — rode no SSD local, não em share UNC/NAS.
 *
 * pm2 start ecosystem.config.cjs
 */
const path = require('path')

const raiz = __dirname
const dataDir = process.env.ULTRON_DATA_DIR || path.join(raiz, 'dados')
const sessaoDir = process.env.ULTRON_SESSAO_DIR || path.join(raiz, 'sessao')
const tempDir = process.env.ULTRON_TEMP_DIR || path.join(raiz, 'temp')

module.exports = {
    apps: [
        {
            name: 'ultron',
            script: 'app.js',
            cwd: raiz,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            max_memory_restart: '768M',
            exp_backoff_restart_delay: 2000,
            min_uptime: '10s',
            max_restarts: 50,
            kill_timeout: 8000,
            listen_timeout: 15000,
            watch: false,
            time: true,
            env: {
                NODE_ENV: 'production',
                LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
                ULTRON_DATA_DIR: dataDir,
                ULTRON_SESSAO_DIR: sessaoDir,
                ULTRON_TEMP_DIR: tempDir,
                ULTRON_SKIP_VENDOR_SYNC: '1'
            }
        }
    ]
}
