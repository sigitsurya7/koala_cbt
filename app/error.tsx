"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Terjadi Kesalahan</h1>
      <p className="text-default-600 max-w-prose">
        Maaf, terjadi sesuatu yang tidak terduga. Coba muat ulang halaman,
        atau kembali dan ulangi tindakan Anda.
      </p>
      <div className="flex gap-3">
        <Button color="primary" onPress={() => reset()}>
          Coba Lagi
        </Button>
        <Button variant="flat" onPress={() => (window.location.href = "/")}> 
          Kembali ke Beranda
        </Button>
      </div>
      {error?.digest ? (
        <p className="text-xs text-default-400">Kode: {error.digest}</p>
      ) : null}
    </div>
  );
}

