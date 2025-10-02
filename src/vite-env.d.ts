/// <reference types="vite/client" />

// Declare module types for asset imports
declare module '*.hdr' {
  const content: string;
  export default content;
}

declare module '*.obj' {
  const content: string;
  export default content;
}

