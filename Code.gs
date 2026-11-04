/**
 * シンプルTODO（GAS 版）— サーバー側の処理
 *
 * このファイルは 3 つのまとまりでできています。
 *   1. 画面を返す（doGet）
 *   2. タスクの操作（追加・完了・削除）… 判定だけの小さな関数。スプレッドシートも画面も出てこない
 *   3. 保存（スプレッドシートへの読み書き）と、画面から呼ばれる関数
 *
 * 2 の関数は、PC の中でも自動テストできます（tests/todo.test.js）。
 * 3 は Google の中でしか動かないので、確認用 URL を開いて確かめます。
 *
 * 仕様: spec/task-management.md / spec/sheet-persistence.md
 */

// ===================================================================
// 1. 画面を返す
// ===================================================================

/** Web アプリの入口。Index.html を画面として返す */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('シンプルTODO')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ===================================================================
// 2. タスクの操作（判定だけの小さな関数）
// ===================================================================
//
// 1件のタスク（Task）の形：
//   id        … タスクを見分けるための文字列
//   title     … タスクの内容（1行）
//   done      … 完了しているか（true = 完了）
//   createdAt … 追加した日時（ミリ秒）
//   【拡張メモ】締切機能を足すときは、ここに dueDate（'yyyy-MM-dd' の文字列）を1つ加える。
//   スプレッドシートの列も、下の TASK_COLUMNS に 'dueDate' を足すだけで増やせる。
//
// どの関数も、受け取った一覧は書き換えず、新しい一覧を返す。

/**
 * タスクを追加した新しい一覧を返す（task-management AC-1）。
 * 前後の空白は取り除く。空文字・空白のみは追加しない（AC-2）。
 */
function addTask(tasks, title, id, now) {
  var trimmed = String(title == null ? '' : title).trim();
  if (trimmed === '') {
    return tasks; // AC-2: 空は追加しない（元の一覧をそのまま返す）
  }
  var task = { id: id, title: trimmed, done: false, createdAt: now };
  return tasks.concat([task]); // 末尾に追加した新しい一覧
}

/**
 * 指定した id のタスクの完了状態を切り替えた新しい一覧を返す（AC-3 / AC-4）。
 * 他のタスクには影響しない。
 */
function toggleTask(tasks, id) {
  return tasks.map(function (task) {
    if (task.id !== id) return task;
    return Object.assign({}, task, { done: !task.done });
  });
}

/**
 * 指定した id のタスクを取り除いた新しい一覧を返す（AC-5）。
 * 存在しない id のときは、同じ内容の一覧を返す。
 */
function removeTask(tasks, id) {
  return tasks.filter(function (task) {
    return task.id !== id;
  });
}

// ===================================================================
// 3. 保存（スプレッドシート）と、画面から呼ばれる関数
// ===================================================================

/** 保存先のシート名 */
var SHEET_NAME = 'tasks';

/** シートの列（1行目の見出し）。この順番で保存する */
var TASK_COLUMNS = ['id', 'title', 'done', 'createdAt'];

/** 保存先スプレッドシートの ID を覚えておくスクリプトプロパティの名前 */
var SPREADSHEET_ID_KEY = 'TODO_SPREADSHEET_ID';

/**
 * シートの値（2次元の表）を、タスクの一覧に変える（sheet-persistence AC-2 / AC-3）。
 * - 1行目は見出し。見出しの名前で列を探すので、列が増えても読める
 * - id が空の行は飛ばす（手で消した行・空行があっても止まらない）
 * - 表が空・見出しだけのときは空の一覧
 */
function rowsToTasks(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  var header = values[0].map(function (h) { return String(h).trim(); });
  var tasks = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var task = {};
    for (var c = 0; c < header.length; c++) {
      if (header[c] !== '') task[header[c]] = row[c];
    }
    if (task.id === undefined || task.id === null || String(task.id).trim() === '') continue;
    task.id = String(task.id);
    task.title = String(task.title == null ? '' : task.title);
    task.done = task.done === true || String(task.done).toUpperCase() === 'TRUE';
    task.createdAt = Number(task.createdAt) || 0;
    tasks.push(task);
  }
  return tasks;
}

/**
 * タスクの一覧を、シートに書き込む表（1行目は見出し）に変える（sheet-persistence AC-1）。
 */
function tasksToRows(tasks) {
  var rows = [TASK_COLUMNS.slice()];
  tasks.forEach(function (task) {
    rows.push(TASK_COLUMNS.map(function (key) {
      var value = task[key];
      return value === undefined || value === null ? '' : value;
    }));
  });
  return rows;
}

/**
 * 保存先のシートを返す。まだ無ければスプレッドシートを自動で作る（sheet-persistence AC-4）。
 * 作ったスプレッドシートの ID はスクリプトプロパティに覚えておく。
 */
function getTaskSheet_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty(SPREADSHEET_ID_KEY);
  var spreadsheet = null;
  if (spreadsheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      spreadsheet = null; // 消された・開けないときは作り直す
    }
  }
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create('シンプルTODO_データ');
    props.setProperty(SPREADSHEET_ID_KEY, spreadsheet.getId());
  }
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }
  return sheet;
}

/** シートからタスク一覧を読む。読めないときも止めずに空の一覧を返す（AC-3） */
function loadTasks_() {
  try {
    var sheet = getTaskSheet_();
    if (sheet.getLastRow() === 0) return [];
    return rowsToTasks(sheet.getDataRange().getValues());
  } catch (e) {
    console.error('タスクの読み込みに失敗しました: ' + e);
    return [];
  }
}

/** タスク一覧をシートに書き込む（毎回、表を丸ごと書き直す） */
function saveTasks_(tasks) {
  var sheet = getTaskSheet_();
  var rows = tasksToRows(tasks);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, TASK_COLUMNS.length).setValues(rows);
}

/**
 * 読む → 変える → 保存する、を1回分まとめて行う。
 * 2つの画面から同時に操作しても混ざらないよう、ロックをかける。
 */
function updateTasks_(change) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var next = change(loadTasks_());
    saveTasks_(next);
    return next;
  } finally {
    lock.releaseLock();
  }
}

// ---- 画面（Index.html）から google.script.run で呼ばれる関数 ----
// 戻り値は、画面に表示するタスクの一覧だけ（スプレッドシートの ID などは返さない）。

/** 今のタスク一覧を返す */
function getTasks() {
  return loadTasks_();
}

/** タスクを1件追加し、新しい一覧を返す。空文字はここでも弾く（画面のチェックだけに頼らない） */
function submitNewTask(title) {
  return updateTasks_(function (tasks) {
    return addTask(tasks, title, Utilities.getUuid(), Date.now());
  });
}

/** 完了・未完了を切り替え、新しい一覧を返す */
function toggleTaskById(id) {
  return updateTasks_(function (tasks) {
    return toggleTask(tasks, String(id));
  });
}

/** タスクを1件削除し、新しい一覧を返す */
function removeTaskById(id) {
  return updateTasks_(function (tasks) {
    return removeTask(tasks, String(id));
  });
}
