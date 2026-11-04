import { describe, it, expect } from 'vitest'
import { loadGas } from './gas-loader.js'

// spec/task-management.md の受け入れ基準（AC）のうち、「確かめ方: 自動テスト」のものに対応するテスト。
// - describe: 大きなグループ
// - it: 1つのテスト
// - expect(...).toBe/toEqual(...): 「こうなるはず」を書く
//
// Code.gs は書き換えずに、そのまま読み込んで中の関数を呼び出す（tests/gas-loader.js）。
const gas = loadGas(['Code.gs'])

// テスト用に、決め打ちの id と時刻を渡す（毎回同じ結果になるように）
const ID = 'id-1'
const NOW = 1_720_000_000_000

// GAS の中で作られた値と比べるときは、JSON にして形だけをそろえる
const plain = (value) => JSON.parse(JSON.stringify(value))

describe('タスク管理（追加・完了・削除）', () => {
  describe('addTask — 追加', () => {
    it('AC-1: タスクを追加すると一覧に現れる', () => {
      const result = gas.addTask([], '見積を送る', ID, NOW)
      expect(plain(result)).toEqual([
        { id: ID, title: '見積を送る', done: false, createdAt: NOW },
      ])
    })

    it('AC-1: 既存の一覧の末尾に追加される（追加順を保つ）', () => {
      const existing = [{ id: 'a', title: '既存', done: false, createdAt: 1 }]
      const result = gas.addTask(existing, '新規', ID, NOW)
      expect(result.map((t) => t.title)).toEqual(['既存', '新規'])
    })

    it('AC-1: 元の一覧を書き換えない（新しい一覧を返す）', () => {
      const existing = []
      gas.addTask(existing, 'x', ID, NOW)
      expect(existing).toHaveLength(0)
    })

    it('AC-2: 空文字は追加できない（一覧は増えない）', () => {
      expect(gas.addTask([], '', ID, NOW)).toHaveLength(0)
    })

    it('AC-2: 空白のみも追加できない', () => {
      expect(gas.addTask([], '   ', ID, NOW)).toHaveLength(0)
    })

    it('AC-2: 前後の空白は取り除いて保存する', () => {
      expect(gas.addTask([], '  買い物  ', ID, NOW)[0].title).toBe('買い物')
    })
  })

  describe('toggleTask — 完了の切り替え', () => {
    const tasks = [
      { id: 'a', title: 'A', done: false, createdAt: 1 },
      { id: 'b', title: 'B', done: false, createdAt: 2 },
    ]

    it('AC-3: 指定したタスクを完了（done=true）にできる', () => {
      const result = gas.toggleTask(tasks, 'a')
      expect(result.find((t) => t.id === 'a').done).toBe(true)
    })

    it('AC-3: 他のタスクには影響しない', () => {
      const result = gas.toggleTask(tasks, 'a')
      expect(result.find((t) => t.id === 'b').done).toBe(false)
    })

    it('AC-4: もう一度切り替えると未完了（done=false）に戻る', () => {
      const twice = gas.toggleTask(gas.toggleTask(tasks, 'a'), 'a')
      expect(twice.find((t) => t.id === 'a').done).toBe(false)
    })
  })

  describe('removeTask — 削除', () => {
    const tasks = [
      { id: 'a', title: 'A', done: false, createdAt: 1 },
      { id: 'b', title: 'B', done: true, createdAt: 2 },
    ]

    it('AC-5: 指定したタスクが一覧から消える', () => {
      const result = gas.removeTask(tasks, 'a')
      expect(result.map((t) => t.id)).toEqual(['b'])
    })

    it('AC-5: 存在しない id を指定しても、一覧は変わらない', () => {
      expect(gas.removeTask(tasks, 'zzz')).toHaveLength(2)
    })
  })
})
