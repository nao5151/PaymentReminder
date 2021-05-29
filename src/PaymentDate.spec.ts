(global as any).SHEET_ID = "test";
(global as any).MAIL_ADDRESS = "test";
require('./index');
import {Payment, _createMessage} from './index'

describe("isBetween", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  it("境界値テスト", () => {
    expect((new Date(today.getTime() - 1) as any).isBetween(today, tomorrow)).toBe(false);
    expect((today as any).isBetween(today, tomorrow)).toBe(true);
    expect((new Date(tomorrow.getTime() - 1) as any).isBetween(today, tomorrow)).toBe(true);
    expect((tomorrow as any).isBetween(today, tomorrow)).toBe(false);
  });
});

describe("_createMessage", () => {
  const from = new Date('2021-01-01');
  const to = new Date('2021-01-10');
  it("test", () => {
    const payments = [
      new Payment(new Date(), 'test', 'テスト支払い1', 1000, new Date(), new Date(), 1, 'month', '引き落とし1', new Date()),
      new Payment(new Date(), 'test', 'テスト支払い2', 1000, new Date(), new Date(), 1, 'month', '引き落とし1', new Date()),
      new Payment(new Date(), 'test', 'テスト支払い3', 1000, new Date(), new Date(), 1, 'month', '引き落とし1', new Date()),
      new Payment(new Date(), 'test', 'テスト支払い4', 1000, new Date(), new Date(), 1, 'month', '引き落とし2', new Date()),
      new Payment(new Date(), 'test', 'テスト支払い5', 1000, new Date(), new Date(), 1, 'month', '引き落とし2', new Date()),
    ];
    expect(_createMessage(from, to, payments)).toBe(    [
      `Fri Jan 01 2021 ~ Sun Jan 10 2021の支払い金額: ¥5000`,
      ``,
      `内訳`,
      '',
      '引き落とし1: ¥3000',
      '・テスト支払い1: ¥1000',
      '・テスト支払い2: ¥1000',
      '・テスト支払い3: ¥1000',
      '',
      '引き落とし2: ¥2000',
      '・テスト支払い4: ¥1000',
      '・テスト支払い5: ¥1000',
    ].join("<br>"));
  });
});
