"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Card, CardBody } from "@heroui/react";

type Candidate = { userId: string; name?: string | null; username?: string | null; email?: string | null; className?: string | null };

export default function ExamRoomDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [info, setInfo] = useState<{ roomName?: string | null; capacity?: number | null } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await axios.get(`/api/exam-rooms/${id}`);
      setInfo({ roomName: r.data?.examRoom?.roomName, capacity: r.data?.examRoom?.capacity });
      setCandidates(r.data?.candidates || []);
    })();
  }, [id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Detail Ruang Ujian</h1>
        <p className="text-sm opacity-70">Ruangan: {info?.roomName || '-'} {info?.capacity ? `(Kapasitas ${info.capacity})` : ''}</p>
      </div>
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((c) => (
              <div key={c.userId} className="rounded-medium border border-default-200 p-3">
                <div className="font-medium">{c.name || c.username || c.email || c.userId}</div>
                <div className="text-xs opacity-70">{c.className || '-'}</div>
              </div>
            ))}
            {candidates.length === 0 && (
              <div className="text-sm opacity-70">Tidak ada kandidat yang tersedia.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

