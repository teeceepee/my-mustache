
/**
 * Null safe way of checking whether or not an object,
 * including its prototype, has a given property.
 */
export function hasProperty (obj: any, propName: string): boolean {
  return obj != null && typeof obj === 'object' && (propName in obj)
}

/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 */
export function primitiveHasOwnProperty (primitive: any, propName: string): boolean {
  return (
    primitive != null
    && typeof primitive !== 'object'
    && primitive.hasOwnProperty
    && primitive.hasOwnProperty(propName)
  )
}
