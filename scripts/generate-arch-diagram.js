/**
 * generate-arch-diagram.js
 * 生成技术架构图 PNG 截图
 * cd crmAPP && node scripts/generate-arch-diagram.js
 */
var fs = require('fs');
var path = require('path');
var puppeteer = require('puppeteer-core');

var EPATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
var odir = path.join(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(odir)) {
  fs.mkdirSync(odir, { recursive: true });
}

function buildHtml() {
  var css = [
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family:"Microsoft YaHei","PingFang SC",sans-serif; background:#fff; padding:40px; }',
    '.title { text-align:center; font-size:22px; font-weight:bold; color:#1a1a2e; margin-bottom:30px; letter-spacing:2px; }',
    '.subtitle { text-align:center; font-size:13px; color:#888; margin-top:-22px; margin-bottom:28px; }',
    '.arch { max-width:900px; margin:0 auto; }',
    '',
    '/* Layer styles */',
    '.layer { margin-bottom:16px; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); }',
    '.layer-header { padding:10px 20px; color:#fff; font-size:15px; font-weight:bold; letter-spacing:1px; }',
    '.layer-body { padding:16px 20px; display:flex; flex-wrap:wrap; gap:12px; background:#fff; }',
    '',
    '/* Color themes */',
    '.l-client .layer-header { background:linear-gradient(135deg,#667eea,#764ba2); }',
    '.l-client .layer-body { background:#f8f7ff; }',
    '.l-gateway .layer-header { background:linear-gradient(135deg,#f093fb,#f5576c); }',
    '.l-gateway .layer-body { background:#fff5f7; }',
    '.l-service .layer-header { background:linear-gradient(135deg,#4facfe,#00f2fe); }',
    '.l-service .layer-body { background:#f0f9ff; }',
    '.l-data .layer-header { background:linear-gradient(135deg,#43e97b,#38f9d7); }',
    '.l-data .layer-body { background:#f0fdf4; }',
    '.l-infra .layer-header { background:linear-gradient(135deg,#fa709a,#fee140); }',
    '.l-infra .layer-body { background:#fffdf0; }',
    '',
    '/* Box items */',
    '.box { background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:10px 16px; min-width:120px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.06); transition:transform 0.2s; }',
    '.box .icon { font-size:22px; margin-bottom:4px; }',
    '.box .name { font-size:13px; font-weight:bold; color:#333; }',
    '.box .desc { font-size:11px; color:#888; margin-top:2px; }',
    '',
    '/* Arrows between layers */',
    '.arrows { text-align:center; padding:6px 0; font-size:18px; color:#aaa; letter-spacing:8px; }',
    '.arrows span { display:inline-block; animation:bounce 1.5s infinite; }',
    '',
    '/* Protocol labels */',
    '.proto-row { display:flex; justify-content:center; gap:20px; margin:8px 0; }',
    '.proto { background:#eee; color:#555; font-size:11px; padding:3px 12px; border-radius:12px; font-weight:bold; }',
    '.proto.ws { background:#e8f5e9; color:#2e7d32; }',
    '.proto.http { background:#e3f2fd; color:#1565c0; }',
    '.proto.wss { background:#fff3e0; color:#e65100; }',
  ].join('\n');

  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<style>' + css + '</style></head><body>' +
    '<div class="arch">' +
    '<div class="title">\u4e91\u5ba2CRM\u5916\u547c\u52a9\u624b\u8f6f\u4ef6 V1.0.0</div>' +
    '<div class="subtitle">\u7cfb\u7edf\u6280\u672f\u67b6\u6784\u56fe</div>';

  // Layer 1: Client
  html += '<div class="layer l-client">' +
    '<div class="layer-header">\ud83d\udcf1 \u5ba2\u6237\u7aef\u5c42 Client Layer</div>' +
    '<div class="layer-body">' +
    box('\ud83d\udcf1', 'APP\u79fb\u52a8\u7aef', 'uni-app 3.x + Vue 3\nAndroid / iOS') +
    box('\ud83d\udcbb', 'CRM\u7ba1\u7406\u540e\u53f0', 'Vue 3 + Vite\nElement Plus') +
    box('\ud83c\udf10', 'PC\u7aef\u62e8\u53f7\u63a7\u5236', 'Web\u7aef\u96c6\u6210\nWebSocket\u63a7\u5236') +
    box('\ud83d\udcc4', '\u5b98\u7f51/\u843d\u5730\u9875', 'Vue 3 + Vite\n\u54cd\u5e94\u5f0f\u8bbe\u8ba1') +
    '</div></div>';

  // Arrow
  html += '<div class="arrows"><span>\u25bc</span></div>' +
    '<div class="proto-row">' +
    '<span class="proto http">HTTPS / RESTful API</span>' +
    '<span class="proto ws">WebSocket (Socket.IO)</span>' +
    '<span class="proto wss">WSS \u52a0\u5bc6\u901a\u4fe1</span>' +
    '</div>' +
    '<div class="arrows"><span>\u25bc</span></div>';

  // Layer 2: Gateway / Security
  html += '<div class="layer l-gateway">' +
    '<div class="layer-header">\ud83d\udee1\ufe0f \u7f51\u5173\u4e0e\u5b89\u5168\u5c42 Gateway & Security</div>' +
    '<div class="layer-body">' +
    box('\ud83d\udd11', 'JWT\u8ba4\u8bc1', '\u4ee4\u724c\u9a8c\u8bc1\n\u81ea\u52a8\u7eed\u671f') +
    box('\ud83d\udee1\ufe0f', 'Helmet\u5b89\u5168', 'HTTP\u5934\u9632\u62a4\nXSS/CSRF\u9632\u5fa1') +
    box('\u23f1\ufe0f', '\u901f\u7387\u9650\u5236', 'express-rate-limit\nAPI\u9632\u5237') +
    box('\ud83d\udd10', 'AES-256\u52a0\u5bc6', '\u672c\u5730\u6570\u636e\u52a0\u5bc6\n\u4f20\u8f93\u52a0\u5bc6') +
    box('\u2705', '\u8bf7\u6c42\u9a8c\u8bc1', 'express-validator\nJoi Schema') +
    '</div></div>';

  // Arrow
  html += '<div class="arrows"><span>\u25bc</span></div>';

  // Layer 3: Service
  html += '<div class="layer l-service">' +
    '<div class="layer-header">\u2699\ufe0f \u4e1a\u52a1\u670d\u52a1\u5c42 Service Layer</div>' +
    '<div class="layer-body">' +
    box('\ud83d\udcde', '\u5916\u547c\u670d\u52a1', 'WebSocket\u62e8\u53f7\u6307\u4ee4\n\u901a\u8bdd\u72b6\u6001\u7ba1\u7406') +
    box('\ud83d\udc65', '\u5ba2\u6237\u7ba1\u7406', 'CRUD\u64cd\u4f5c\n\u610f\u5411\u6807\u7b7e') +
    box('\ud83d\udcca', '\u6570\u636e\u7edf\u8ba1', '\u901a\u8bdd\u7edf\u8ba1\n\u62a5\u8868\u5bfc\u51fa') +
    box('\ud83d\udc64', '\u7528\u6237\u670d\u52a1', '\u767b\u5f55\u6ce8\u518c\n\u6743\u9650\u63a7\u5236') +
    box('\ud83d\udce8', '\u901a\u77e5\u670d\u52a1', '\u90ae\u4ef6(Nodemailer)\n\u7cfb\u7edf\u901a\u77e5') +
    box('\ud83c\udfab', 'SaaS\u6388\u6743', '\u8bb8\u53ef\u8bc1\u7ba1\u7406\n\u591a\u79df\u6237\u652f\u6301') +
    '</div></div>';

  // Arrow
  html += '<div class="arrows"><span>\u25bc</span></div>';

  // Layer 4: Data
  html += '<div class="layer l-data">' +
    '<div class="layer-header">\ud83d\uddc4\ufe0f \u6570\u636e\u5c42 Data Layer</div>' +
    '<div class="layer-body">' +
    box('\ud83d\uddc3\ufe0f', 'MySQL', '\u4e3b\u6570\u636e\u5e93\nmysql2 + TypeORM') +
    box('\ud83d\udcbe', 'SQLite', '\u8f7b\u91cf\u7aef\u5b58\u50a8\n\u672c\u5730\u7f13\u5b58') +
    box('\u26a1', 'Redis', '\u4f1a\u8bdd\u7f13\u5b58\nioredis(\u53ef\u9009)') +
    box('\u2601\ufe0f', '\u963f\u91cc\u4e91 OSS', '\u6587\u4ef6\u5b58\u50a8\n\u5f55\u97f3\u4e0a\u4f20') +
    box('\ud83d\udcc1', '\u672c\u5730\u6587\u4ef6', 'Multer\u4e0a\u4f20\n\u4e34\u65f6\u5b58\u50a8') +
    '</div></div>';

  // Arrow
  html += '<div class="arrows"><span>\u25bc</span></div>';

  // Layer 5: Infrastructure
  html += '<div class="layer l-infra">' +
    '<div class="layer-header">\ud83c\udfed \u57fa\u7840\u8bbe\u65bd\u5c42 Infrastructure</div>' +
    '<div class="layer-body">' +
    box('\ud83d\ude80', 'Node.js 22+', 'Express 4.x\nTypeScript 5.x') +
    box('\ud83d\udce6', 'PM2', '\u8fdb\u7a0b\u7ba1\u7406\n\u96c6\u7fa4\u90e8\u7f72') +
    box('\ud83d\udcdd', 'Winston', '\u65e5\u5fd7\u7ba1\u7406\n\u5206\u7ea7\u8f93\u51fa') +
    box('\ud83d\udd04', 'Socket.IO 4.x', '\u5b9e\u65f6\u901a\u4fe1\n\u81ea\u52a8\u91cd\u8fde') +
    box('\ud83d\udee0\ufe0f', 'Vite 5.x', '\u6784\u5efa\u5de5\u5177\nHMR\u70ed\u66f4\u65b0') +
    box('\ud83e\uddea', 'Jest', '\u5355\u5143\u6d4b\u8bd5\nts-jest') +
    '</div></div>';

  html += '</div></body></html>';
  return html;
}

