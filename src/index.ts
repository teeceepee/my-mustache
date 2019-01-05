import { View } from './context'
import { DEFAULT_TAGS, Token } from './parse-template'
import { typeStr } from './utils'
import { Writer } from './writer'

export const name = 'mustache.js'
export const version = '3.0.1'
export const tags = DEFAULT_TAGS

// All high-level mustache.* functions use this writer.
const defaultWriter = new Writer()

export function clearCache (): void {
  return defaultWriter.clearCache()
}

export function parse (template: string, templateTags?: any): Token[] {
  return defaultWriter.parse(template, templateTags)
}

export function render (template: any, view: View, partials?: any, templateTags?: any): string {
  if (typeof template !== 'string') {
    throw new TypeError(
      'Invalid template! Template should be a "string" ' +
      'but "' + typeStr(template) + '" was given as the first ' +
      'argument for mustache#render(template, view, partials)')
  }

  return defaultWriter.render(template, view, partials, templateTags)
}

// Export the escaping function so that the user may override it.
// See https://github.com/janl/mustache.js/issues/244
export { escapeHtml as escape } from './utils'

// Export these mainly for testing, but also for advanced usage.
export { Scanner } from './scanner'
export { Context } from './context'
export { Writer } from './writer'
