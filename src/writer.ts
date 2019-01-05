import { Context, View } from './context'
import { DEFAULT_TAGS, parseTemplate, Token } from './parse-template'
import { escapeHtml, isArray, isFunction } from './utils'

/**
 * a Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
export class Writer {
  private cache: {[name: string]: any}

  constructor () {
    this.cache = {}
  }

  /**
   * Clears all cached templates in this writer.
   */
  public clearCache (): void {
    this.cache = {}
  }

  /**
   * Parses and caches the given `template` according to the given `tags` or
   * `mustache.tags` if `tags` is omitted, and returns the array of tokens
   * that is generated from the parse.
   */
  public parse (template: string, tags?: any): Token[] {
    const cache = this.cache
    const cacheKey = template + ':' + (tags || DEFAULT_TAGS).join(':')
    let tokens: Token[] | undefined = cache[cacheKey]

    if (tokens == null) {
      tokens = parseTemplate(template, tags)
      cache[cacheKey] = tokens
    }

    return tokens
  }

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer. If the optional `tags` argument is given here it must be an
   * array with two string values: the opening and closing tags used in the
   * template (e.g. [ "<%", "%>" ]). The default is to mustache.tags.
   */
  public render (template: string, view: View | Context, partials: any, tags?: any): string {
    const tokens = this.parse(template, tags)
    const context = (view instanceof Context) ? view : new Context(view)
    return this.renderTokens(tokens, context, partials, template, tags)
  }

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  public renderTokens (tokens: Token[], context: Context, partials: any, originalTemplate: string, tags?: any): string {
    let buffer = ''

    for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      let value
      const token = tokens[i]
      const symbol = token[0]

      if (symbol === '#') {
        value = this.renderSection(token, context, partials, originalTemplate)
      } else if (symbol === '^') {
        value = this.renderInverted(token, context, partials, originalTemplate)
      } else if (symbol === '>') {
        value = this.renderPartial(token, context, partials, tags)
      } else if (symbol === '&') {
        value = this.unescapedValue(token, context)
      } else if (symbol === 'name') {
        value = this.escapedValue(token, context)
      } else if (symbol === 'text') {
        value = this.rawValue(token)
      }

      if (value !== undefined) {
        buffer += value
      }
    }

    return buffer
  }

  private renderSection (token: Token, context: Context, partials: any, originalTemplate: string): string | undefined {
    const self = this
    let buffer = ''
    let value = context.lookup(token[1])

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender (template: string) {
      return self.render(template, context, partials)
    }

    if (value == null) {
      return
    }

    if (isArray(value)) {
      for (let j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4]!, context.push(value[j]), partials, originalTemplate)
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4]!, context.push(value as any), partials, originalTemplate)
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string') {
        throw new Error('Cannot use higher-order sections without the original template')
      }

      // Extract the portion of the original template that the section contains.
      value = (value as any).call(context.view, originalTemplate.slice(token[3], token[5]), subRender)

      if (value != null) {
        buffer += value
      }
    } else {
      buffer += this.renderTokens(token[4]!, context, partials, originalTemplate)
    }

    return buffer
  }

  private renderInverted (token: Token, context: Context, partials: any, originalTemplate: string): string | undefined {
    const value = context.lookup(token[1])

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value)) && value.length === 0) {
      return this.renderTokens(token[4]!, context, partials, originalTemplate)
    } else {
      return
    }
  }

  private renderPartial (token: Token, context: Context, partials: any, tags: any): string | undefined {
    if (!partials) {
      return
    }

    const value = isFunction(partials) ? partials(token[1]) : partials[token[1]]
    if (value != null) {
      return this.renderTokens(this.parse(value, tags), context, partials, value)
    } else {
      return
    }
  }

  private unescapedValue (token: Token, context: Context): string | undefined {
    const value = context.lookup(token[1])
    if (value != null) {
      return value
    } else {
      return
    }
  }

  private escapedValue (token: Token, context: Context): string | undefined {
    const value = context.lookup(token[1])
    if (value != null) {
      return escapeHtml(value)
    } else {
      return
    }
  }

  private rawValue (token: Token): string {
    return token[1]
  }
}
