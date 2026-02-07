declare const SRC: string

declare module "inline:*" {
  const content: string
  export default content
}

declare module "*.scss" {
  const content: string
  export default content
}

declare module "*.blp" {
  const content: string
  export default content
}

declare module "*.css" {
  const content: string
  export default content
}


//para que webView funcione
export {}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: any;
    }
  }
}

