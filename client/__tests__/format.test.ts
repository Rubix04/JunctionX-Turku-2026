import {
  addDays,
  ageInYears,
  daysBetween,
  formatEuros,
  parseDate,
  parseDecimal,
  parseFinnishDate,
  todayIso,
} from '@/utils/format';

describe('dates', () => {
  it('gives today as a local date, not UTC', () => {
    // 00:30 in Helsinki is still the previous day in UTC.
    expect(todayIso(new Date(2026, 10, 25, 0, 30))).toBe('2026-11-25');
  });

  it('parses a date alone as local midnight', () => {
    const date = parseDate('2026-10-17');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 17, 0]);
  });

  it('adds days across the daylight-saving change', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('counts whole days between dates, also across daylight saving', () => {
    expect(daysBetween('2026-10-20', '2026-10-30')).toBe(10);
    expect(daysBetween('2026-03-25', '2026-04-01')).toBe(7);
    expect(daysBetween('2026-11-25', '2026-11-20')).toBe(-5);
  });

  it('counts full years of age', () => {
    expect(ageInYears('2019-05-04', '2026-05-03')).toBe(6);
    expect(ageInYears('2019-05-04', '2026-05-04')).toBe(7);
  });
});

describe('parsing what the user types', () => {
  it('accepts a comma or a dot as the decimal mark', () => {
    expect(parseDecimal('4,6')).toBe(4.6);
    expect(parseDecimal(' 4.6 ')).toBe(4.6);
  });

  it('rejects empty and non-numeric input', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });

  it('reads a Finnish date and rejects impossible ones', () => {
    expect(parseFinnishDate('4.5.2019')).toBe('2019-05-04');
    expect(parseFinnishDate('31.02.2026')).toBeNull();
    expect(parseFinnishDate('2026-05-04')).toBeNull();
  });
});

describe('money', () => {
  it('shows whole euros, or cents for a receipt amount', () => {
    expect(formatEuros(3000)).toBe('€3,000');
    expect(formatEuros(128.4, true)).toBe('€128.40');
  });
});
