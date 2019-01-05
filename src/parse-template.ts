import { escapeRegexp, isWhitespace } from './parse-template-utils'
import { Scanner } from './scanner'
import { isArray } from './utils'

type TokenType = 'text' | 'name' | '#' | '^' | '/' | '>' | '{' | '&' | '=' | '!'
export type Token = [TokenType, string, number, number, any[]?, number?]

export const DEFAULT_TAGS = ['{{', '}}']

const whiteRe = /\s*/
const equalsRe = /\s*=/
const curlyRe = /\s*\}/
const tagRe = /#|\^|\/|>|\{|&|=|!/

export function parseTemplate (template: string, tags?: any): Token[] {
  if (!template) {
    return []
  }

  const sections: Token[] = []
  const tokens: Token[] = [] // Buffer to hold the tokens
  let spaces: number[] = []
  let hasTag = false
  let nonSpace = false

  // Strips all whitespace tokens array for the current line
  // if there was a {{#tag}} on it and otherwise only space.
  function stripSpace () {
    if (hasTag && !nonSpace) {
      while (spaces.length > 0) {
        const poppedIndex = spaces.pop()
        if (poppedIndex != null) {
          delete tokens[poppedIndex]
        }
      }
    } else {
      spaces = []
    }

    hasTag = false
    nonSpace = false
  }

  let { openingTagRe, closingTagRe, closingCurlyRe } = compileTags(tags || DEFAULT_TAGS)

  const scanner = new Scanner(template)

  while (!scanner.eos()) {
    let start: number = scanner.pos

    // Match any text between tags.
    let value: string = scanner.scanUntil(openingTagRe)

    if (value.length > 0) {
      for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
        const chr: string = value.charAt(i)

        if (isWhitespace(chr)) {
          spaces.push(tokens.length)
        } else {
          nonSpace = true
        }

        tokens.push(['text', chr, start, start + 1])
        start += 1

        // Check for whitespace on the current line.
        if (chr === '\n') {
          stripSpace()
        }
      }
    }

    // Match the opening tag.
    if (scanner.scan(openingTagRe).length === 0) {
      break
    }

    hasTag = true

    // Get the tag type.
    let type: TokenType = (scanner.scan(tagRe) || 'name') as TokenType
    scanner.scan(whiteRe)

    // Get the tag value.
    if (type === '=') {
      value = scanner.scanUntil(equalsRe)
      scanner.scan(equalsRe)
      scanner.scanUntil(closingTagRe)
    } else if (type === '{') {
      value = scanner.scanUntil(closingCurlyRe)
      scanner.scan(curlyRe)
      scanner.scanUntil(closingTagRe)
      type = '&'
    } else {
      value = scanner.scanUntil(closingTagRe)
    }

    // Match the closing tag.
    if (scanner.scan(closingTagRe).length === 0) {
      throw new Error('Unclosed tag at ' + scanner.pos)
    }

    const token: Token = [type, value, start, scanner.pos]
    tokens.push(token)

    if (type === '#' || type === '^') {
      sections.push(token)
    } else if (type === '/') {
      // Check section nesting.
      const openSection = sections.pop()

      if (openSection == null) {
        throw new Error('Unopened section "' + value + '" at ' + start)
      }

      if (openSection[1] !== value) {
        throw new Error('Unclosed section "' + value + '" at ' + start)
      }
    } else if (type === '=') {
      // Set the tags for the next time around
      const compileResult = compileTags(value)
      openingTagRe = compileResult.openingTagRe
      closingTagRe = compileResult.closingTagRe
      closingCurlyRe = compileResult.closingCurlyRe
    }
  }

  // Make sure there are no open sections when we're done.
  const unclosedSection = sections.pop()

  if (unclosedSection != null) {
    throw new Error('Unclosed section "' + unclosedSection[1] + '" at ' + scanner.pos)
  }

  return nestTokens(squashTokens(tokens))
}

// compileTags begin
const spaceRe = /\s+/

interface CompileTagsResult {
  openingTagRe: RegExp
  closingTagRe: RegExp
  closingCurlyRe: RegExp
}

function compileTags (tagsToCompile: string | string[]): CompileTagsResult {
  if (typeof tagsToCompile === 'string') {
    tagsToCompile = tagsToCompile.split(spaceRe, 2)
  }

  if (!isArray(tagsToCompile) || tagsToCompile.length !== 2) {
    throw new Error('Invalid tags: ' + tagsToCompile)
  }

  const openingTagRe = new RegExp(escapeRegexp(tagsToCompile[0]) + '\\s*')
  const closingTagRe = new RegExp('\\s*' + escapeRegexp(tagsToCompile[1]))
  const closingCurlyRe = new RegExp('\\s*' + escapeRegexp('}' + tagsToCompile[1]))

  return {
    closingCurlyRe,
    closingTagRe,
    openingTagRe,
  }
}
// compileTags end

/**
 * Combines the values of consecutive text tokens in the given `tokens` array
 * to a single token.
 */
function squashTokens (tokens: Token[]): Token[] {
  const squashedTokens: Token[] = []

  let lastToken: Token | null = null
  for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    const token = tokens[i]

    if (token != null) {
      if (token[0] === 'text' && lastToken != null && lastToken[0] === 'text') {
        lastToken[1] += token[1]
        lastToken[3] = token[3]
      } else {
        squashedTokens.push(token)
        lastToken = token
      }
    }
  }

  return squashedTokens
}

/**
 * Forms the given array of `tokens` into a nested tree structure where
 * tokens that represent a section have two additional items: 1) an array of
 * all tokens that appear in that section and 2) the index in the original
 * template that represents the end of that section.
 * @param tokens
 */
function nestTokens (tokens: Token[]): Token[] {
  const nestedTokens: Token[] = []
  let collector: Token[] = nestedTokens
  const sections: Token[] = []

  for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    const token = tokens[i]

    switch (token[0]) {
      case '#':
      case '^':
        collector.push(token)
        sections.push(token)
        collector = []
        token[4] = []
        break
      case '/':
        const section = sections.pop()
        if (section != null) {
          section[5] = token[2]
        }
        collector = sections.length > 0 ? (sections[sections.length - 1][4] as Token[]) : nestedTokens
        break
      default:
        collector.push(token)
    }
  }

  return nestedTokens
}
