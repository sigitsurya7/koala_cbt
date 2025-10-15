export function formatTanggalKoala(dateString: string): string {
  const date = new Date(dateString)

  const formatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(date)

  // biar tampilannya rapih dan kapital "Pukul"
  return formatted
}

export function formatJamKoala(dateString: string): string {
  const date = new Date(dateString)

  const formatted = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(date)

  // biar tampilannya rapih dan kapital "Pukul"
  return formatted.replace("pukul", "Pukul")
}