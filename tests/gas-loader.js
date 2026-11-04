// GAS のコードを PC でテストするための道具
//
// SpecDrivenCoder の templates/gas/gas-loader.js と同じもの（中身は書き換えなくてよい）。
//
// GAS のファイル（Code.gs など）を、書き換えずにそのまま読み込み、
// 中の関数をテストから呼べるようにする。
// GAS にしかない道具（Utilities・HtmlService など）は、ここで「何もしない代役」を置く。
// 別の代役が要るときは、loadGas の 2 つ目の引数で渡す（skills/test/gas.md 参照）。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

// tests/ の 1 つ上（= プロジェクトのルート）を基準にファイルを探す
const root = fileURLToPath(new URL('..', import.meta.url))

const htmlOutput = () => ({
  addMetaTag() { return this },
  setTitle() { return this },
  setXFrameOptionsMode() { return this },
  setFaviconUrl() { return this },
})

export function loadGas(files = ['Code.gs'], overrides = {}) {
  const context = vm.createContext({
    console,
    Logger: { log: () => {} },
    Utilities: {
      sleep: () => {},
      formatDate: (date, _tz, _fmt) => new Date(date).toISOString().slice(0, 10),
    },
    HtmlService: {
      createHtmlOutputFromFile: htmlOutput,
      createTemplateFromFile: () => ({ evaluate: htmlOutput }),
      createHtmlOutput: htmlOutput,
    },
    ...overrides,
  })
  for (const file of files) {
    vm.runInContext(readFileSync(root + file, 'utf8'), context, { filename: file })
  }
  return context
}
