import { StudyViewer } from '@/components/study/StudyViewer';

export default async function StudyBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main style={{ minHeight: '100vh', background: '#0b0716' }}>
      <StudyViewer bookId={id} />
    </main>
  );
}
