import { NextResponse } from 'next/server';

// ── CORS ─────────────────────────────────────────────────────────────────────
function cors(res: Response) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}
export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

// ── Gender inference ─────────────────────────────────────────────────────────
function inferGender(username: string): 'female' | 'male' | 'neutral' {
  const n = (username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const F = ['vita','louren','melz','melis','putri','sari','ayu','lia','ani','santi','fitri','devi','dewi','indah','nia','rara','icha','anisa','dian','widya','ratna','tika','linda','novi','clara','bella','grace','olivia','sophia','chloe','sara','sherly','jane','anna','nisa','rere','wulan','tari','kartika','justvita','neng','lisa','jenny','rose','jisoo','tia','ria','maya','rini','nita','tiara','vika','nurul','yunita','yuni','cinta','nabila','fathia','tasya','naura','raisa','zahra','hana','lena','amel','aurel','auliya','gina','heni','ima','irma','kiki','lilis','meli','mia','mimi','nana','neni','pipit','puput','ririn','sinta','siti','sri','suci','widi','yani','yeni','yuli','anisaaryan','anisa'];
  const M = ['rozi','adhika','budi','eko','putra','danang','tony','ahmad','muhammad','doni','reza','ricky','alex','adit','agus','danny','indra','fajar','rio','galang','dimas','bima','kevin','ryan','daniel','bobby','joko','hendra','tomi','tommy','dicky','aldy','guntur','rama','satria','aditya','rizky','rizki','hamzah','rizal','hafiz','fauzi','ihsan','ilham','irfan','stanly','stanley','irmar','amar','andre','yusuf','oscar','taufik','syahrul','galih','akbar','farel','aldi','aldo','alfan','alvin','andi','arif','aryo','bagas','bagus','bayu','daffa','damar','dani','denny','eko','evan','fadil','faris','farrel','fikri','hadi','haikal','hakim','haris','herman','imam','ivan','januar','jefri','jihad','khoirul','lutfi','maman','maulana','mirza','nandang','novan','panji','pandu','rangga','ranu','rheza','robi','roby','rofi','rudy','satrio','singgih','sugeng','surya','syam','teguh','wahyu','wawan','wisnu','yogi','yudha','yudi'];
  for (const k of F) if (n.includes(k)) return 'female';
  for (const k of M) if (n.includes(k)) return 'male';
  return 'neutral';
}

// ── Emoji-only shortcut ───────────────────────────────────────────────────────
function emojiForCaption(caption: string): string {
  const c = caption.toLowerCase();
  if (/kucing|anabul|kitten|cat|paw|bulu/.test(c)) return '😻❤️';
  if (/kopi|coffee|cafe|nongkrong|espresso|latte/.test(c)) return '☕✨';
  if (/makan|kuliner|food|resep|enak|lezat/.test(c)) return '😋🔥';
  if (/ootd|outfit|baju|fashion|style/.test(c)) return '👗✨';
  if (/suntik|vaksin|dokter|skincare|serum/.test(c)) return '💪✨';
  if (/kamera|camera|foto|photo|vlog/.test(c)) return '📸🔥';
  if (/travel|liburan|wisata|trip|pantai|gunung/.test(c)) return '✈️🔥';
  if (/fitness|gym|olahraga|workout/.test(c)) return '💪🏋️';
  return '🔥🙌';
}

// ── OpenAI-compatible fetch (IDRouter / DeepSeek) ────────────────────────────
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const baseUrl  = process.env.OPENAI_BASE_URL  || 'https://id.solution.qzz.io/v1';
  const apiKey   = process.env.OPENAI_API_KEY   || 'idr_q2XBL9fVpn32SzRusrPN4KzfbG9km-Pz';
  const model    = process.env.OPENAI_MODEL     || 'deepseek-v4-flash-oc';

  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      max_tokens: 120,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Empty AI response');
  return text.trim().replace(/^["']|["']$/g, '');
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  let instruction = '', caption = '', targetUsername = '';

  try {
    const body     = await request.json();
    instruction    = body.instruction   || '';
    caption        = body.caption       || '';
    targetUsername = body.targetUsername || '';

    const gender  = inferGender(targetUsername);
    const pronoun = gender === 'female' ? 'kak' : gender === 'male' ? 'bro' : 'kak';
    const instrLower = instruction.toLowerCase().trim();

    console.log('\n[LIKOM /api/generate-smart] ─────────────────────');
    console.log('  user     :', targetUsername || '(empty)');
    console.log('  instr    :', instruction    || '(empty)');
    console.log('  caption  :', caption ? caption.slice(0, 100) + '…' : '(EMPTY!)');
    console.log('  gender   :', gender, '→', pronoun);

    // ── 1. Emoji only ────────────────────────────────────────────────────────
    if (instrLower.includes('emot') || instrLower.includes('emoji')) {
      const emot = emojiForCaption(caption);
      console.log('  → EMOJI:', emot);
      return cors(NextResponse.json({ comment: emot, source: 'emoji' }));
    }

    const hasInstruction = instruction.trim().length > 0;

    // Determine strict word length rule from instruction
    let wordRule = 'Panjang: 3 sampai 6 kata pendek saja, santai dan ramah';
    if (/2\s*kata/i.test(instruction)) {
      wordRule = 'JUMLAH KATA: TEPAT 2 KATA SAJA (DILARANG LEBIH ATAU KURANG DARI 2 KATA! Contoh: "Keren banget!", "Gemoy parah!")';
    } else if (/(?:3-4|3\s*sampai\s*4|3\s*atau\s*4)\s*kata/i.test(instruction)) {
      wordRule = 'JUMLAH KATA: TEPAT 3 SAMPAI 4 KATA SAJA (DILARANG KURANG DARI 3 KATA, DILARANG LEBIH DARI 4 KATA!)';
    } else if (/(?:5-6|5\s*sampai\s*6|5\s*atau\s*6)\s*kata/i.test(instruction)) {
      wordRule = 'JUMLAH KATA: TEPAT 5 SAMPAI 6 KATA SAJA (DILARANG KURANG DARI 5 KATA, DILARANG LEBIH DARI 6 KATA!)';
    } else if (/(?:7-8|7\s*sampai\s*8)\s*kata/i.test(instruction)) {
      wordRule = 'JUMLAH KATA: TEPAT 7 SAMPAI 8 KATA SAJA';
    }

    const systemPrompt = `Kamu adalah seorang pengguna Instagram Gen Z Indonesia yang ramah, sopan, dan santai.

TUGAS UTAMA: Buatkan 1 baris komentar Instagram yang ramah, positif, dan alami.

ATURAN SANGAT PENTING:
- PANGGILAN: Panggil pembuat postingan dengan kata "${pronoun}".
- ATURAN PANJANG KATA: ${wordRule}.
- APAPUN TERJADI, kamu HARUS LANGSUNG mengeluarkan 1 kalimat komentar siap pakai!
- DILARANG MENOLAK! DILARANG meminta maaf, DILARANG bilang "caption tidak ada" atau "tidak bisa bikin komentar". 
- Jika caption tidak ada, buatlah komentar pujian atau sapaan yang positif dan cocok untuk postingan Instagram umum.
- DILARANG menyebut bahwa kamu AI.
- HASILKAN HANYA TEKS KOMENTAR SAJA (Tanpa tanda kutip, tanpa kalimat pembuka/penutup).`;

    const captionBlock = caption.trim()
      ? `Caption postingan:\n---\n${caption.slice(0, 1200)}\n---`
      : `Catatan: Buat komentar positif umum yang ramah untuk postingan ini.`;

    const instrBlock = hasInstruction
      ? `Instruksi dari user: "${instruction}"`
      : `Buatkan komentar umum yang sangat bagus dan positif.`;

    const userMsg = [captionBlock, instrBlock].join('\n\n');

    try {
      const comment = await callAI(systemPrompt, userMsg);
      console.log('  → AI:', comment);
      return cors(NextResponse.json({ comment, source: 'ai' }));
    } catch (aiErr: unknown) {
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.error('  → AI FAILED:', msg);
    }

    // Fallback if AI is offline
    const fallbackComment = `Keren banget postnya ${pronoun}, sehat selalu ya!`;
    return cors(NextResponse.json({
      comment: fallbackComment,
      source: 'fallback'
    }));

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-smart] Error:', msg);
    return cors(NextResponse.json({ error: msg }, { status: 500 }));
  }
}
