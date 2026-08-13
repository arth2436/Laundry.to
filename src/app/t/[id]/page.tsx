'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      router.replace(`/tag-lookup?q=${id}`);
    }
  }, [id, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: 'var(--text-muted)' }}>
      <p>Redirecting to garment details...</p>
    </div>
  );
}
