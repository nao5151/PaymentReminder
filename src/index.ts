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

export enum Category {
  Monthly = "Monthly",
  Yearly = "Yearly",
}

class Payment {
  constructor(
    public title: string,
    public amount: number,
    public paymentDate: Date,
    public paymentPeriod?: Date
  ) {}

  static get(from: Date, to: Date): Payment[] {
    const sheets = SpreadsheetApp.openById(SHEET_ID!).getSheets();
    const sheet = sheets[0];
    // |category|title|amount|paymentDate|paymentPeriod|
    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 5)
      .getValues() as [Category, string, number, Date, Date | undefined][];
    return values
      .map(
        ([category, title, amount, paymentDate, paymentPeriod]) =>
          new Payment(title, amount, PaymentDate.from(category, paymentDate))
      )
      .filter((p) => p.paymentDate.isBetween(from, to));
  }
}

export class PaymentDate {
  static from(category: Category, value: any): Date {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid value ${JSON.stringify(value)}`);
    }

    const now = new Date();
    if (category === Category.Yearly) {
      d.setFullYear(now.getFullYear());
    } else if (category === Category.Monthly) {
      d.setFullYear(now.getFullYear(), now.getMonth());
    }
    return d;
  }
}

function monthlyReport(): void {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime());
  to.setMonth(to.getMonth() + 1);
  const payments = Payment.get(from, to);
  if (payments.length === 0) {
    Logger.log(`${from.toDateString()} ~ ${to.toDateString()}の支払いなし`);
    return;
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const message = [
    `${from.toDateString()} ~ ${to.toDateString()}の支払い金額: ¥${totalAmount}`,
    ``,
    `内訳`,
    payments.map((p) => `${p.title}: ¥${p.amount}`).join("<br>"),
  ].join("<br>");
  sendMail("[Monthly]支払い予定", message);
}

function weeklyReport(): void {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime());
  to.setDate(to.getDate() + 7);
  const payments = Payment.get(from, to);
  if (payments.length === 0) {
    Logger.log(`${from.toDateString()} ~ ${to.toDateString()}の支払いなし`);
    return;
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const message = [
    `${from.toDateString()} ~ ${to.toDateString()}の支払い金額: ¥${totalAmount}`,
    ``,
    `内訳`,
    payments.map((p) => `${p.title}: ¥${p.amount}`).join("<br>"),
  ].join("<br>");
  sendMail("[Weekly]支払い予定", message);
}

function sendMail(subject: string, htmlBody: string): void {
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
