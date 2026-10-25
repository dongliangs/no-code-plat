import type { BlockInfo, BlockType } from '@/types/block'
import {
  ChartLine,
  Form,
  HamburgerButton,
  Notes,
  Quote,
  Table,
  TitleLevel,
  ImageFiles
} from '@icon-park/vue-next'
import type { Icon } from '@icon-park/vue-next/lib/runtime'
import { nanoid } from 'nanoid'
export const blocksBaseMetaList: { type: BlockType; label: string; icon: Icon }[] = [
  {
    type: 'quote',
    label: '引述',
    icon: Quote
  },
  {
    type: 'notes',
    label: '笔记',
    icon: Notes
  },
  {
    type: 'heroTitle',
    label: '超级标题',
    icon: TitleLevel
  },
  { type: 'image', label: '图片', icon: ImageFiles },
  {
    type: 'view',
    label: '视图',
    icon: Table
  },
  {
    type: 'chart',
    label: '图表',
    icon: ChartLine
  },
  {
    type: 'button',
    label: '按钮',
    icon: HamburgerButton
  },
  {
    type: 'form',
    label: '表单',
    icon: Form
  }
]

export const blocksBaseMeta = Object.fromEntries(
  blocksBaseMetaList.map((item) => [item.type, item])
)

export const getBlocksDefaultData = (type: BlockType): BlockInfo => {
  const id = nanoid()
  switch (type) {
    case 'quote':
      return {
        id,
        type: 'quote',
        label: '引述',
        props: {
          content: '引述文本 quote',
          status: 'success'
        }
      }
    case 'notes':
      return {
        id,
        type: 'notes',
        label: '笔记',
        props: {
          content: `
          <p>I’m <em>running</em> Tiptap <s>with</s> Vue.js. 🎉</p>
          <p><strong>You</strong> can also teach the editor new things. For example to recognize hex colors and add a color</p>
          <p> swatch on the fly: #FFF, #0D0D0D, #616161, #A975FF, #FB5151, #FD9170, #FFCB6B, #68CEF8, #80cbc4, #9DEF8F </p>
        `
        }
      }
    case 'heroTitle':
      return {
        id,
        type: 'heroTitle',
        label: '标题',
        props: {
          content: '标题'
        }
      }
    case 'image':
      return {
        id,
        type: 'image',
        label: '图片',
        props: {
          url: 'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=1600'
        }
      }
    case 'view':
      return {
        id,
        type: 'view',
        label: '视图',
        props: {
          fields: {
            id: {
              type: 'text'
            }
          },
          fieldProps: [],
          data: []
        }
      }
    case 'chart':
      return {
        id,
        type: 'chart',
        label: '图表',
        props: {
          chartType: 'echarts'
        }
      }
    case 'button':
      return {
        id,
        type: 'button',
        label: '按钮',
        props: {
          content: '按钮'
        }
      }
    case 'form':
      return {
        id,
        type: 'form',
        label: '表单',
        props: {
          fields: []
        }
      }
  }
}