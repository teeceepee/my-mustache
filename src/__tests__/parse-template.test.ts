import { parseTemplate } from '../parse-template'

describe('Mustache parseTemplate', () => {
  test('parseTemplate', () => {
    const templateStr = '<h1>{{title}}</h1><h2>{{{title}}}</h2>'
    const tokens = parseTemplate(templateStr)

    expect(tokens.length).toBe(5)

    const expectedTypes = ['text', 'name', 'text', '&', 'text']
    for (let i = 0; i < expectedTypes.length; i++) {
      expect(tokens[i][0]).toBe(expectedTypes[i])
    }
  })
})
