const TIMEZONE = "Europe/Berlin";

function lastSundayUtc(year, monthIndex) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  return Date.UTC(year, monthIndex, lastDay.getUTCDate() - lastDay.getUTCDay(), 1);
}

function berlinOffsetMinutes(date) {
  const year = date.getUTCFullYear();
  const dstStart = lastSundayUtc(year, 2);
  const dstEnd = lastSundayUtc(year, 9);
  return date.getTime() >= dstStart && date.getTime() < dstEnd ? 120 : 60;
}

function berlinMonthKey(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const local = new Date(date.getTime() + berlinOffsetMinutes(date) * 60_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month, delta) {
  const [year, number] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStartUtc(month) {
  const [year, number] = month.split("-").map(Number);
  const localMidnightAsUtc = new Date(Date.UTC(year, number - 1, 1));
  return new Date(localMidnightAsUtc.getTime() - berlinOffsetMinutes(localMidnightAsUtc) * 60_000);
}

function recentMonths(currentMonth, count) {
  return Array.from({ length: count }, (_, index) => shiftMonth(currentMonth, index - count + 1));
}

function queryOne(app, sql, shape, params) {
  const result = new DynamicModel(shape);
  app.db().newQuery(sql).bind(params || {}).one(result);
  return result;
}

function memberCounts(app, createdBefore) {
  const historicalCutoff = createdBefore
    ? "\n    WHERE datetime(created) < datetime({:createdBefore})"
    : "";
  const result = queryOne(app, `
    SELECT
      COUNT(*) AS registeredUsers,
      COALESCE(SUM(CASE WHEN role = 'MEMBER' THEN 1 ELSE 0 END), 0) AS members
    FROM users${historicalCutoff}
  `, { registeredUsers: 0, members: 0 }, createdBefore ? { createdBefore } : undefined);
  return {
    registeredUsers: Number(result.registeredUsers || 0),
    members: Number(result.members || 0),
  };
}

function countPublishedEventsThisMonth(app, month, now) {
  const start = monthStartUtc(month).toISOString();
  const end = monthStartUtc(shiftMonth(month, 1)).toISOString();
  const result = queryOne(app, `
    SELECT COUNT(*) AS total
    FROM events
    WHERE published = 1
      AND firstPublishedAt != ''
      AND datetime(firstPublishedAt) >= datetime({:start})
      AND datetime(firstPublishedAt) < datetime({:end})
  `, { total: 0 }, { start, end });
  return Number(result.total || 0);
}

function countUpcomingRegistrations(app, userId, now) {
  const result = queryOne(app, `
    SELECT COUNT(*) AS total
    FROM event_registrations AS registration
    INNER JOIN events AS event ON event.id = registration.event
    WHERE registration.user = {:userId}
      AND registration.status = 'REGISTERED'
      AND event.published = 1
      AND event.status NOT IN ('CANCELLED', 'COMPLETED')
      AND datetime(event.end) > datetime({:now})
  `, { total: 0 }, { userId, now: now.toISOString() });
  return Number(result.total || 0);
}

function dashboardStatistics(app, userId, nowValue) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
  const currentMonth = berlinMonthKey(now);
  const keys = recentMonths(currentMonth, 6);
  const live = memberCounts(app);
  const months = keys.map((month) => {
    if (month === currentMonth) return { month, ...live, complete: false };
    return {
      month,
      ...memberCounts(app, monthStartUtc(shiftMonth(month, 1)).toISOString()),
      complete: true,
    };
  });
  return {
    timezone: TIMEZONE,
    trackingSince: keys[0],
    current: {
      ...live,
      publishedEventsThisMonth: countPublishedEventsThisMonth(app, currentMonth, now),
      myUpcomingRegistrations: countUpcomingRegistrations(app, userId, now),
    },
    months,
  };
}

module.exports = {
  TIMEZONE,
  berlinOffsetMinutes,
  berlinMonthKey,
  monthStartUtc,
  recentMonths,
  memberCounts,
  dashboardStatistics,
};
