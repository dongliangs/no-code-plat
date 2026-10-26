import type { PromptTemplate } from '@/types/ai'

/**
 * 指令模版初始集（设计文档 4.3 / 5.3）：
 * - block 粒度：生成单个物料；
 * - page 粒度：生成整页编排（1-12 个物料），经 diff 预览确认后覆盖写入画布。
 * prompt 中的 {{变量}} 为插槽，点击模版填充进输入框后由用户改写。
 */
export const promptTemplates: PromptTemplate[] = [
  {
    id: 'tpl-product-page',
    title: '产品介绍页',
    description: '标题 + 图片 + 引述 + 表单的落地页组合',
    prompt: '生成「{{产品名}}」的产品介绍页：包含超级标题、产品图片、产品引述和信息收集表单',
    granularity: 'page'
  },
  {
    id: 'tpl-dashboard',
    title: '数据看板',
    description: '超级标题 + 图表 + 视图的数据展示组合',
    prompt: '生成「{{主题}}」的数据看板：包含看板标题、数据图表和数据明细视图',
    granularity: 'page'
  },
  {
    id: 'tpl-signup-page',
    title: '活动报名页',
    description: '标题 + 引述 + 图片 + 表单的报名落地页组合',
    prompt: '生成「{{活动名}}」的活动报名页：包含活动标题、活动引述、活动海报图和报名表单',
    granularity: 'page'
  },
  {
    id: 'tpl-form',
    title: '表单收集',
    description: '单个表单物料（姓名 / 手机 / 留言）',
    prompt: '生成一个信息收集表单，包含姓名、手机号、留言三个字段',
    granularity: 'block'
  },
  {
    id: 'tpl-sales-table',
    title: '销售数据表格',
    description: 'view 物料 + 字段定义 + 模拟数据',
    prompt: '生成一个销售数据表格，包含产品、销量、销售额字段',
    granularity: 'block'
  }
]
