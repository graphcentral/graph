export function identifyObjectTitle(obj: any): string {
  if (obj.object === `database`) {
    // @ts-ignore
    return obj.title?.[0].plain_text
  } else if (obj.object === `page`) {
    // @ts-ignore
    return (
      obj.properties?.Name?.title?.[0].plain_text ??
      obj.properties?.title?.title?.[0].plain_text
    )
  }

  throw new Error(`should never get here`)
}

/**
 *
 * @param maybe_without_dash 1429989fe8ac4effbc8f57f56486db54
 * @returns 1429989f-e8ac-4eff-bc8f-57f56486db54
 */
export function separateIdWithDashSafe(maybe_without_dash: string): string {
  if (isIdAlreadySeparateByDash(maybe_without_dash)) {
    return maybe_without_dash
  }

  if (maybe_without_dash.length != 32) {
    throw new Error(`Incorrect length of id: ${maybe_without_dash.length}`)
  }

  if (!/^[a-zA-Z0-9]{32}$/.test(maybe_without_dash)) {
    throw new Error(
      `Incorrect format of id: ${maybe_without_dash}. It must be /^[a-zA-Z0-9]{32}$/`
    )
  }

  return `${maybe_without_dash.substring(0, 8)}-${maybe_without_dash.substring(
    8,
    12
  )}-${maybe_without_dash.substring(12, 16)}-${maybe_without_dash.substring(
    16,
    20
  )}-${maybe_without_dash.substring(20, 32)}`
}

export function isIdAlreadySeparateByDash(
  maybe_separate_with_dash: string
): boolean {
  if (maybe_separate_with_dash.length !== 36) {
    return false
  }
  return /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(
    maybe_separate_with_dash
  )
}
