/**
 * 软著申请 - 程序鉴别材料 PDF 生成脚本
 *
 * 生成符合软件著作权申请要求的源代码PDF文档
 * 前30页 + 后30页 = 共60页，每页50行代码
 *
 * 使用方式：cd crmAPP && node scripts/generate-code-pdf.js
 */

const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const SOFTWARE_NAME = '云客CRM外呼助手软件 V1.0.0'
const LINES_PER_PAGE = 50
const TOTAL_PAGES = 60
const FRONT_PAGES = 30
const BACK_PAGES = 30

// Edge 浏览器路径
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

// 源代码文件拼接顺序
const FILE_ORDER = [
  'main.ts',
  'App.vue',
  'config/app.ts',
  'api/auth.ts',
  'api/call.ts',
  'services/websocket.ts',
  'services/callStateService.ts',
  'services/recordingService.ts',
  'stores/index.ts',
  'stores/server.ts',
  'stores/user.ts',
  'stores/call.ts',
  'utils/request.ts',
  'utils/device.ts',
  'utils/format.ts',
  'utils/crypto.ts',
  'components/AudioPlayer.vue',
  'components/Dialpad.vue',
  'pages/splash/index.vue',
  'pages/server-config/index.vue',
  'pages/login/index.vue',
  'pages/index/index.vue',
  'pages/scan/index.vue',
  'pages/dialpad/index.vue',
  'pages/calling/index.vue',
  'pages/call-ended/index.vue',
  'pages/call-detail/index.vue',
  'pages/calls/index.vue',
  'pages/stats/index.vue',
  'pages/settings/index.vue',
  'pages/about/index.vue',
  'pages/agreement/user-agreement.vue',
  'pages/agreement/privacy-policy.vue',
]

const srcDir = path.join(__dirname, '..', 'src')
const docsDir = path.join(__dirname, '..', 'docs')

function removeExcessiveBlankLines(lines) {
  const result = []
  let lastWasBlank = false
  for (const line of lines) {
    const isBlank = line.trim() === ''
    if (isBlank && lastWasBlank) continue
    result.push(line)
    lastWasBlank = isBlank
  }
  return result
}

