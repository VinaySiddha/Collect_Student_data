import { NextResponse } from 'next/server';
import { migrateBase64PhotosToBlob } from '@/lib/actions';

export async function GET() {
  const result = await migrateBase64PhotosToBlob();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
