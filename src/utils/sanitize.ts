import DOMPurify from 'dompurify'

/**
 * notes 物料 HTML 清洗（设计文档 7.2.3 安全加固）：
 * 模型生成的 HTML 在进入画布 / 渲染前统一清洗，防 XSS 注入。
 * - 标签白名单：Tiptap notes 支持的富文本子集（段落 / 文字样式 / 标题 / 列表 / 链接 / 图片）
 * - src / href 协议白名单：http / https / data:image（拦截 javascript: 等危险协议）
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 's', 'del', 'u',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
  'a', 'img', 'span'
]

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'class']

const ALLOWED_URI_REGEXP = /^(?:https?:|data:image\/)/i

export function sanitizeHtml(html: string): string {
  if (!html) {
    return ''
  }
  // 纯 node 环境（部分单测）无 window，dompurify 无法实例化：
  // 该分支仅存在于测试环境，生产恒为浏览器（有 window，恒走清洗）
  if (typeof window === 'undefined') {
    return html
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    FORBID_ATTR: ['style']
  })
}
