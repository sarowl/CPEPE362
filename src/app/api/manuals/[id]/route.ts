// app/api/manuals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { b2Client, B2_BUCKET } from '@/lib/b2'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  // RLS ensures only the owner can delete
  const { data: manual, error } = await supabase
    .from('manuals')
    .select('file_key')
    .eq('id', params.id)
    .single()

  if (error || !manual) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete from B2 first
  await b2Client.send(new DeleteObjectCommand({
    Bucket: B2_BUCKET,
    Key: manual.file_key,
  }))

  // Then remove metadata from Supabase
  await supabase.from('manuals').delete().eq('id', params.id)

  return new NextResponse(null, { status: 204 })
}