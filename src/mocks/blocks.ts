import type { BlockInfo } from '@/types/block'

export const blocks: BlockInfo[] = [
  {
    id: '1',
    type: 'quote',
    label: '引述',
    props: {
      content: '引述文本 quote',
      status: 'success'
    }
  },
  {
    id: '2',
    type: 'chart',
    label: '图表',
    props: {
      content: '图表',
      chartType: 'echarts'
    }
  },
  {
    id: '3',
    type: 'notes',
    label: '笔记',
    props: {
      content: `
          <p>I’m <em>running</em> Tiptap <s>with</s> Vue.js. 🎉</p>
          <p><strong>You</strong> can also teach the editor new things. For example to recognize hex colors and add a color</p>
          <p> swatch on the fly: #FFF, #0D0D0D, #616161, #A975FF, #FB5151, #FD9170, #FFCB6B, #68CEF8, #80cbc4, #9DEF8F </p>
        `
    }
  },
  {
    id: '4',
    type: 'heroTitle',
    label: '标题',
    props: {
      content: '标题'
    }
  },
  {
    id: '5',
    type: 'image',
    label: '图片',
    props: {
      url: 'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=1600'
    }
  },
  {
    id: '6',
    type: 'view',
    label: '视图',
    props: {
      fields: {
        'id': {
          type: 'text',

        },

      },
      fieldProps:[],
      data:[]
    }
  },
  {
    id: '7',
    type: 'button',
    label: '按钮',
    props: {
      content: '按钮'
    }
  },
  {
    id: '8',
    type: 'form',
    label: '表单',
    props: {
      fields: []
    }
  }
]
