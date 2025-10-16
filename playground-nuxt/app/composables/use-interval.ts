import { onMounted, onUnmounted } from 'vue'

export function useInterval(callback: () => void, delay: number | null) {
  let id: number

  onMounted(() => {
    if (delay === null) {
      return
    }

    id = setInterval(callback, delay)
  })

  onUnmounted(() => {
    clearInterval(id)
  })
}
