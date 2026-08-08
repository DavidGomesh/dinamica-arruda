function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function browserOffsetMinutes(date) {
  return -date.getTimezoneOffset();
}

export function createTimestamp(clock = {}) {
  const date = (clock.now || (() => new Date()))();
  return {
    instant: date.toISOString(),
    timeZone: (clock.timeZone || browserTimeZone)(),
    offsetMinutes: (clock.offsetMinutes || (() => browserOffsetMinutes(date)))(),
  };
}

export function formatTimestamp(timestamp, options = {}) {
  if (!timestamp?.instant) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: options.withSeconds ? "medium" : "short",
  }).format(new Date(timestamp.instant));
}
