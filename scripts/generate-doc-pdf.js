/**
 * generate-doc-pdf.js
 * 文档鉴别材料(软件说明书)生成脚本
 * cd crmAPP && node scripts/generate-doc-pdf.js
 */
var fs = require('fs');
var path = require('path');
var puppeteer = require('puppeteer-core');
var SN = '\u4e91\u5ba2CRM\u5916\u547c\u52a9\u624b\u8f6f\u4ef6';
var VER = 'V1.0.0';
var FULL = SN + ' ' + VER;
var COMP = '\u5e7f\u5dde\u4ed9\u72d0\u7f51\u7edc\u79d1\u6280\u6709\u9650\u516c\u53f8';
var DDATE = '2026\u5e744\u6708';
var EPATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
var odir = path.join(__dirname, '..', 'docs');
var ssdir = path.join(odir, 'screenshots');

// ===== Screenshot filename mapping =====
// Key: label used in img() calls  Value: filename in screenshots/ folder
var IMG_MAP = {
  '\u6280\u672F\u67B6\u6784\u56FE': '01-tech-arch',
  'Android\u5B89\u88C5\u5B8C\u6210\u754C\u9762': '02-android-install',
  '\u670D\u52A1\u5668\u914D\u7F6E\u9875\u9762': '03-server-config',
  '\u542F\u52A8\u9875\u754C\u9762': '04-splash',
  '\u670D\u52A1\u5668\u914D\u7F6E\u529F\u80FD\u9875\u9762': '05-server-config-func',
  '\u7528\u6237\u767B\u5F55\u9875\u9762': '06-login',
  '\u9996\u9875-\u5F85\u547D\u72B6\u6001': '07-home-standby',
  '\u9996\u9875-\u4ECA\u65E5\u6982\u89C8': '08-home-today',
  '\u626B\u7801\u7ED1\u5B9A\u9875\u9762': '09-scan-bind',
  '\u62E8\u53F7\u76D8\u754C\u9762': '10-dialpad',
  'PC\u7AEF\u62E8\u53F7\u6307\u4EE4\u5F39\u7A97': '11-pc-dial-popup',
  '\u901A\u8BDD\u4E2D\u754C\u9762': '12-calling',
  '\u901A\u8BDD\u7ED3\u675F\u4E0E\u8DDF\u8FDB\u9875\u9762': '13-call-ended',
  '\u901A\u8BDD\u8BE6\u60C5\u9875\u9762': '14-call-detail',
  '\u901A\u8BDD\u8BB0\u5F55\u5217\u8868': '15-call-list',
  '\u6570\u636E\u7EDF\u8BA1\u9875\u9762': '16-stats',
  '\u7CFB\u7EDF\u8BBE\u7F6E\u9875\u9762': '17-settings',
  '\u5173\u4E8E\u9875\u9762': '18-about',
  '\u7528\u6237\u534F\u8BAE\u9875\u9762': '19-user-agreement',
  '\u9690\u79C1\u653F\u7B56\u9875\u9762': '20-privacy-policy'
};
var EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
var imgStats = { found: 0, missing: 0, missingList: [] };

