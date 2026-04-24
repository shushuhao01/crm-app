/**
 * 软著申请 - 源代码整理脚本
 *
 * 功能：按推荐顺序拼接 crmAPP/src 下的源代码文件，
 *       自动生成前30页（前1500行）和后30页（后1500行）的文本文件。
 *
 * 使用方式：
 *   cd crmAPP
 *   node scripts/generate-copyright-code.js
 *
 * 输出文件：
 *   crmAPP/docs/软著-源代码-前30页.txt
 *   crmAPP/docs/软著-源代码-后30页.txt
 *   crmAPP/docs/软著-源代码-完整.txt
 */

const fs = require('fs')
const path = require('path')

// 软件名称（用于页眉标注）
const SOFTWARE_NAME = '云客CRM外呼助手软件 V1.0.0'

// 每页行数
const LINES_PER_PAGE = 50

// 总页数（前30 + 后30）
const PAGES_FRONT = 30
const PAGES_BACK = 30

// 前后各需要的行数
const LINES_FRONT = PAGES_FRONT * LINES_PER_PAGE  // 1500
const LINES_BACK = PAGES_BACK * LINES_PER_PAGE    // 1500

// 源代码文件拼接顺序（从入口开始，按模块逻辑排列）
const FILE_ORDER = [
  // 核心入口
  'main.ts',
  'App.vue',
  'config/app.ts',

  // API接口层
  'api/auth.ts',
  'api/call.ts',

  // 服务层
  'services/websocket.ts',
  'services/callStateService.ts',
  'services/recordingService.ts',

  // 状态管理
  'stores/index.ts',
  'stores/server.ts',
  'stores/user.ts',
  'stores/call.ts',

  // 工具函数
  'utils/request.ts',
  'utils/device.ts',
  'utils/format.ts',
  'utils/crypto.ts',

  // 公共组件
  'components/AudioPlayer.vue',
  'components/Dialpad.vue',

  // 页面文件（按功能流程排列）
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

// src 目录路径
const srcDir = path.join(__dirname, '..', 'src')
const docsDir = path.join(__dirname, '..', 'docs')

// 确保 docs 目录存在
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true })
}

/**
 * 去除多余的连续空行（连续空行只保留一行）
 */
function removeExcessiveBlankLines(lines) {
  const result = []
  let lastWasBlank = false

  for (const line of lines) {
    const isBlank = line.trim() === ''
    if (isBlank && lastWasBlank) {
      continue // 跳过连续空行
    }
    result.push(line)
    lastWasBlank = isBlank
  }

  return result
}

/**
 * 遮蔽敏感信息
 */
function maskSensitiveInfo(content) {
  // 遮蔽可能的API密钥
  content = content.replace(/(['"])(sk-|ak-|key-)[a-zA-Z0-9]{20,}(['"])/g, '$1***$3')
  // 遮蔽可能的密码字段值
  content = content.replace(/(password\s*[:=]\s*['"])[^'"]+(['"])/gi, '$1***$2')
  return content
}

/**
 * 读取并处理单个文件
 */
function processFile(relativePath) {
  const fullPath = path.join(srcDir, relativePath)

  if (!fs.existsSync(fullPath)) {
    console.warn(`  [警告] 文件不存在: ${relativePath}`)
    return []
  }

  let content = fs.readFileSync(fullPath, 'utf-8')
  content = maskSensitiveInfo(content)

  const lines = content.split('\n')
  const cleanedLines = removeExcessiveBlankLines(lines)

  // 添加文件路径注释
  const header = `// 文件: src/${relativePath}`
  const separator = '// ' + '-'.repeat(60)

  return [separator, header, separator, ...cleanedLines, '']
}

// 主流程
console.log('='.repeat(60))
console.log(`  软著源代码整理脚本`)
console.log(`  软件名称: ${SOFTWARE_NAME}`)
console.log('='.repeat(60))
console.log()

// 拼接所有文件
let allLines = []
let fileStats = []

for (const filePath of FILE_ORDER) {
  const lines = processFile(filePath)
  if (lines.length > 0) {
    const lineCount = lines.filter(l => l.trim() !== '').length
    fileStats.push({ file: filePath, lines: lineCount })
    console.log(`  [OK] ${filePath} (${lineCount} 行有效代码)`)
    allLines = allLines.concat(lines)
  }
}

const totalLines = allLines.length
const effectiveLines = allLines.filter(l => l.trim() !== '').length

console.log()
console.log('-'.repeat(60))
console.log(`  总行数: ${totalLines}`)
console.log(`  有效代码行数: ${effectiveLines}`)
console.log(`  文件数: ${fileStats.length}`)
console.log('-'.repeat(60))
console.log()

// 生成前30页
const frontLines = allLines.slice(0, LINES_FRONT)
const frontContent = [
  `/* 页眉: ${SOFTWARE_NAME} */`,
  `/* 源代码鉴别材料 - 前30页 (第1-30页) */`,
  '',
  ...frontLines
].join('\n')

// 生成后30页
const backLines = allLines.slice(-LINES_BACK)
const backContent = [
  `/* 页眉: ${SOFTWARE_NAME} */`,
  `/* 源代码鉴别材料 - 后30页 (第31-60页) */`,
  '',
  ...backLines
].join('\n')

// 生成完整文件
const fullContent = [
  `/* 页眉: ${SOFTWARE_NAME} */`,
  `/* 源代码鉴别材料 - 完整版 */`,
  `/* 总行数: ${totalLines} | 有效代码行数: ${effectiveLines} | 文件数: ${fileStats.length} */`,
  '',
  ...allLines
].join('\n')

// 写入文件
const frontPath = path.join(docsDir, '软著-源代码-前30页.txt')
const backPath = path.join(docsDir, '软著-源代码-后30页.txt')
const fullPath = path.join(docsDir, '软著-源代码-完整.txt')

fs.writeFileSync(frontPath, frontContent, 'utf-8')
fs.writeFileSync(backPath, backContent, 'utf-8')
fs.writeFileSync(fullPath, fullContent, 'utf-8')

console.log(`  [输出] 前30页: ${frontPath}`)
console.log(`  [输出] 后30页: ${backPath}`)
console.log(`  [输出] 完整版: ${fullPath}`)
console.log()

// 输出统计摘要
console.log('='.repeat(60))
console.log('  统计摘要')
console.log('='.repeat(60))
console.log(`  前30页实际行数: ${frontLines.length} (需要 ${LINES_FRONT})`)
console.log(`  后30页实际行数: ${backLines.length} (需要 ${LINES_BACK})`)

if (totalLines < LINES_FRONT + LINES_BACK) {
  console.log()
  console.log('  [提示] 总代码行数不足3000行（60页），')
  console.log('  前后30页可能存在重叠。如果总代码不足60页，')
  console.log('  可以提交全部源代码，无需凑满60页。')
}

if (totalLines >= LINES_FRONT + LINES_BACK) {
  console.log()
  console.log('  [OK] 代码量充足，前后30页无重叠。')
}

console.log()
console.log('  完成! 请将生成的文本文件内容复制到Word中，')
console.log('  设置页眉页脚后导出PDF即可。')
console.log()
console.log(`  页眉内容: ${SOFTWARE_NAME}`)
console.log('  页脚内容: 第 X 页 共 60 页')
console.log()

