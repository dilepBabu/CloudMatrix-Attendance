const COMPANY_TIME_ZONE = "Asia/Kolkata";
const INDIA_OFFSET_MINUTES = 330; // UTC +05:30

// ---------------------------------------------------------
// Get calendar date as YYYY-MM-DD in company timezone
// Example:
// UTC: 2026-09-19T18:30:00.000Z
// IST: 2026-09-20
// ---------------------------------------------------------
export const getCompanyDateKey = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

// ---------------------------------------------------------
// Get year, month and day in company timezone
// ---------------------------------------------------------
export const getCompanyDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: COMPANY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  const result = {};

  for (const part of parts) {
    if (part.type === "year") {
      result.year = Number(part.value);
    }

    if (part.type === "month") {
      result.month = Number(part.value);
    }

    if (part.type === "day") {
      result.day = Number(part.value);
    }
  }

  return result;
};

// ---------------------------------------------------------
// Convert company calendar date to UTC Date
//
// Example:
// 2026-09-20 00:00 IST
// becomes
// 2026-09-19T18:30:00.000Z
//
// This is CORRECT.
// ---------------------------------------------------------
export const getCompanyDayStart = (year, month, day) => {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      -INDIA_OFFSET_MINUTES,
      0,
      0
    )
  );
};

// ---------------------------------------------------------
// Get start of company calendar day from an existing Date
// ---------------------------------------------------------
export const getCompanyDayStartFromDate = (date) => {
  const { year, month, day } =
    getCompanyDateParts(date);

  return getCompanyDayStart(year, month, day);
};

// ---------------------------------------------------------
// Get end of company calendar day
// ---------------------------------------------------------
export const getCompanyDayEndFromDate = (date) => {
  const startOfDay =
    getCompanyDayStartFromDate(date);

  return new Date(
    startOfDay.getTime() +
      24 * 60 * 60 * 1000 -
      1
  );
};

// ---------------------------------------------------------
// Get today's company calendar day start
// ---------------------------------------------------------
export const getCurrentCompanyDayStart = () => {
  return getCompanyDayStartFromDate(new Date());
};

// ---------------------------------------------------------
// Get start and end of a month in company timezone
//
// Example:
// September 2026
//
// start:
// 2026-08-31T18:30:00.000Z
//
// end:
// 2026-09-30T18:29:59.999Z
// ---------------------------------------------------------
export const getCompanyMonthRange = (
  year,
  month
) => {
  const start = getCompanyDayStart(
    year,
    month,
    1
  );

  const nextMonth =
    month === 12
      ? getCompanyDayStart(
          year + 1,
          1,
          1
        )
      : getCompanyDayStart(
          year,
          month + 1,
          1
        );

  const end = new Date(
    nextMonth.getTime() - 1
  );

  return {
    start,
    end,
  };
};

// ---------------------------------------------------------
// Get number of days in a month
// ---------------------------------------------------------
export const getDaysInMonth = (
  year,
  month
) => {
  return new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();
};

// ---------------------------------------------------------
// Get weekday for company calendar date
//
// 0 = Sunday
// 1 = Monday
// ...
// 6 = Saturday
// ---------------------------------------------------------
export const getCompanyDayOfWeek = (
  year,
  month,
  day
) => {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  ).getUTCDay();
};

// ---------------------------------------------------------
// Parse calendar date:
//
// "2026-09-20"
//
// Returns company timezone start/end.
//
// Returns null for invalid date.
// ---------------------------------------------------------
export const parseCompanyDate = (
  dateString
) => {
  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateString
    )
  ) {
    return null;
  }

  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  const testDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    return null;
  }

  const start =
    getCompanyDayStart(
      year,
      month,
      day
    );

  const end = new Date(
    start.getTime() +
      24 * 60 * 60 * 1000 -
      1
  );

  return {
    year,
    month,
    day,
    start,
    end,
  };
};

// ---------------------------------------------------------
// Parse exact datetime.
//
// If timezone is already included:
//   2026-09-20T18:00:00+05:30
// or
//   2026-09-20T12:30:00Z
//
// keep it as supplied.
//
// If timezone is NOT included:
//   2026-09-20T18:00
//
// treat it as Asia/Kolkata.
// ---------------------------------------------------------
export const parseCompanyDateTime = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  const hasTimezone =
    /([zZ]|[+-]\d{2}:\d{2})$/.test(
      value
    );

  const normalizedValue =
    hasTimezone
      ? value
      : `${value}+05:30`;

  const parsed =
    new Date(normalizedValue);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
};