function findScreenshot(label) {
  var base = IMG_MAP[label] || label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-');
  for (var i = 0; i < EXTS.length; i++) {
    var fp = path.join(ssdir, base + EXTS[i]);
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

function img(t) {
  var fp = findScreenshot(t);
  if (fp) {
    imgStats.found++;
    var ext = path.extname(fp).slice(1);
    if (ext === 'jpg') ext = 'jpeg';
    var b64 = fs.readFileSync(fp).toString('base64');
    return '<div style="margin:15px auto;text-align:center">' +
      '<img src="data:image/' + ext + ';base64,' + b64 + '" ' +
      'style="max-width:85%;max-height:400px;border:1px solid #ddd" />' +
      '<div style="font-size:10pt;color:#666;margin-top:8px">\u56FE\uFF1A' + t +
      '</div></div>';
  }
  imgStats.missing++;
  imgStats.missingList.push(t);
  return '<div style="margin:15px auto;text-align:center">' +
    '<div style="width:85%;margin:0 auto;height:200px;border:2px dashed #aaa;' +
    'background:#f9f9f9;display:flex;align-items:center;justify-content:center;' +
    'font-size:11pt;color:#999">[\u8BF7\u63D2\u5165\u622A\u56FE\uFF1A' + t + ']</div>' +
    '<div style="font-size:10pt;color:#666;margin-top:8px">\u56FE\uFF1A' + t +
    '</div></div>';
}
function PB() { return '<div class="pb"></div>'; }
function css() {
  return [
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family:SimSun,"Songti SC",serif; font-size:12pt; line-height:1.8; color:#333; }',
    '  @page { size:A4; margin:30mm 22mm 25mm 25mm; }',
    '  @media print { .pb { page-break-before:always; } }',
    '.pb { page-break-before:always; }',
    '.cover { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:250mm; text-align:center; }',
    '.cover h1 { font-size:26pt; margin-bottom:30px; letter-spacing:2px; }',
    '.cover h2 { font-size:20pt; color:#555; margin-bottom:80px; letter-spacing:6px; }',
    '.cover .ci { font-size:14pt; line-height:2.8; }',
    '.cover .ci p { text-indent:0; }',
    '.ct { padding:0 2mm; }',
    'h1.ch { font-size:18pt; margin:25px 0 15px; border-bottom:2px solid #333; padding-bottom:5px; }',
    'h2.se { font-size:14pt; margin:20px 0 10px; }',
    'p { text-indent:2em; margin:6px 0; text-align:justify; }',
    'p.ni { text-indent:0; }',
    'ul,ol { margin:8px 0 8px 2em; }',
    'li { margin:3px 0; }',
    'table { width:100%; border-collapse:collapse; margin:12px 0; font-size:11pt; }',
    'th,td { border:1px solid #999; padding:5px 8px; text-align:left; }',
    'th { background:#f0f0f0; }',
    '.toc { padding:20px 2mm; }',
    '.toc h1 { text-align:center; border:none; font-size:18pt; margin-bottom:20px; }',
    '.ti { display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px dotted #ccc; font-size:12pt; }',
    '.tc { font-weight:bold; margin-top:8px; font-size:13pt; }',
    '.fl { background:#f5f5f5; border:1px solid #ddd; padding:12px; margin:12px 0; font-family:Consolas,monospace; font-size:10pt; white-space:pre-wrap; line-height:1.5; }'
  ].join('\n');
}
function coverPage() {
  return '<div class="cover">' +
    '<h1>' + FULL + '</h1>' +
    '<h2>\u8F6F \u4EF6 \u8BF4 \u660E \u4E66</h2>' +
    '<div class="ci">' +
    '<p>\u8F6F\u4EF6\u540D\u79F0\uFF1A' + FULL + '</p>' +
    '<p>\u7533 \u8BF7 \u4EBA\uFF1A' + COMP + '</p>' +
    '<p>\u7F16\u5199\u65E5\u671F\uFF1A' + DDATE + '</p>' +
    '</div></div>';
}
function tocPage() {
  var items = [
    ['\u7B2C\u4E00\u7AE0 \u8F6F\u4EF6\u6982\u8FF0', 1],
    ['  1.1 \u8F6F\u4EF6\u7B80\u4ECB', 0],
    ['  1.2 \u8F6F\u4EF6\u7528\u9014', 0],
    ['  1.3 \u8FD0\u884C\u73AF\u5883', 0],
    ['  1.4 \u6280\u672F\u67B6\u6784', 0],
    ['\u7B2C\u4E8C\u7AE0 \u5B89\u88C5\u4E0E\u90E8\u7F72', 1],
    ['  2.1 \u7CFB\u7EDF\u8981\u6C42', 0],
    ['  2.2 \u5B89\u88C5\u6B65\u9AA4', 0],
    ['  2.3 \u670D\u52A1\u5668\u914D\u7F6E', 0],
    ['\u7B2C\u4E09\u7AE0 \u529F\u80FD\u6A21\u5757\u8BF4\u660E', 1],
    ['  3.1 \u542F\u52A8\u4E0E\u521D\u59CB\u5316', 0],
    ['  3.2 \u670D\u52A1\u5668\u914D\u7F6E', 0],
    ['  3.3 \u7528\u6237\u767B\u5F55', 0],
    ['  3.4 \u9996\u9875\uFF08\u5F85\u547D\u72B6\u6001\uFF09', 0],
    ['  3.5 \u8BBE\u5907\u626B\u7801\u7ED1\u5B9A', 0],
    ['  3.6 \u62E8\u53F7\u529F\u80FD', 0],
    ['  3.7 \u901A\u8BDD\u4E2D\u754C\u9762', 0],
    ['  3.8 \u901A\u8BDD\u7ED3\u675F\u4E0E\u8DDF\u8FDB', 0],
    ['  3.9 \u901A\u8BDD\u8BE6\u60C5', 0],
    ['  3.10 \u901A\u8BDD\u8BB0\u5F55\u5217\u8868', 0],
    ['  3.11 \u6570\u636E\u7EDF\u8BA1', 0],
    ['  3.12 \u7CFB\u7EDF\u8BBE\u7F6E', 0],
    ['  3.13 \u5173\u4E8E\u9875\u9762', 0],
    ['  3.14 \u7528\u6237\u534F\u8BAE\u4E0E\u9690\u79C1\u653F\u7B56', 0],
    ['\u7B2C\u56DB\u7AE0 \u6280\u672F\u67B6\u6784\u8BF4\u660E', 1],
    ['  4.1 \u524D\u540E\u7AEF\u4EA4\u4E92\u65B9\u5F0F', 0],
    ['  4.2 WebSocket\u901A\u4FE1\u534F\u8BAE', 0],
    ['  4.3 \u591A\u79DF\u6237\u67B6\u6784', 0],
    ['  4.4 \u6570\u636E\u5B89\u5168', 0]
  ];
  var h = '<div class="toc"><h1>\u76EE    \u5F55</h1>';
  for (var i = 0; i < items.length; i++) {
    var cls = items[i][1] ? ' tc' : '';
    h += '<div class="ti' + cls + '"><span>' + items[i][0] + '</span></div>';
  }
  return h + '</div>';
}
function ch1() {
  return PB() + '<div class="ct">' +
    '<h1 class="ch">\u7B2C\u4E00\u7AE0 \u8F6F\u4EF6\u6982\u8FF0</h1>' +
    '<h2 class="se">1.1 \u8F6F\u4EF6\u7B80\u4ECB</h2>' +
    '<p>' + SN + '\u662F\u4E00\u6B3E\u57FA\u4E8Euni-app\u6846\u67B6\u5F00\u53D1\u7684\u79FB\u52A8\u7AEF\u7535\u9500\u5916\u547C\u52A9\u624B\u5E94\u7528\uFF0C\u914D\u5408\u4E91\u5BA2CRM\u5BA2\u6237\u5173\u7CFB\u7BA1\u7406\u7CFB\u7EDF\u4F7F\u7528\uFF0C\u4E13\u4E3A\u7535\u8BDD\u9500\u552E\u56E2\u961F\u8BBE\u8BA1\u3002\u91C7\u7528Vue 3 + TypeScript\u6280\u672F\u6808\uFF0C\u652F\u6301Android\u548CiOS\u53CC\u5E73\u53F0\uFF0C\u901A\u8FC7WebSocket\u5B9E\u73B0PC\u7AEF\u8FDC\u7A0B\u63A7\u5236\u624B\u673A\u62E8\u53F7\u3002</p>' +
    '<p>\u8F6F\u4EF6\u5177\u5907\u901A\u8BDD\u5F55\u97F3\u81EA\u52A8\u91C7\u96C6\u3001\u6570\u636E\u5B9E\u65F6\u540C\u6B65\u7EDF\u8BA1\u3001\u626B\u7801\u5FEB\u901F\u7ED1\u5B9A\u8BBE\u5907\u7B49\u7279\u8272\u529F\u80FD\u3002</p>' +
    '<h2 class="se">1.2 \u8F6F\u4EF6\u7528\u9014</h2>' +
    '<p>\u672C\u8F6F\u4EF6\u4E3B\u8981\u7528\u4E8E\u4EE5\u4E0B\u573A\u666F\uFF1A</p><ul>' +
    '<li>\u914D\u5408PC\u7AEFCRM\u7CFB\u7EDF\u8FDC\u7A0B\u63A7\u5236\u624B\u673A\u62E8\u53F7</li>' +
    '<li>\u624B\u673A\u7AEF\u4E3B\u52A8\u5916\u547C\uFF0C\u62E8\u53F7\u76D8\u624B\u52A8\u8F93\u5165\u53F7\u7801</li>' +
    '<li>\u81EA\u52A8\u91C7\u96C6\u901A\u8BDD\u5F55\u97F3\u540C\u6B65\u670D\u52A1\u5668</li>' +
    '<li>\u5B9E\u65F6\u7EDF\u8BA1\u901A\u8BDD\u6570\u636E\uFF0C\u8F85\u52A9\u7BA1\u7406\u51B3\u7B56</li>' +
    '<li>\u901A\u8BDD\u7ED3\u675F\u540E\u8BB0\u5F55\u8DDF\u8FDB\u4FE1\u606F\u548C\u610F\u5411\u6807\u7B7E</li></ul>' +
    '<h2 class="se">1.3 \u8FD0\u884C\u73AF\u5883</h2>' +
    '<table><tr><th>\u9879\u76EE</th><th>\u8981\u6C42</th></tr>' +
    '<tr><td>\u64CD\u4F5C\u7CFB\u7EDF</td><td>Android 7.0+ / iOS 12.0+</td></tr>' +
    '<tr><td>\u8BBE\u5907</td><td>\u667A\u80FD\u624B\u673A</td></tr>' +
    '<tr><td>\u7F51\u7EDC</td><td>WiFi\u6216\u79FB\u52A8\u6570\u636E</td></tr>' +
    '<tr><td>\u914D\u5957</td><td>\u4E91\u5BA2CRM\u540E\u7AEF\u670D\u52A1</td></tr></table>' +
    '<h2 class="se">1.4 \u6280\u672F\u67B6\u6784</h2>' +
    '<table><tr><th>\u6280\u672F</th><th>\u8BF4\u660E</th></tr>' +
    '<tr><td>\u524D\u7AEF</td><td>uni-app 3.x + Vue 3 + TypeScript</td></tr>' +
    '<tr><td>\u72B6\u6001</td><td>Pinia 2.x</td></tr>' +
    '<tr><td>\u901A\u4FE1</td><td>WebSocket (Socket.IO)</td></tr>' +
    '<tr><td>\u63A5\u53E3</td><td>RESTful API</td></tr>' +
    '<tr><td>\u8BA4\u8BC1</td><td>JWT\u4EE4\u724C</td></tr>' +
    '<tr><td>\u52A0\u5BC6</td><td>AES-256</td></tr></table>' +
    img('\u6280\u672F\u67B6\u6784\u56FE') + '</div>';
}
function ch2() {
  return PB() + '<div class="ct">' +
    '<h1 class="ch">\u7B2C\u4E8C\u7AE0 \u5B89\u88C5\u4E0E\u90E8\u7F72</h1>' +
    '<h2 class="se">2.1 \u7CFB\u7EDF\u8981\u6C42</h2>' +
    '<p>\u5B89\u88C5\u672C\u8F6F\u4EF6\u524D\uFF0C\u8BF7\u786E\u4FDD\u8BBE\u5907\u6EE1\u8DB3\u4EE5\u4E0B\u8981\u6C42\uFF1A</p>' +
    '<table><tr><th>\u5E73\u53F0</th><th>\u6700\u4F4E\u7248\u672C</th><th>\u63A8\u8350\u7248\u672C</th></tr>' +
    '<tr><td>Android</td><td>Android 7.0 (API 24)</td><td>Android 12+</td></tr>' +
    '<tr><td>iOS</td><td>iOS 12.0</td><td>iOS 15+</td></tr></table>' +
    '<p>\u6B64\u5916\u8FD8\u9700\u8981\u4EE5\u4E0B\u6743\u9650\uFF1A</p>' +
    '<table><tr><th>\u6743\u9650</th><th>\u7528\u9014</th></tr>' +
    '<tr><td>\u62E8\u6253\u7535\u8BDD</td><td>\u6267\u884C\u5916\u547C\u62E8\u53F7</td></tr>' +
    '<tr><td>\u901A\u8BDD\u72B6\u6001</td><td>\u76D1\u542C\u63A5\u901A\u6302\u65AD</td></tr>' +
    '<tr><td>\u5F55\u97F3</td><td>\u901A\u8BDD\u5F55\u97F3</td></tr>' +
    '<tr><td>\u76F8\u673A</td><td>\u626B\u7801\u7ED1\u5B9A</td></tr>' +
    '<tr><td>\u7F51\u7EDC</td><td>\u670D\u52A1\u5668\u901A\u4FE1</td></tr></table>' +
    '<h2 class="se">2.2 \u5B89\u88C5\u6B65\u9AA4</h2>' +
    '<p><b>Android\u5E73\u53F0\uFF1A</b></p><ol>' +
    '<li>\u4ECE\u516C\u53F8\u5185\u90E8\u5E73\u53F0\u83B7\u53D6APK\u5B89\u88C5\u5305</li>' +
    '<li>\u5F00\u542F\u201C\u5141\u8BB8\u672A\u77E5\u6765\u6E90\u201D\u8BBE\u7F6E</li>' +
    '<li>\u70B9\u51FBAPK\u6587\u4EF6\u5B89\u88C5</li>' +
    '<li>\u5728\u684C\u9762\u627E\u5230\u201CCRM\u5916\u547C\u52A9\u624B\u201D\u56FE\u6807</li></ol>' +
    img('Android\u5B89\u88C5\u5B8C\u6210\u754C\u9762') +
    '<p><b>iOS\u5E73\u53F0\uFF1A</b></p><ol>' +
    '<li>\u901A\u8FC7\u4F01\u4E1A\u8BC1\u4E66\u6216TestFlight\u5B89\u88C5</li>' +
    '<li>\u9996\u6B21\u6253\u5F00\u9700\u4FE1\u4EFB\u4F01\u4E1A\u8BC1\u4E66</li></ol>' +
    '<h2 class="se">2.3 \u670D\u52A1\u5668\u914D\u7F6E</h2>' +
    '<p>\u9996\u6B21\u542F\u52A8\u9700\u914D\u7F6E\u670D\u52A1\u5668\u5730\u5740\u3002\u652F\u6301\u591A\u79DF\u6237SaaS\u90E8\u7F72\u3002</p>' +
    '<p><b>\u65B9\u5F0F\u4E00\uFF1A\u624B\u52A8\u8F93\u5165</b></p><ol>' +
    '<li>\u8F93\u5165\u670D\u52A1\u5668\u57DF\u540D\u6216IP\u5730\u5740</li>' +
    '<li>\u70B9\u51FB\u201C\u6D4B\u8BD5\u5E76\u4FDD\u5B58\u201D\u9A8C\u8BC1\u8FDE\u63A5</li></ol>' +
    '<p><b>\u65B9\u5F0F\u4E8C\uFF1A\u626B\u7801\u914D\u7F6E</b></p><ol>' +
    '<li>\u70B9\u51FB\u626B\u7801\u914D\u7F6E\u6309\u94AE</li>' +
    '<li>\u626B\u63CF\u670D\u52A1\u5668\u914D\u7F6E\u4E8C\u7EF4\u7801</li></ol>' +
    img('\u670D\u52A1\u5668\u914D\u7F6E\u9875\u9762') + '</div>';
}
function ch3() {
  var h = PB() + '<div class="ct"><h1 class="ch">\u7B2C\u4E09\u7AE0 \u529F\u80FD\u6A21\u5757\u8BF4\u660E</h1>';
  h += '<h2 class="se">3.1 \u542F\u52A8\u4E0E\u521D\u59CB\u5316</h2>' +
    '<p>\u7528\u6237\u70B9\u51FB\u5E94\u7528\u56FE\u6807\u542F\u52A8\u8F6F\u4EF6\uFF0C\u9996\u5148\u663E\u793A\u542F\u52A8\u9875\u3002\u542F\u52A8\u9875\u5C55\u793ALogo\u3001\u540D\u79F0\u201CCRM\u5916\u547C\u52A9\u624B\u201D\u548C\u6807\u8BED\u201C\u9AD8\u6548\u5916\u547C\u00B7\u667A\u80FD\u7BA1\u7406\u201D\u3002\u7CFB\u7EDF\u540E\u53F0\u68C0\u67E5\u670D\u52A1\u5668\u914D\u7F6E\u3001\u9A8C\u8BC1\u767B\u5F55\u72B6\u6001\u3001\u6062\u590D\u7528\u6237\u504F\u597D\u8BBE\u7F6E\uFF0C\u6839\u636E\u68C0\u67E5\u7ED3\u679C\u81EA\u52A8\u8DF3\u8F6C\u5230\u76F8\u5E94\u9875\u9762\u3002</p>' +
    img('\u542F\u52A8\u9875\u754C\u9762');
  h += PB() + '<h2 class="se">3.2 \u670D\u52A1\u5668\u914D\u7F6E</h2>' +
    '<p>\u670D\u52A1\u5668\u914D\u7F6E\u9875\u7528\u4E8E\u8BBE\u7F6E\u540E\u7AEF\u670D\u52A1\u8FDE\u63A5\u5730\u5740\u3002\u652F\u6301\u624B\u52A8\u8F93\u5165\u57DF\u540D/IP\u3001\u626B\u7801\u914D\u7F6E\u3001\u5386\u53F2\u8BB0\u5F55\u9009\u62E9\u3002</p>' +
    img('\u670D\u52A1\u5668\u914D\u7F6E\u529F\u80FD\u9875\u9762');
  h += PB() + '<h2 class="se">3.3 \u7528\u6237\u767B\u5F55</h2>' +
    '<p>\u7528\u6237\u767B\u5F55\u9875\u63D0\u4F9B\u8D26\u53F7\u5BC6\u7801\u767B\u5F55\uFF0C\u901A\u8FC7JWT\u4EE4\u724C\u5B8C\u6210\u8EAB\u4EFD\u9A8C\u8BC1\u3002\u652F\u6301\u8BB0\u4F4F\u5BC6\u7801\u548C\u81EA\u52A8\u767B\u5F55\u3002\u767B\u5F55\u6210\u529F\u540E\u81EA\u52A8\u5EFA\u7ACBWebSocket\u8FDE\u63A5\u3002</p>' +
    img('\u7528\u6237\u767B\u5F55\u9875\u9762');
  h += PB() + '<h2 class="se">3.4 \u9996\u9875\uFF08\u5F85\u547D\u72B6\u6001\uFF09</h2>' +
    '<p>\u9996\u9875\u662F\u4E3B\u5DE5\u4F5C\u754C\u9762\uFF0C\u663E\u793A\u7528\u6237\u72B6\u6001\u548C\u4ECA\u65E5\u6570\u636E\u3002\u5305\u62EC\u7528\u6237\u72B6\u6001\u5361\u7247\u3001\u4ECA\u65E5\u62E8\u6253/\u63A5\u901A/\u672A\u63A5\u901A\u6570\u3001\u901A\u8BDD\u65F6\u957F\u3001\u63A5\u901A\u7387\uFF0C\u4EE5\u53CA\u626B\u7801\u7ED1\u5B9A\u548C\u624B\u52A8\u62E8\u53F7\u5FEB\u6377\u5165\u53E3\u3002</p>' +
    img('\u9996\u9875-\u5F85\u547D\u72B6\u6001') + img('\u9996\u9875-\u4ECA\u65E5\u6982\u89C8');
  h += PB() + '<h2 class="se">3.5 \u8BBE\u5907\u626B\u7801\u7ED1\u5B9A</h2>' +
    '<p>\u626B\u7801\u7ED1\u5B9A\u529F\u80FD\u5C06\u624B\u673A\u4E0EPC\u7AEFCRM\u8D26\u53F7\u5173\u8054\u3002\u5728PC\u7AEF\u751F\u6210\u7ED1\u5B9A\u4E8C\u7EF4\u7801\uFF0CAPP\u626B\u7801\u5373\u53EF\u5B8C\u6210\u7ED1\u5B9A\uFF0C\u652F\u6301\u624B\u7535\u7B52\u529F\u80FD\u3002</p>' +
    img('\u626B\u7801\u7ED1\u5B9A\u9875\u9762');
  h += PB() + '<h2 class="se">3.6 \u62E8\u53F7\u529F\u80FD</h2>' +
    '<p>\u652F\u6301\u4E24\u79CD\u62E8\u53F7\u65B9\u5F0F\uFF1APC\u7AEF\u8FDC\u7A0B\u62E8\u53F7\uFF08\u901A\u8FC7WebSocket\u63A5\u6536\u6307\u4EE4\u81EA\u52A8\u62E8\u6253\uFF09\u548C\u624B\u673A\u7AEF\u624B\u52A8\u62E8\u53F7\uFF08\u901A\u8FC7\u62E8\u53F7\u76D8\u8F93\u5165\u53F7\u7801\uFF09\u3002PC\u7AEF\u62E8\u53F7\u6307\u4EE4\u5F39\u7A97\u663E\u793A\u5BA2\u6237\u4FE1\u606F\uFF0C3\u79D2\u5012\u8BA1\u65F6\u540E\u81EA\u52A8\u62E8\u6253\u3002</p>' +
    img('\u62E8\u53F7\u76D8\u754C\u9762') + img('PC\u7AEF\u62E8\u53F7\u6307\u4EE4\u5F39\u7A97');
  h += PB() + '<h2 class="se">3.7 \u901A\u8BDD\u4E2D\u754C\u9762</h2>' +
    '<p>\u5168\u5C4F\u6C89\u6D78\u5F0F\u8BBE\u8BA1\uFF0C\u663E\u793A\u5BF9\u65B9\u4FE1\u606F\u3001\u5B9E\u65F6\u8BA1\u65F6\u3001\u5F55\u97F3\u72B6\u6001\u3002\u63D0\u4F9B\u9759\u97F3\u3001\u514D\u63D0\u3001\u4FDD\u6301\u3001\u952E\u76D8\u3001\u5907\u6CE8\u3001\u6302\u65AD\u7B49\u64CD\u4F5C\u3002\u901A\u8BDD\u72B6\u6001\u901A\u8FC7WebSocket\u5B9E\u65F6\u540C\u6B65\u3002</p>' +
    img('\u901A\u8BDD\u4E2D\u754C\u9762');
  h += PB() + '<h2 class="se">3.8 \u901A\u8BDD\u7ED3\u675F\u4E0E\u8DDF\u8FDB</h2>' +
    '<p>\u901A\u8BDD\u7ED3\u675F\u540E\u8DF3\u8F6C\u5230\u8DDF\u8FDB\u9875\u9762\uFF0C\u663E\u793A\u901A\u8BDD\u4FE1\u606F\uFF0C\u63D0\u4F9B\u5907\u6CE8\u8F93\u5165\u3001\u5FEB\u6377\u6807\u7B7E\uFF08\u610F\u5411/\u65E0\u610F\u5411/\u518D\u8054\u7CFB/\u6210\u4EA4\uFF09\u3001\u5BA2\u6237\u610F\u5411\u7B49\u7EA7\u3002\u6570\u636E\u5B9E\u65F6\u540C\u6B65\u670D\u52A1\u5668\u3002</p>' +
    img('\u901A\u8BDD\u7ED3\u675F\u4E0E\u8DDF\u8FDB\u9875\u9762');
  h += PB() + '<h2 class="se">3.9 \u901A\u8BDD\u8BE6\u60C5</h2>' +
    '<p>\u5C55\u793A\u5355\u6B21\u901A\u8BDD\u5B8C\u6574\u4FE1\u606F\uFF1A\u901A\u8BDD\u7C7B\u578B\u3001\u72B6\u6001\u3001\u65F6\u957F\u3001\u65F6\u95F4\u3001\u6765\u6E90\uFF0C\u4EE5\u53CA\u5F55\u97F3\u64AD\u653E\u5668\uFF08\u652F\u6301\u64AD\u653E/\u6682\u505C/\u62D6\u52A8/\u4E0B\u8F7D\uFF09\u548C\u5BA2\u6237\u4FE1\u606F\u3002</p>' +
    img('\u901A\u8BDD\u8BE6\u60C5\u9875\u9762');
  h += PB() + '<h2 class="se">3.10 \u901A\u8BDD\u8BB0\u5F55\u5217\u8868</h2>' +
    '<p>\u5E95\u90E8\u5BFC\u822A\u201C\u901A\u8BDD\u201D\u6807\u7B7E\u9875\uFF0C\u652F\u6301\u5168\u90E8/\u547C\u51FA/\u547C\u5165\u7B5B\u9009\uFF0C\u6309\u65E5\u671F\u5206\u7EC4\u663E\u793A\uFF0C\u6BCF\u6761\u8BB0\u5F55\u63D0\u4F9B\u56DE\u62E8\u3001\u64AD\u653E\u5F55\u97F3\u3001\u67E5\u770B\u8BE6\u60C5\u5FEB\u6377\u64CD\u4F5C\u3002\u652F\u6301\u4E0B\u62C9\u5237\u65B0\u548C\u4E0A\u62C9\u52A0\u8F7D\u3002</p>' +
    img('\u901A\u8BDD\u8BB0\u5F55\u5217\u8868');
  h += PB() + '<h2 class="se">3.11 \u6570\u636E\u7EDF\u8BA1</h2>' +
    '<p>\u5E95\u90E8\u5BFC\u822A\u201C\u7EDF\u8BA1\u201D\u6807\u7B7E\u9875\uFF0C\u63D0\u4F9B\u4ECA\u65E5/\u672C\u5468/\u672C\u6708\u7EF4\u5EA6\u5207\u6362\uFF0C\u663E\u793A\u901A\u8BDD\u6982\u89C8\u3001\u65F6\u957F\u7EDF\u8BA1\u3001\u63A5\u901A\u7387\u3001\u901A\u8BDD\u8D8B\u52BF\u56FE\u3001\u547C\u5165\u547C\u51FA\u5360\u6BD4\u3002</p>' +
    img('\u6570\u636E\u7EDF\u8BA1\u9875\u9762');
  h += PB() + '<h2 class="se">3.12 \u7CFB\u7EDF\u8BBE\u7F6E</h2>' +
    '<p>\u5E95\u90E8\u5BFC\u822A\u201C\u8BBE\u7F6E\u201D\u6807\u7B7E\u9875\uFF0C\u5305\u62EC\u8BBE\u5907\u4FE1\u606F\uFF08\u72B6\u6001/\u7ED1\u5B9A\u8D26\u53F7/\u65F6\u95F4\uFF09\u3001\u901A\u8BDD\u8BBE\u7F6E\uFF08\u81EA\u52A8\u5F55\u97F3/\u6765\u7535\u63D0\u9192/\u632F\u52A8/\u63D0\u793A\u97F3\uFF09\u3001\u670D\u52A1\u5668\u8BBE\u7F6E\u3001\u540E\u53F0\u4FDD\u6D3B\u3001\u89E3\u7ED1\u8BBE\u5907\u548C\u9000\u51FA\u767B\u5F55\u3002</p>' +
    img('\u7CFB\u7EDF\u8BBE\u7F6E\u9875\u9762');
  h += '<h2 class="se">3.13 \u5173\u4E8E\u9875\u9762</h2>' +
    '<p>\u663E\u793ALogo\u3001\u7248\u672C\u53F7\u3001\u7248\u6743\u4FE1\u606F\u3001\u5BA2\u670D\u8054\u7CFB\u65B9\u5F0F\uFF0C\u4EE5\u53CA\u7528\u6237\u534F\u8BAE\u548C\u9690\u79C1\u653F\u7B56\u94FE\u63A5\u3002</p>' +
    img('\u5173\u4E8E\u9875\u9762');
  h += '<h2 class="se">3.14 \u7528\u6237\u534F\u8BAE\u4E0E\u9690\u79C1\u653F\u7B56</h2>' +
    '<p>\u63D0\u4F9B\u5B8C\u6574\u7684\u7528\u6237\u670D\u52A1\u534F\u8BAE\u548C\u9690\u79C1\u653F\u7B56\u6587\u6863\u3002\u9690\u79C1\u653F\u7B56\u8BE6\u7EC6\u62AB\u9732\u4FE1\u606F\u6536\u96C6\u8303\u56F4\u3001\u5B58\u50A8\u65B9\u5F0F\u548C\u4FDD\u62A4\u63AA\u65BD\u3002</p>' +
    img('\u7528\u6237\u534F\u8BAE\u9875\u9762') + img('\u9690\u79C1\u653F\u7B56\u9875\u9762');
  return h + '</div>';
}
function ch4() {
  return PB() + '<div class="ct">' +
    '<h1 class="ch">\u7B2C\u56DB\u7AE0 \u6280\u672F\u67B6\u6784\u8BF4\u660E</h1>' +
    '<h2 class="se">4.1 \u524D\u540E\u7AEF\u4EA4\u4E92\u65B9\u5F0F</h2>' +
    '<p>\u91C7\u7528\u524D\u540E\u7AEF\u5206\u79BB\u67B6\u6784\u3002RESTful API\u7528\u4E8E\u767B\u5F55\u8BA4\u8BC1\u3001\u6570\u636E\u67E5\u8BE2\u63D0\u4EA4\uFF0C\u8BF7\u6C42\u5934\u643A\u5E26JWT\u4EE4\u724C\u3002WebSocket\u7528\u4E8E\u5B9E\u65F6\u901A\u4FE1\uFF1A\u63A5\u6536\u62E8\u53F7\u6307\u4EE4\u3001\u4E0A\u62A5\u72B6\u6001\u3001\u7CFB\u7EDF\u901A\u77E5\u3002</p>' +
    '<div class="fl">PC\u7AEF --> [WebSocket] --> \u670D\u52A1\u5668 --> [WebSocket] --> APP\nAPP --> [HTTP API] --> \u670D\u52A1\u5668 --> [\u6570\u636E\u5E93] --> \u6301\u4E45\u5316</div>' +
    '<h2 class="se">4.2 WebSocket\u901A\u4FE1\u534F\u8BAE</h2>' +
    '<p>\u91C7\u7528\u4E8B\u4EF6\u9A71\u52A8\u6A21\u5F0F\uFF0C\u6838\u5FC3\u4E8B\u4EF6\uFF1A</p>' +
    '<table><tr><th>\u4E8B\u4EF6</th><th>\u65B9\u5411</th><th>\u8BF4\u660E</th></tr>' +
    '<tr><td>dial_command</td><td>\u670D\u52A1\u5668\u2192APP</td><td>PC\u7AEF\u62E8\u53F7\u6307\u4EE4</td></tr>' +
    '<tr><td>call_state_change</td><td>APP\u2192\u670D\u52A1\u5668</td><td>\u901A\u8BDD\u72B6\u6001\u53D8\u5316</td></tr>' +
    '<tr><td>device_bind</td><td>\u53CC\u5411</td><td>\u8BBE\u5907\u7ED1\u5B9A\u72B6\u6001</td></tr>' +
    '<tr><td>heartbeat</td><td>\u53CC\u5411</td><td>\u5FC3\u8DF3\u4FDD\u6D3B</td></tr></table>' +
    '<p>\u5B9E\u73B0\u81EA\u52A8\u91CD\u8FDE\u673A\u5236\uFF0C\u65AD\u5F00\u540E\u6309\u9012\u589E\u95F4\u9694\u91CD\u8FDE\uFF0C\u6700\u957F30\u79D2\u3002</p>' +
    '<h2 class="se">4.3 \u591A\u79DF\u6237\u67B6\u6784</h2>' +
    '<p>\u652F\u6301\u591A\u79DF\u6237SaaS\u90E8\u7F72\uFF0C\u4E0D\u540C\u4F01\u4E1A\u90E8\u7F72\u72EC\u7ACB\u670D\u52A1\u5B9E\u4F8B\u3002APP\u542F\u52A8\u65F6\u914D\u7F6E\u76EE\u6807\u670D\u52A1\u5668\uFF0C\u652F\u6301\u57DF\u540D\u548CIP\u4E24\u79CD\u683C\u5F0F\u3002</p>' +
    '<h2 class="se">4.4 \u6570\u636E\u5B89\u5168</h2>' +
    '<p>\u591A\u5C42\u9632\u62A4\u63AA\u65BD\uFF1A</p><ul>' +
    '<li><b>\u4F20\u8F93\u52A0\u5BC6\uFF1A</b>HTTPS/WSS\u534F\u8BAE</li>' +
    '<li><b>\u8EAB\u4EFD\u8BA4\u8BC1\uFF1A</b>JWT\u4EE4\u724C\u673A\u5236</li>' +
    '<li><b>\u672C\u5730\u52A0\u5BC6\uFF1A</b>AES-256\u52A0\u5BC6\u5B58\u50A8</li>' +
    '<li><b>\u5F55\u97F3\u5B89\u5168\uFF1A</b>\u4E0A\u4F20\u540E\u5220\u9664\u672C\u5730</li>' +
    '<li><b>\u6743\u9650\u63A7\u5236\uFF1A</b>\u6700\u5C0F\u6743\u9650\u539F\u5219</li></ul></div>';
}
function buildHtml() {
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<title>' + FULL + '</title><style>' + css() + '</style></head><body>' +
    coverPage() + PB() + tocPage() + ch1() + ch2() + ch3() + ch4() +
    '</body></html>';
}
async function makePdf(hp, pp) {
  console.log('  Launching Edge...');
  var browser = await puppeteer.launch({
    executablePath: EPATH, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  var page = await browser.newPage();
  var html = fs.readFileSync(hp, 'utf-8');
  await page.setContent(html, { waitUntil: 'networkidle0' });
  var hdr = '<div style="font-size:9pt;font-family:SimSun,serif;width:100%;text-align:center;padding-top:5mm;">' + FULL + '</div>';
  var ftr = '<div style="font-size:9pt;font-family:SimSun,serif;width:100%;text-align:center;padding-bottom:3mm;">\u7B2C <span class="pageNumber"></span> \u9875 \u5171 <span class="totalPages"></span> \u9875</div>';
  await page.pdf({
    path: pp, format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: hdr, footerTemplate: ftr,
    margin: { top: '25mm', bottom: '20mm', left: '25mm', right: '20mm' }
  });
  await browser.close();
  console.log('  PDF: ' + pp);
}
async function main() {
  console.log('='.repeat(50));
  console.log('  Document Identification Material Generator');
  console.log('  ' + FULL);
  console.log('='.repeat(50));

  // Print screenshot mapping guide
  console.log('\n  \u622A\u56FE\u6587\u4EF6\u5BF9\u7167\u8868\uFF1A');
  console.log('  \u622A\u56FE\u653E\u5165\u6587\u4EF6\u5939: ' + ssdir);
  console.log('  ' + '-'.repeat(46));
  var keys = Object.keys(IMG_MAP);
  for (var i = 0; i < keys.length; i++) {
    console.log('  ' + IMG_MAP[keys[i]] + '.png  \u2190  ' + keys[i]);
  }
  console.log('  ' + '-'.repeat(46));
  console.log('  \u652F\u6301\u683C\u5F0F: .png .jpg .jpeg .webp\n');

  var html = buildHtml();
  var hp = path.join(odir, 'document-identification.html');
  fs.writeFileSync(hp, html, 'utf-8');
  console.log('  HTML: ' + hp);

  // Print stats
  console.log('\n  \u622A\u56FE\u7EDF\u8BA1: \u5DF2\u627E\u5230 ' + imgStats.found +
    ' \u5F20, \u7F3A\u5C11 ' + imgStats.missing + ' \u5F20');
  if (imgStats.missingList.length > 0) {
    console.log('  \u7F3A\u5C11\u7684\u622A\u56FE:');
    for (var j = 0; j < imgStats.missingList.length; j++) {
      var ml = imgStats.missingList[j];
      var fn = IMG_MAP[ml] || 'unknown';
      console.log('    \u2717 ' + fn + '.png  (' + ml + ')');
    }
  }

  try {
    var pp = path.join(odir, 'doc-id-temp.pdf');
    await makePdf(hp, pp);
    var fp = path.join(odir, '\u6587\u6863\u9274\u522B\u6750\u6599.pdf');
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    fs.renameSync(pp, fp);
    console.log('\n  Final PDF: ' + fp);
  } catch (err) {
    console.error('  PDF failed: ' + err.message);
    console.log('  HTML at: ' + hp);
    console.log('  Open in browser, print to PDF.');
  }
  console.log('\n  Done!');
}
main().catch(console.error);
