/**
 * A simple string scanner that is used by the template parser to find
 * tokens in template strings.
 */
export class Scanner {
  public pos: number
  private readonly string: string
  private tail: string

  constructor (str: string) {
    this.string = str
    this.tail = str
    this.pos = 0
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  public eos (): boolean {
    return this.tail === ''
  }

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  public scan (re: RegExp): string {
    const match = this.tail.match(re)

    if (match == null || match.index !== 0) {
      return ''
    }

    const str = match[0]

    this.tail = this.tail.substring(str.length)
    this.pos += str.length

    return str
  }

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  public scanUntil (re: RegExp): string {
    const index = this.tail.search(re)
    let match: string

    switch (index) {
      case -1:
        match = this.tail
        this.tail = ''
        break
      case 0:
        match = ''
        break
      default:
        match = this.tail.substring(0, index)
        this.tail = this.tail.substring(index)
        break
    }

    this.pos += match.length

    return match
  }
}
