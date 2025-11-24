'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Monitor } from '@/lib/models/Monitor';
export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  
  return null;
}