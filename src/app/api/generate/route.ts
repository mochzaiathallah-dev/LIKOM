import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { instruction } = await request.json();
    
    // Simulate a brief AI latency (500ms) for better UX feel
    await new Promise((resolve) => setTimeout(resolve, 500));

    let comment = 'Keren kak! 👍';
    const instrLower = (instruction || '').toLowerCase();

    if (instrLower.includes('emot')) {
      const emots = ['👍🔥', '🙌❤️', '🤩👏', '😎💯', '👌✨'];
      comment = emots[Math.floor(Math.random() * emots.length)];
    } else if (instrLower.includes('tanya')) {
      const questions = [
        'Berapa harganya kak?',
        'Bisa order di mana?',
        'Info detailnya dong',
        'Fasilitasnya apa aja?',
        'Rasanya gimana kak?',
      ];
      comment = questions[Math.floor(Math.random() * questions.length)];
    } else if (instrLower.includes('lucu') || instrLower.includes('gokil')) {
      comment = 'Hahaha gokil! 😂';
    } else if (instrLower.includes('bagus') || instrLower.includes('keren') || instrLower.includes('mantap')) {
      const praises = ['Keren banget! 🚀', 'Mantap sekali! 🙌', 'Bagus banget ini! 👍'];
      comment = praises[Math.floor(Math.random() * praises.length)];
    } else {
      // General fallbacks
      const fallbacks = ['Keren kak! 👍', 'Sangat menginspirasi!', 'Mantap sekali! 🙌', 'Menarik banget ini'];
      comment = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate comment' }, { status: 500 });
  }
}
