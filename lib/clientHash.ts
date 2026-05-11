export async function hashPasswordClient(email: string, password: string): Promise<string> {
  const text = `${email.toLowerCase()}:${password}`;
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
