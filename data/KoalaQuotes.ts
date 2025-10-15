// 🐨 KoalaQuotes.ts
// Calm quotes by difficulty level (Easy / Normal / Hard)

export type QDifficulty = "EASY" | "NORMAL" | "HARD";

export const KOALA_QUOTES: Record<QDifficulty, string[]> = {
  EASY: [
    "Hati-hati ya, kadang soal mudah itu cuma pemanasan buat otak kamu.",
    "Tenang aja, ini cuma daun ringan buat dicicipin dulu.",
    "Kayak napas pagi, soal ini gampang tapi tetep butuh fokus.",
    "Koala juga mulai dari ranting kecil sebelum manjat tinggi.",
    "Jangan ngebut, nikmatin kemudahan selagi bisa.",
    "Gampang bukan berarti gak penting — tetap isi dengan teliti.",
    "Koala gak pernah remehkan daun kecil, semua punya rasa.",
    "Kalau semuanya terasa mudah, mungkin kamu lagi di jalur yang pas.",
    "Soal easy tuh buat ngasih kamu rasa percaya diri, bukan buat pamer.",
    "Tenang, pelan, dan yakin — itu cara Koala ngerjain soal ringan.",
  ],

  NORMAL: [
    "Koala gak buru-buru, dia tahu tiap langkah ada waktunya.",
    "Soal ini normal — kayak hidup: gak terlalu susah, tapi gak bisa asal.",
    "Pelan aja, yang penting ngerti dulu maksudnya.",
    "Kadang yang bikin beda cuma cara kamu lihat soalnya.",
    "Koala fokus sama satu ranting dulu, baru pindah ke yang lain.",
    "Gak perlu tegang, cukup hadapi dengan rasa ingin tahu.",
    "Ketenangan lebih penting daripada kecepatan.",
    "Kalau stuck sebentar, tarik napas — daun berikutnya pasti bisa.",
    "Soal ini ngajarin kamu buat tenang di tengah tantangan.",
    "Koala percaya, setiap soal punya celah buat diselesaikan dengan sabar.",
  ],

  HARD: [
    "Koala gak kabur pas angin kencang, dia peluk batang lebih kuat.",
    "Susah bukan berarti mustahil, cuma minta kamu lebih tenang.",
    "Kalau otak mulai berat, istirahatin sebentar — jangan maksa.",
    "Koala tahu: daun paling pahit kadang yang paling bergizi.",
    "Soal ini bukan buat bikin kamu nyerah, tapi buat buktiin ketenangan kamu.",
    "Ambil waktu kamu, gak ada yang maksa cepet.",
    "Koala gak panik pas rantingnya goyang — dia percaya sama cengkeramannya.",
    "Susah itu bagian dari belajar pelan-pelan.",
    "Kalau semua terasa berat, inget: ini cuma satu soal, bukan akhir dunia.",
    "Koala gak kuat karena ototnya, tapi karena sabarnya.",
  ],
};

// 🪶 Random picker
export function getKoalaQuote(difficulty: QDifficulty): string {
  const quotes = KOALA_QUOTES[difficulty];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
