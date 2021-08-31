function hex2bin(hex: string) {
    const buf = new Uint8Array(Math.ceil(hex.length / 2));
    for (var i = 0; i < buf.length; i++) {
      buf[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return buf;
  }
  
  const PUBLIC_KEY: Promise<CryptoKey> = (crypto.subtle as any).importKey(
    'raw',
    //@ts-ignore
    hex2bin(DISCORD_PUBLIC_KEY),
    {
      name: 'NODE-ED25519',
      namedCurve: 'NODE-ED25519',
      public: true,
    },
    true,
    ['verify'],
  );
  
  const encoder = new TextEncoder();
  
  export async function verifyKeyMiddleware(req: Request): Promise<Response | void> {
    const signature = hex2bin(req.headers.get('X-Signature-Ed25519') ?? '');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    const unknown = await req.clone().text();
  
    const verified = await crypto.subtle.verify(
      'NODE-ED25519',
      await PUBLIC_KEY,
      signature,
      encoder.encode(timestamp + unknown),
    );
    if (!verified) {
      return new Response('Invalid request', { status: 401 });
    }
  }

  export async function verifyFigmaMiddleware(req: Request): Promise<Response | void> {
    const unknown = await req.clone().json();
    if (unknown == null) {
        return new Response('Invalid request', { status: 401 });
    }

    const { passcode } = unknown;
    //@ts-ignore
    if (passcode !== DISCORD_FIGMA_PASSCODE) {
        return new Response('Invalid passcode', { status: 401 })
      }
  }
