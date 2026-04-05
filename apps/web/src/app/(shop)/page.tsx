import { Suspense } from 'react';
import HomepageClient from './HomepageClient';

export default function HomePage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><HomepageClient /></Suspense>;
}