function maskSensitiveInfo(content) {
  content = content.replace(/(['"])(sk-|ak-|key-)[a-zA-Z0-9]{20,}(['"])/g, '$1***$3')
  content = content.replace(/(password\s*[:=]\s*['"])[^'"]+(['"])/gi, '$1***$2')
  return content
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncateLine(line, maxLen) {
  if (line.length > maxLen) {
    return line.substring(0, maxLen)
  }
  return line
}

function processFile(relativePath) {
  const fullPath = path.join(srcDir, relativePath)
  if (!fs.existsSync(fullPath)) {
    console.warn('  [WARN] File not found:', relativePath)
    return []
  }
  let content = fs.readFileSync(fullPath, 'utf-8')
  content = maskSensitiveInfo(content)
  const lines = content.split('\n')
  const cleanedLines = removeExcessiveBlankLines(lines)
  const header = '// -------- file: src/' + relativePath + ' --------'
  return [header, ...cleanedLines, '']
}

function buildPageHtml(lines, pageNumber) {
  const escapedLines = lines.map(l => escapeHtml(truncateLine(l, 95)))
  const codeContent = escapedLines.join('\n')
  return '<div class="page"><pre>' + codeContent + '</pre></div>'
}

function generateHtml(pages) {
  let pagesHtml = ''
  for (let i = 0; i < pages.length; i++) {
    pagesHtml += buildPageHtml(pages[i], i + 1)
  }

  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n' +
    '<title>' + SOFTWARE_NAME + ' - 程序鉴别材料</title>\n' +
    '<style>\n' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    '@page { size: A4; margin: 0; }\n' +
    'body { font-family: "SimSun", "Songti SC", serif; }\n' +
    '.page {\n' +
    '  width: 210mm;\n' +
    '  height: 297mm;\n' +
    '  padding: 30mm 20mm 25mm 25mm;\n' +
    '  page-break-after: always;\n' +
    '  overflow: hidden;\n' +
    '  position: relative;\n' +
    '}\n' +
    '.page:last-child { page-break-after: auto; }\n' +
    'pre {\n' +
    '  font-family: "Consolas", "Courier New", monospace;\n' +
    '  font-size: 9.5pt;\n' +
    '  line-height: 1.38;\n' +
    '  white-space: pre;\n' +
    '  word-wrap: normal;\n' +
    '  overflow: hidden;\n' +
    '  margin: 0;\n' +
    '}\n' +
    '</style>\n</head>\n<body>\n' +
    pagesHtml +
    '\n</body>\n</html>'
}

async function generatePdf(htmlPath, pdfPath) {
  console.log('  Launching Edge browser...')
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

  const headerHtml = '<div style="font-size:9pt;font-family:SimSun,serif;width:100%;text-align:center;padding-top:5mm;">' + SOFTWARE_NAME + '</div>'
  const footerHtml = '<div style="font-size:9pt;font-family:SimSun,serif;width:100%;text-align:center;padding-bottom:3mm;">' +
    '\u7B2C <span class="pageNumber"></span> \u9875 \u5171 <span class="totalPages"></span> \u9875</div>'

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: headerHtml,
    footerTemplate: footerHtml,
    margin: {
      top: '25mm',
      bottom: '20mm',
      left: '25mm',
      right: '20mm'
    }
  })

  await browser.close()
  console.log('  PDF generated:', pdfPath)
}

async function main() {
  console.log('='.repeat(60))
  console.log('  Program Identification Material Generator')
  console.log('  ' + SOFTWARE_NAME)
  console.log('='.repeat(60))

  // Step 1: Read and concatenate source files
  let allLines = []
  for (const filePath of FILE_ORDER) {
    const lines = processFile(filePath)
    if (lines.length > 0) {
      console.log('  [OK] ' + filePath + ' (' + lines.length + ' lines)')
      allLines = allLines.concat(lines)
    }
  }

  console.log('\n  Total lines: ' + allLines.length)

  // Step 2: Extract front 1500 lines and back 1500 lines
  const frontLines = allLines.slice(0, FRONT_PAGES * LINES_PER_PAGE)
  const backLines = allLines.slice(-(BACK_PAGES * LINES_PER_PAGE))

  console.log('  Front lines: ' + frontLines.length)
  console.log('  Back lines: ' + backLines.length)

  // Step 3: Split into pages of 50 lines each
  const pages = []

  // Front 30 pages
  for (let i = 0; i < FRONT_PAGES; i++) {
    const start = i * LINES_PER_PAGE
    const end = start + LINES_PER_PAGE
    const pageLines = frontLines.slice(start, end)
    while (pageLines.length < LINES_PER_PAGE) {
      pageLines.push('')
    }
    pages.push(pageLines)
  }

  // Back 30 pages
  for (let i = 0; i < BACK_PAGES; i++) {
    const start = i * LINES_PER_PAGE
    const end = start + LINES_PER_PAGE
    const pageLines = backLines.slice(start, end)
    while (pageLines.length < LINES_PER_PAGE) {
      pageLines.push('')
    }
    pages.push(pageLines)
  }

  console.log('  Total pages: ' + pages.length)

  // Step 4: Generate HTML
  const html = generateHtml(pages)
  const htmlPath = path.join(docsDir, 'program-identification.html')
  fs.writeFileSync(htmlPath, html, 'utf-8')
  console.log('\n  HTML saved: ' + htmlPath)

  // Step 5: Generate PDF
  const pdfPath = path.join(docsDir, 'program-identification.pdf')
  try {
    await generatePdf(htmlPath, pdfPath)
    // Rename to Chinese name
    const finalPath = path.join(docsDir, '\u7A0B\u5E8F\u9274\u522B\u6750\u6599.pdf')
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath)
    fs.renameSync(pdfPath, finalPath)
    console.log('  Final PDF: ' + finalPath)
  } catch (err) {
    console.error('  PDF generation failed:', err.message)
    console.log('  HTML file is available at:', htmlPath)
    console.log('  You can open it in a browser and print to PDF manually.')
  }

  console.log('\n  Done!')
}

main().catch(console.error)

