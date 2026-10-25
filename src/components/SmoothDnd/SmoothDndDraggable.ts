import { defineComponent, h, renderSlot } from 'vue'
import { constants } from 'smooth-dnd'
import { getTagProps, validateTagProp } from './utils'

export const SmoothDndDraggable = defineComponent({
  name: 'SmoothDndDraggable',
  props: {
    tag: {
      validator: validateTagProp,
      default: 'div'
    }
  },
  render: function () {
    //wrap child
    const tagProps = getTagProps(this, constants.wrapperClass)
    return h(tagProps.value, Object.assign({}, tagProps.props), renderSlot(this.$slots, 'default'))
  }
})
