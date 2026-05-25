type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 浅 + 深合并 plain object，右侧覆盖左侧。
 * 不处理数组合并、Date、Map 等特殊对象 —— i18n messages 只会是嵌套对象 + 字符串。
 */
export function deepMerge<T extends PlainObject, U extends PlainObject>(
  base: T,
  override: U,
): T & U {
  const out: PlainObject = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = out[key];
    const overrideVal = override[key];
    if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {
      out[key] = deepMerge(baseVal, overrideVal);
    } else {
      out[key] = overrideVal;
    }
  }
  return out as T & U;
}
