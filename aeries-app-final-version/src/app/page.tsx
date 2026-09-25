import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();
  if (session.role === 'hr') redirect('/hr');
  if (session.role === 'employee') redirect('/employee');
  redirect('/login');
}
