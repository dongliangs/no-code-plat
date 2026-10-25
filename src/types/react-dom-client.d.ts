// react-dom 19.3.1 安装产物未自带类型声明（无 client.d.ts），
// 此处为 DataSourceContent.vue 中 `createRoot` 的最小类型声明。
declare module 'react-dom/client' {
  export interface Root {
    render(children: unknown): void
    unmount(): void
  }
  export function createRoot(
    container: Element | DocumentFragment,
    options?: unknown
  ): Root
}
