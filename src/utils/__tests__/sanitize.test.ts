// @vitest-environment jsdom
// 注意：须用 jsdom 而非 happy-dom —— DOMPurify 的节点遍历依赖 NodeIterator，
// vitest 内置 happy-dom 版本对其实现不完整，会出现标签误删/漏删（生产浏览器不受影响）
import { validateBlocks } from '@/utils/validateBlock'
import { sanitizeHtml } from '@/utils/sanitize'
import { describe, expect, it } from 'vitest'

// DOMPurify 清洗（设计文档 7.2.3 安全加固）：XSS payload 拦截 + 合法富文本保留
describe('sanitizeHtml notes HTML 清洗', () => {
  it('剥离 script 标签', () => {
    const out = sanitizeHtml('<p>正常内容</p><script>alert(1)</script>')
    expect(out).toContain('正常内容')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert')
  })

  it('剥离事件属性（onerror / onclick）', () => {
    const out = sanitizeHtml('<img src="https://example.com/a.png" onerror="alert(1)">')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('alert')
    // 合法 src 保留
    expect(out).toContain('https://example.com/a.png')
  })

  it('拦截 javascript: 协议链接，保留 http 链接', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">点我</a><a href="https://example.com">官网</a>')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('https://example.com')
  })

  it('仅放行 http / https / data:image 协议', () => {
    expect(sanitizeHtml('<img src="data:image/png;base64,iVBOR">')).toContain('data:image/png')
    expect(sanitizeHtml('<img src="ftp://evil.com/x.png">')).not.toContain('ftp:')
  })

  it('剥离 style 属性与非白名单属性', () => {
    const out = sanitizeHtml('<p style="position:fixed" onclick="x()" class="note">文本</p>')
    expect(out).not.toContain('style')
    expect(out).not.toContain('onclick')
    expect(out).toContain('文本')
  })

  it('保留白名单内的合法富文本结构', () => {
    const html = '<h2>标题</h2><p>段落含 <strong>加粗</strong>、<em>斜体</em>、<s>删除</s></p><ul><li>列表项</li></ul><blockquote><p>引用</p></blockquote>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('空值直接返回空串', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

// 校验管道集成：恶意 notes content 过管道被清洗（覆盖 block / page 两条生成链路）
describe('validateBlocks notes XSS 清洗集成', () => {
  it('notes 物料的恶意 content 被清洗并记入 repairs', () => {
    const raw = [
      {
        id: 'n1',
        type: 'notes',
        label: '笔记',
        props: { content: '<p>笔记内容</p><img src=x onerror=alert(1)><script>steal()</script>' }
      }
    ]
    const result = validateBlocks(raw)
    expect(result.blocks).toHaveLength(1)
    const content = result.blocks[0].props.content as string
    expect(content).toContain('笔记内容')
    expect(content).not.toContain('onerror')
    expect(content).not.toContain('script')
    expect(result.repairs.some((r) => r.includes('已清洗'))).toBe(true)
  })

  it('heroTitle 等纯文本物料的 content 不做 HTML 清洗', () => {
    const raw = [
      { id: 'h1', type: 'heroTitle', label: '标题', props: { content: '<img src=x onerror=alert(1)>' } }
    ]
    const result = validateBlocks(raw)
    // heroTitle 以纯文本渲染，保留原文（不进 v-html / 富文本链路）
    expect(result.blocks[0].props.content).toBe('<img src=x onerror=alert(1)>')
    expect(result.repairs.some((r) => r.includes('已清洗'))).toBe(false)
  })
})
