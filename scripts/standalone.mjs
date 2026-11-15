import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('dist');
let html = readFileSync(resolve(output, 'index.html'), 'utf8');
const stylesheet = html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)?.[0];
const script = html.match(/<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/)?.[0];
if (!stylesheet || !script) throw new Error('Build assets were not found. Run npm run build first.');
const cssPath = stylesheet.match(/href="([^"]+)"/)[1];
const scriptPath = script.match(/src="([^"]+)"/)[1];
const font = readFileSync(resolve('public/NotoSans-Variable.ttf')).toString('base64');
const css = readFileSync(resolve(output, cssPath.replace(/^\//, '')), 'utf8').replaceAll('/NotoSans-Variable.ttf', `data:font/ttf;base64,${font}`);
const js = readFileSync(resolve(output, scriptPath.replace(/^\//, '')), 'utf8').replaceAll('</script', '<\\/script');
const favicon = `data:image/svg+xml;base64,${readFileSync(resolve('public/favicon.svg')).toString('base64')}`;
html = html.replace(stylesheet, () => `<style>${css}</style>`).replace(script, () => `<script type="module">${js}</script>`).replace('/favicon.svg', favicon);
writeFileSync(resolve('PediRescue.html'), html);
console.log('Created PediRescue.html — opens directly, with no server or internet.');
