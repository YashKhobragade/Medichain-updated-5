#!/usr/bin/env node
// Starts the ML scanner and the website together:  npm run demo
// Works on Windows, macOS and Linux. Ctrl+C stops both.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const win = process.platform === 'win32';
const say = (m) => console.log(`\x1b[36m[demo]\x1b[0m ${m}`);

if (!fs.existsSync(path.join(root, 'node_modules'))) {
    say('First run: install the website packages with   npm install');
    process.exit(1);
}

// 1. Find Python 3.9+
const python = ['python3', 'python', 'py'].find(cmd => {
    const r = spawnSync(cmd, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'], { stdio: 'ignore', shell: win });
    return r.status === 0;
});

// 2. Check the scanner's packages
let scanner = null;
if (!python) {
    say('Python 3.9+ was not found, so the inventory scanner will not run.');
    say('Install it from https://www.python.org/downloads/ (tick "Add to PATH" on Windows).');
} else {
    const check = spawnSync(python, ['-c', 'import cv2, fastapi, uvicorn, multipart; cv2.wechat_qrcode_WeChatQRCode'], { stdio: 'ignore', shell: win });
    if (check.status !== 0) {
        say('Scanner packages are missing. Install them once with:');
        say(`  ${python} -m pip install -r ml-service/requirements.txt`);
        say('Starting the website without the scanner for now.');
    } else {
        scanner = spawn(python, [path.join('ml-service', 'main.py')], { cwd: root, shell: win });
    }
}

// 3. Start the website
const web = spawn(win ? 'npx.cmd' : 'npx', ['next', 'dev'], { cwd: root, shell: win });

const prefix = (proc, tag, colour) => {
    if (!proc) return;
    const out = (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach(l => console.log(`\x1b[${colour}m[${tag}]\x1b[0m ${l}`));
    proc.stdout.on('data', out);
    proc.stderr.on('data', out);
};
prefix(scanner, 'scanner', 35);
prefix(web, 'web', 32);
say(scanner ? 'Scanner on http://localhost:8000 · website on http://localhost:3000' : 'Website on http://localhost:3000');

const stop = () => { [scanner, web].forEach(p => { try { p && p.kill(); } catch { } }); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
web.on('exit', stop);
if (scanner) scanner.on('exit', (code) => { if (code) say(`Scanner stopped (code ${code}). Website keeps running.`); });
