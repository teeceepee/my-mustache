import { hasProperty, primitiveHasOwnProperty } from './context-utils'
import { isFunction } from './utils'

export interface View {
  [propName: string]: any
}

/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
export class Context {
  public readonly view: View
  private readonly cache: {[name: string]: any}
  private readonly parent: Context | undefined

  constructor (view: View, parentContext?: Context) {
    this.view = view
    this.cache = {'.': this.view}
    this.parent = parentContext
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  public push (view: View): Context {
    return new Context(view, this)
  }

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  public lookup (name: string): string {
    const cache = this.cache

    let value
    if (cache.hasOwnProperty(name)) {
      value = cache[name]
    } else {
      let context: Context | undefined = this
      let intermediateValue
      let lookupHit = false

      while (context != null) {
        if (name.indexOf('.') > 0) {
          intermediateValue = context.view
          const names = name.split('.')
          let index = 0

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           *
           * In the case where dot notation is used, we consider the lookup
           * to be successful even if the last "object" in the path is
           * not actually an object but a primitive (e.g., a string, or an
           * integer), because it is sometimes useful to access a property
           * of an autoboxed primitive, such as the length of a string.
           */
          while (intermediateValue != null && index < names.length) {
            if (index === names.length - 1) {
              lookupHit = (
                hasProperty(intermediateValue, names[index])
                || primitiveHasOwnProperty(intermediateValue, names[index])
              )
            }

            intermediateValue = intermediateValue[names[index]]
            index += 1
          }
        } else {
          intermediateValue = context.view[name]

          /**
           * Only checking against `hasProperty`, which always returns `false` if
           * `context.view` is not an object. Deliberately omitting the check
           * against `primitiveHasOwnProperty` if dot notation is not used.
           *
           * Consider this example:
           * ```
           * Mustache.render("The length of a football field is {{#length}}{{length}}{{/length}}.",
           *   {length: "100 yards"})
           * ```
           *
           * If we were to check also against `primitiveHasOwnProperty`, as we do
           * in the dot notation case, then render call would return:
           *
           * "The length of a football field is 9."
           *
           * rather than the expected:
           *
           * "The length of a football field is 100 yards."
           */
          lookupHit = hasProperty(context.view, name)
        }

        if (lookupHit) {
          value = intermediateValue
          break
        }

        context = context.parent
      }

      cache[name] = value
    }

    if (isFunction(value)) {
      value = value.call(this.view)
    }

    return value
  }
}
