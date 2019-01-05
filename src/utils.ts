
const objectToString = Object.prototype.toString
export const isArray = Array.isArray || function isArrayPolyfill (object): boolean {
  return objectToString.call(object) === '[object Array]'
}

export function isFunction (object: any): boolean {
  return typeof object === 'function'
}

/**
 * More correct typeof string handling array
 * which normally returns typeof 'object'
 */
export function typeStr (obj: any): string {
  return isArray(obj) ? 'array' : typeof obj
}

// @ts-ignore
const entityMap: {[entity: string]: string} = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  /* tslint:disable-next-line */
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

export function escapeHtml (str: string): string {
  return String(str).replace(/[&<>"'`=\/]/g,  (s: string): string => {
    return entityMap[s]
  })
}
