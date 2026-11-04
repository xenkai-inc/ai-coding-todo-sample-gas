import { describe, it, expect } from 'vitest'
import { loadGas } from './gas-loader.js'

// spec/sheet-persistence.md の受け入れ基準（AC）のうち、「確かめ方: 自動テスト」のものに対応するテスト。
// 本物のスプレッドシートは Google の中でしか動かないので、ここでは
// 「シートの表 ⇄ タスクの一覧」の変換だけを確かめる。
// 実際にシートへ保存されるか（AC-1 の後半）は、確認用 URL で確かめる。
const gas = loadGas(['Code.gs'])

const plain = (value) => JSON.parse(JSON.stringify(value))

const sample = [
  { id: 'a', title: '見積を送る', done: false, createdAt: 1_720_000_000_000 },
  { id: 'b', title: '請求書を確認', done: true, createdAt: 1_720_000_100_000 },
]

describe('スプレッドシート保存（表 ⇄ タスク一覧の変換）', () => {
  it('AC-1: タスク一覧を表にして、そのまま読み戻せる', () => {
    const rows = gas.tasksToRows(sample)
    expect(plain(gas.rowsToTasks(rows))).toEqual(sample)
  })

  it('AC-1: 表の1行目は見出し（id / title / done / createdAt）', () => {
    expect(plain(gas.tasksToRows([])[0])).toEqual(['id', 'title', 'done', 'createdAt'])
  })

  it('AC-2: 表が空・見出しだけのときは、空の一覧を返す（エラーにしない）', () => {
    expect(plain(gas.rowsToTasks([]))).toEqual([])
    expect(plain(gas.rowsToTasks([['id', 'title', 'done', 'createdAt']]))).toEqual([])
  })

  it('AC-3: id が空の行（手で消した行など）は飛ばして読む', () => {
    const rows = [
      ['id', 'title', 'done', 'createdAt'],
      ['', '', '', ''],
      ['a', '見積を送る', false, 1],
    ]
    expect(gas.rowsToTasks(rows).map((t) => t.id)).toEqual(['a'])
  })

  it('AC-3: 完了の欄が文字の "TRUE" になっていても、完了として読める', () => {
    const rows = [
      ['id', 'title', 'done', 'createdAt'],
      ['a', '見積を送る', 'TRUE', '1'],
    ]
    const [task] = gas.rowsToTasks(rows)
    expect(task.done).toBe(true)
    expect(task.createdAt).toBe(1)
  })

  it('AC-3: シートが読めないときも、止まらずに空の一覧で始まる', () => {
    // スプレッドシートを開く部分を「必ず失敗する代役」に差し替えて確かめる
    const broken = loadGas(['Code.gs'], {
      PropertiesService: {
        getScriptProperties: () => ({ getProperty: () => 'x', setProperty: () => {} }),
      },
      SpreadsheetApp: {
        openById: () => { throw new Error('開けません') },
        create: () => { throw new Error('作れません') },
      },
      console: { error: () => {} },
    })
    expect(plain(broken.getTasks())).toEqual([])
  })
})
