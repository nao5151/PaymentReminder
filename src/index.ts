declare global {
  interface Date {
    isBetween(from: Date, to: Date): boolean;
  }
}

Date.prototype.isBetween = function (from: Date, to: Date): boolean {
  const t = this.getTime();
  return from.getTime() <= t && t < to.getTime();
};

// const SHEET_ID = PropertiesService.getScriptProperties().getProperty(
//   "SHEET_ID"
// );
if (!SHEET_ID) {
  throw new Error('Requird property "SHEET_ID"');
}
// const MAIL_ADDRESS = PropertiesService.getScriptProperties().getProperty(
//   "MAIL_ADDRESS"
// );

// スプレッドシートで使っている文字と合わせる
const REPEAT_UNIT = {
  month: "month",
  year: "year",
} as const;
type REPEAT_UNIT = typeof REPEAT_UNIT[keyof typeof REPEAT_UNIT];

const INDEXES = {
  timestamp: 0,
  category: 1,
  title: 2,
  amount: 3,
  start: 4,
  end: 5,
  repeatValue: 6,
  repeatUnit: 7,
  memo: 8,
  next: 9,
} as const;
type INDEXES = typeof INDEXES[keyof typeof INDEXES];

type RowType = [
  Date, // タイムスタンプ
  string, // category
  string, // title
  number, // amount
  Date, // start
  Date | undefined, // end
  number, // repeatValue
  REPEAT_UNIT, // repeatUnit
  string | undefined, // memo
  Date | undefined // next
];

export class Payment {
  constructor(
    public readonly timestamp: Date,
    public readonly category: string,
    public readonly title: string,
    public readonly amount: number,
    public readonly start: Date,
    public readonly end: Date | undefined,
    public readonly repeatValue: number,
    public readonly repeatUnit: REPEAT_UNIT,
    public readonly memo: string | undefined,
    public next: Date | undefined
  ) {}

  private get isExpired(): boolean {
    if (!this.end) {
      return false;
    }

    return this.end <= new Date();
  }

  static from(row: RowType): Payment | undefined {
    if (!row[INDEXES.timestamp]) {
      return;
    }

    return new Payment(
      row[INDEXES.timestamp],
      row[INDEXES.category],
      row[INDEXES.title],
      parseInt(row[INDEXES.amount] + "", 10),
      row[INDEXES.start],
      row[INDEXES.end],
      parseInt(row[INDEXES.repeatValue] + "", 10),
      row[INDEXES.repeatUnit],
      row[INDEXES.memo],
      row[INDEXES.next]
    );
  }

  updateNext(now = new Date()): void {
    // 繰り返し終了
    if (this.isExpired) {
      this.next = undefined;
      return;
    }

    const { start, repeatValue, repeatUnit } = this;
    let { next } = this;
    if (!next) {
      next = new Date(start.getTime());
    }
    while (next < now) {
      if (repeatUnit === REPEAT_UNIT.year) {
        next.setFullYear(next.getFullYear() + repeatValue);
      } else if (repeatUnit === REPEAT_UNIT.month) {
        next.setMonth(next.getMonth() + repeatValue);
      } else {
        throw new Error(`Unexpected RepeatUnit -> ${repeatUnit}`);
      }
    }
    this.next = next;
  }

  toRow(): RowType {
    return [
      this.timestamp,
      this.category,
      this.title,
      this.amount,
      this.start,
      this.end,
      this.repeatValue,
      this.repeatUnit,
      this.memo,
      this.next,
    ];
  }
}

/**
 * nextが空、過去の日付になっているものを設定する
 * ソートしてきれいにする
 */
function refreshData(): void {
  const sheet = _getDataSheet();
  const lastRow = sheet.getLastRow() - 1;
  if (lastRow < 1) {
    return;
  }
  const payments = (sheet.getRange(2, 1, lastRow, 10).getValues() as RowType[])
    .map((row) => Payment.from(row))
    .filter(Boolean)
    .map((payment) => {
      payment!.updateNext();
      return payment;
    }) as Payment[];
  sheet.deleteRows(2, lastRow);
  if (payments.length) {
    sheet.getRange(2, 1, payments.length, 10).setValues(payments.map((p) => p.toRow()));
  }
}

function monthlyReport(): void {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime());
  to.setMonth(to.getMonth() + 1);
  const payments = _getBetweenPayments(from, to);
  if (payments.length === 0) {
    Logger.log(`${from.toDateString()} ~ ${to.toDateString()}の支払いなし`);
    return;
  }
  _sendMail("[Monthly]支払い予定", _createMessage(from, to, payments));
}

function weeklyReport(): void {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime());
  to.setDate(to.getDate() + 7);
  const payments = _getBetweenPayments(from, to);
  if (payments.length === 0) {
    Logger.log(`${from.toDateString()} ~ ${to.toDateString()}の支払いなし`);
    return;
  }
  _sendMail("[Weekly]支払い予定", _createMessage(from, to, payments));
}

function dailyReport(): void {
  // 明日
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() + 1);
  const to = new Date(from.getTime());
  to.setDate(to.getDate() + 1);
  const payments = _getBetweenPayments(from, to);
  if (payments.length === 0) {
    Logger.log(`${from.toDateString()} ~ ${to.toDateString()}の支払いなし`);
    return;
  }
  _sendMail("[Daily]支払い予定", _createMessage(from, to, payments));
}

export function _createMessage(from: Date, to: Date, payments: Payment[]): string {
  // 総額表示
  let totalAmount = 0;
  const totalByMethod: {[key: string]: number} = {};
  const paymentsByMethod: {[key: string]: Payment[]} = {};
  for (const p of payments) {
    totalAmount += p.amount;
    const key = p.memo || '未設定';
    if (totalByMethod[key]) {
      totalByMethod[key] += p.amount;
    } else {
      totalByMethod[key] = p.amount;
    }
    if (paymentsByMethod[key]) {
      paymentsByMethod[key].push(p);
    } else {
      paymentsByMethod[key] = [p];
    }
  }
  const header = `${from.toDateString()} ~ ${to.toDateString()}の支払い金額: ¥${totalAmount}`;
  const details = Object.keys(paymentsByMethod).map(key => {
    return (
      `${key}: ¥${totalByMethod[key]}` +
      "<br>" +
      paymentsByMethod[key].map(p => `・${p.title}: ¥${p.amount}`).join("<br>")
    )
  }).join("<br><br>");

  return [
    `HEADER`,
    '',
    '内訳',
    '',
    'DETAILS'
  ].join('<br>').replace('HEADER', header).replace('DETAILS', details);
}

function _getDataSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const sheets = SpreadsheetApp.openById(SHEET_ID!).getSheets();
  const sheet = sheets.find((s) => s.getSheetName() === "data");
  if (!sheet) {
    throw new Error('Not Found "data" sheet');
  }
  return sheet;
}

function _getBetweenPayments(from: Date, to: Date): Payment[] {
  const sheet = _getDataSheet();
  const lastRow = sheet.getLastRow() - 1;
  return (sheet.getRange(2, 1, lastRow, 10).getValues() as RowType[])
    .map((row) => Payment.from(row))
    .filter((payment) => {
      if (!payment || !payment.next) {
        return false;
      }
      return payment.next.isBetween(from, to);
    }) as Payment[];
}

function _sendMail(subject: string, htmlBody: string): void {
  if (!MAIL_ADDRESS) {
    throw new Error('Requird property "MAIL_ADDRESS"');
  }

  return MailApp.sendEmail({
    to: MAIL_ADDRESS,
    subject,
    htmlBody,
    noReply: true,
  });
}
