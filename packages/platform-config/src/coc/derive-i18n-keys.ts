// i18n key 由 code 确定派生(唯一 code → 唯一 flat key)。作者不再手填 title/label/desc。
// `.`→`_` 拍平以避开点分嵌套查找的字符串/对象冲突;code 段不得含 `_`(code-underscore guard 守门)保证单射。
const flat = (code: string): string => code.replaceAll(".", "_");

export const deriveMenuTitleKey = (menuCode: string): string => `menu.${flat(menuCode)}`;
export const derivePermLabelKey = (code: string): string => `permission.${flat(code)}_label`;
export const derivePermDescKey = (code: string): string => `permission.${flat(code)}_desc`;
