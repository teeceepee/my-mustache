import { clearCache, escape, name, parse, render, tags, version } from '../index'

describe('Mustache metadata', () => {
  test('name', () => {
    expect(name).toBe('mustache.js')
  })

  test('version', () => {
    expect(version).toBe('3.0.1')
  })

  test('tags', () => {
    expect(tags).toEqual(['{{', '}}'])
  })
})

describe('Mustache functions', () => {
  test('clearCache', () => {
    expect(clearCache()).toBeUndefined()
  })

  test('escape', () => {
    expect(escape('<')).toBe('&lt;')
  })

  test('parse', () => {
    const str = '<h1>{{title}}</h1>'
    expect(parse(str).length).toBe(3)
  })

  test('render', () => {
    const str = '<h1>{{title}}</h1>'
    const view = {title: 'test render'}

    expect(render(str, view)).toBe('<h1>test render</h1>')
  })
})
