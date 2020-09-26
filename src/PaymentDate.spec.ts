import { PaymentDate, Category } from "./index";

describe("isBetween", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  describe("Monthly", () => {
    it("去年でも、日にちが範囲内ならtrue", () => {
      const date = new Date(today.getTime());
      date.setFullYear(date.getFullYear() - 1);
      const p = PaymentDate.from(Category.Monthly, date);
      expect(p.isBetween(today, tomorrow)).toBeTruthy();
    });

    it("先月でも、日にちが範囲内ならtrue", () => {
      const date = new Date(today.getTime());
      date.setFullYear(date.getFullYear(), date.getMonth() - 1);
      const p = PaymentDate.from(Category.Monthly, date);
      expect(p.isBetween(today, tomorrow)).toBeTruthy();
    });

    it("前日なら、false", () => {
      const date = new Date(today.getTime());
      date.setDate(date.getDate() - 1);
      const p = PaymentDate.from(Category.Monthly, date);
      expect(p.isBetween(today, tomorrow)).toBeFalsy();
    });

    it("翌日なら、false", () => {
      const date = new Date(today.getTime());
      date.setDate(date.getDate() + 1);
      const p = PaymentDate.from(Category.Monthly, date);
      expect(p.isBetween(today, tomorrow)).toBeFalsy();
    });
  });

  describe("Yearly", () => {
    it("去年でも、月、日が範囲内ならtrue", () => {
      const date = new Date(today.getTime());
      date.setFullYear(date.getFullYear() - 1);
      const p = PaymentDate.from(Category.Yearly, date);
      expect(p.isBetween(today, tomorrow)).toBeTruthy();
    });

    it("先月ならfalse", () => {
      const date = new Date(today.getTime());
      date.setFullYear(date.getFullYear(), date.getMonth() - 1);
      const p = PaymentDate.from(Category.Yearly, date);
      expect(p.isBetween(today, tomorrow)).toBeFalsy();
    });
  });
});
