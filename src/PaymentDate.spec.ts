describe("isBetween", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  it("test", () => {
    expect(true).toBe(true);
  });
});