function box(icon, name, desc) {
  var lines = desc.split('\n');
  var descHtml = '';
  for (var i = 0; i < lines.length; i++) {
    descHtml += '<div class="desc">' + lines[i] + '</div>';
  }
  return '<div class="box"><div class="icon">' + icon + '</div>' +
    '<div class="name">' + name + '</div>' + descHtml + '</div>';
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Tech Architecture Diagram Generator');
  console.log('='.repeat(50));

  var html = buildHtml();
  var htmlPath = path.join(odir, '01-tech-arch.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('  HTML: ' + htmlPath);

  try {
    console.log('  Launching Edge...');
    var browser = await puppeteer.launch({
      executablePath: EPATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    var page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Get actual content height
    var bodyHeight = await page.evaluate(function() {
      return document.body.scrollHeight;
    });
    await page.setViewport({ width: 1000, height: bodyHeight + 80, deviceScaleFactor: 2 });

    var pngPath = path.join(odir, '01-tech-arch.png');
    await page.screenshot({ path: pngPath, fullPage: true, type: 'png' });
    await browser.close();

    // Clean up temp HTML
    fs.unlinkSync(htmlPath);

    var stats = fs.statSync(pngPath);
    console.log('  PNG: ' + pngPath);
    console.log('  Size: ' + (stats.size / 1024).toFixed(1) + ' KB');
    console.log('\n  Done! Screenshot saved.');
  } catch (err) {
    console.error('  Screenshot failed: ' + err.message);
    console.log('  HTML saved at: ' + htmlPath);
    console.log('  Open in browser and screenshot manually.');
  }
}

main().catch(console.error);

