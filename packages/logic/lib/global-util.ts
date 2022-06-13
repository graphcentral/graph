import { to } from "await-to-js"
import { serializeError } from "serialize-error"

console.log(to)
/**
 * await-to-js wrapper to enable serializing the error to
 * a normal javascript object
 */
export async function toEnhanced<Result, Err = Error>(
  p: Promise<Result>
): Promise<
  [ReturnType<typeof serializeError> | Err | null, Result | undefined]
> {
  const [err, result] = await to<Result, Err>(p)

  return [serializeError(err), result]
}
