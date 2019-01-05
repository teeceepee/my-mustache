
export function escapeRegexp (str: string): string {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
}

// Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
// See https://github.com/janl/mustache.js/issues/189
const regExpTest = RegExp.prototype.test
function testRegExp (re: RegExp, str: string): boolean {
  return regExpTest.call(re, str)
}

const nonSpaceRe = /\S/

export function isWhitespace (str: string): boolean {
  return !testRegExp(nonSpaceRe, str)
}
