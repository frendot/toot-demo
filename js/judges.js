// Fully pre-written judge line bank (spec S6). No generated text, no free-text input.
// Lines are chosen deterministically from audio features; checked by tools/check-content.mjs.

export const JUDGES = [
  { id: 'prof', name: 'Professor Toot', style: 'Fancy scientist', color: '#7e57c2' },
  { id: 'reggie', name: 'Sir Reginald Pardonme', style: 'Posh food critic', color: '#00897b' },
  { id: 'coach', name: 'Coach Blast', style: 'Sports commentator', color: '#ef6c00' },
];

export const BANDS = [
  { min: 0, max: 39, badge: 'Gentle Breeze' },
  { min: 40, max: 59, badge: 'Solid Squeaker' },
  { min: 60, max: 74, badge: 'Brass Section' },
  { min: 75, max: 89, badge: 'Thunder Trumpet' },
  { min: 90, max: 100, badge: 'Nobel Toot Nominee' },
];

export const LINES = {
  prof: [
    [
      'A whisper of a toot! I shall need my most sensitive instruments for this one.',
      'Delicate, like a mouse tiptoeing past a sleeping cat. Charming!',
      'My Tootometer barely twitched, but my heart did. Lovely effort.',
      'A shy little pfft. Every great scientist started small, and so did every great toot.',
      'Hmm, a gentle breeze from the east. Note it down, Igor. Igor? Where is Igor?',
      'This toot is still warming up. Come back after it has had its breakfast.',
      'Quiet, polite and well-mannered. The toot equivalent of saying please.',
      'I detected a faint flutter. Possibly a moth. Possibly genius. More tests needed!',
      'A soft little squeak. My beakers bubbled very politely.',
      'Tiny but brave! Like a kazoo on its first day of school.',
      'The data is modest, the spirit is enormous. I approve.',
      'A pianissimo performance. Let us try fortissimo next time!',
    ],
    [
      'A respectable toot! Steady pitch, decent wobble. Solid lab work.',
      'Ooh, a clear middle C with a hint of rubber duck. Fascinating.',
      'My clipboard says: promising. My moustache says: more!',
      'A tidy little trumpet. I would give it a gold star, if I could find my stickers.',
      'Pleasant wobble, sensible length. A very well-behaved specimen.',
      'The beakers gave a cheerful burble. They liked that one.',
      'Good form! A textbook toot from chapter two of my textbook.',
      'I measured exactly one giggle in the room. Science!',
      'A sturdy squeaker with a modest finish. Rather like a good sandwich.',
      'Intriguing! It started like a bassoon and ended like a bicycle horn.',
      'Nicely done. I shall file this under Toots, Delightful.',
      'A sound with real character. It has opinions, I can tell.',
    ],
    [
      'Remarkable! A clear B-flat with a dramatic wobble. I must write a paper on this immediately.',
      'Bravo! The Tootometer leapt like a startled frog.',
      'That had real brass in it. I can hear the tuba section cheering.',
      'Splendid resonance! My spectacles fogged up from pure excitement.',
      'Now THAT is a wobble. Somewhere, a jelly is jealous.',
      'Magnificent pitch control. Have you been practising with a kazoo?',
      'I must alert the Royal Society of Squeaks at once!',
      'The beakers are bubbling in three-part harmony. Unprecedented!',
      'A bold trumpet with a cheeky aftershock. Textbook brilliance.',
      'Eureka! I have discovered a new note between C and C-sharp.',
      'My lab coat flapped in the breeze. That is a very good sign.',
      'Superb! I am adding a new chapter to my book: Chapter Toot.',
    ],
    [
      'GREAT GALLOPING GALAXIES! The needle hit the red zone and kept going!',
      'Thunderous! My hair is standing on end, and it was already quite tall.',
      'That was a full marching band in one breath. I am speechless. Nearly.',
      'Extraordinary! The penguins in my laboratory have started applauding.',
      'A symphony! A saga! A sneeze of pure brass! Ten beakers out of ten!',
      'I must sit down. No, stand up. No, sit down. What a toot!',
      'The windows rattled with joy. I shall need a bigger Tootometer.',
      'Phenomenal wobble! The scientific community will be talking for weeks.',
      'I have seen many toots, young genius, but that one waved at me.',
      'Spectacular! I am naming a comet after this. Comet Pfftley.',
      'Astonishing power, gorgeous tone. That was a tuba with a jet pack.',
      'My monocle fell into my tea. Highest possible honour.',
    ],
    [
      'HISTORIC! Fetch the gold medal, fetch the tiny orchestra, fetch my best bow tie!',
      'This is the toot I have dreamed of since I was a small professor.',
      'Ladies, gentlemen and penguins: we have a Nobel Toot Prize contender!',
      'Perfection. The beakers have formed a conga line.',
      'I am rewriting every textbook. They will all begin with this toot.',
      'Legendary! Even the moon turned around to listen.',
      'The Tootometer exploded into confetti. I will need a new one, and I do not mind at all.',
      'I am overcome. Please, someone, hand me a hankie and a trophy.',
      'A once-in-a-century trumpet! Mark the calendar! Ring the bells!',
      'Pure genius. I am framing the waveform and hanging it in the lobby.',
      'That toot had a beginning, a middle and a standing ovation.',
      'Magnificent! I hereby declare today International Toot Day.',
    ],
  ],
  reggie: [
    [
      'Hmm. A subtle amuse-bouche of a toot. One monocle out of ten, but a very shiny monocle.',
      'Delicate. Understated. Possibly shy. I shall allow it.',
      'A light little pfft, like a soufflé that forgot to rise. Still rather sweet.',
      'One detects a whisper of kazoo. A promising beginning, darling.',
      'Charming in a quiet sort of way, like a library with good manners.',
      'Rather like a cup of tea gone slightly lukewarm. Comforting, nonetheless.',
      'Modest. Polite. The toot equivalent of a tidy napkin fold.',
      'I adjusted my monocle and very nearly heard it. Two monocles.',
      'A gentle breeze. Refreshing, if you squint.',
      'The chef has been shy this evening. I look forward to the next course.',
      'A small toot with big ambitions. I respect ambition.',
      'Subtle notes of balloon and a faint finish of squeak. Pleasant.',
    ],
    [
      'Hmm. Bold. Brave. A little bit trombone. Seven monocles out of ten.',
      'A sensible toot with a firm handshake. I approve, mostly.',
      'Notes of rubber duck, a hint of bicycle horn. Well balanced.',
      'Quite respectable. I would serve this at a garden party.',
      'A decent recipe. Not the finest, but I would order it again.',
      'There is a certain je ne sais pfft about it. Five monocles.',
      'Pleasant body, cheeky finish. Rather like a good scone.',
      'I raised one eyebrow. Not both. But one is considerable.',
      'The texture is wobbly, as it should be. A tidy performance.',
      'Agreeable. It would pair nicely with a polite round of applause.',
      'Hmm, yes. A toot of good breeding. Six monocles.',
      'Well-seasoned with squeak. The kitchen is warming up.',
    ],
    [
      'Ah! Now we are dining. Robust brass, lively wobble. Eight monocles!',
      'Marvellous. A full-bodied trumpet with a long, elegant finish.',
      'I nearly dropped my teacup. In a good way. In a very good way.',
      'Exquisite pitch. One can tell this toot went to a very good school.',
      'A delightful bouquet of tuba and kazoo. My compliments to the chef.',
      'Rather splendid. I shall mention it in my column on Sunday.',
      'It has poise, it has wobble, it has a certain swagger. Bravo.',
      'Crisp attack, generous body. I am adding it to the menu. The toot menu.',
      'Oh, I say! That had the confidence of a duck in a bow tie.',
      'My monocle popped out and asked for seconds.',
      'Superbly plated. A toot of distinction and good taste.',
      'Most impressive. I shall have to loosen my cravat.',
    ],
    [
      'Good heavens! A banquet of brass! Nine monocles, and I borrowed one!',
      'Sublime. I have dined in the finest halls of Europe, and none tooted like that.',
      'Magnificent! Even my butler gasped, and he never gasps.',
      'A thunderous, velvety masterpiece. I must lie down on a chaise longue.',
      'Oh my word. That toot deserves its own silver platter.',
      'Glorious! Notes of marching band, a long finish of fireworks.',
      'I am adding three stars to my guide. Possibly four. Possibly a moon.',
      'Breathtaking. My moustache curled all by itself.',
      'Rarely have I tasted a sound so bold. Chef, come out and take a bow!',
      'A five-course toot. I am positively stuffed with delight.',
      'Splendiferous! I shall write a sonnet about it after tea.',
      'The monocles are lining up to applaud. All nine of them.',
    ],
    [
      'PERFECTION. Ten monocles out of ten. I have run out of monocles.',
      'The finest toot of the season. I am weeping into my napkin.',
      'Exceptional! Ring the dinner gong! Summon the tiny orchestra!',
      'This toot has been knighted. Arise, Sir Toot.',
      'A legendary classic. I shall keep it in a golden jar forever.',
      'I have nothing to criticise. This has never happened before. I feel faint.',
      'Bravissimo! The royal family has requested an encore.',
      'Utterly flawless. My cravat untied itself in admiration.',
      'Haute cuisine of the highest toot. Michelin would award it three trumpets.',
      'I am speechless. Fetch me a fresh monocle and a trophy.',
      'A masterpiece for the ages. The swans on the lake have bowed.',
      'Simply sublime. My next column will be one word long: WOW.',
    ],
  ],
  coach: [
    [
      'And it is a soft little tap! Not a goal yet, but the crowd likes the hustle!',
      'A gentle warm-up lap! Stretch those squeaky muscles, champ!',
      'Quiet start from the rookie! Every legend has a first practice!',
      'The ball rolls slowly... slowly... and stops. Still counts as effort, folks!',
      'A cautious opening play! The coach says: more wobble next time!',
      'Light jog around the track! Save some energy for the finals!',
      'He winds up... and it is a polite little bunt! On base, at least!',
      'Soft serve from the baseline! Keep practising that swing!',
      'The crowd leans in to listen! That is called suspense, folks!',
      'A sneaky tiptoe play! The referee did not even notice!',
      'Small kick, big heart! Coach believes in you!',
      'Tiny tap-in! We will take the point and go again!',
    ],
    [
      'Nice play! Solid form, good follow-through!',
      'A tidy pass down the wing! The team is warming up now!',
      'He winds up... and it is a base hit! Nice and steady!',
      'Good hustle on that one! The bench is clapping!',
      'Clean technique, decent power! A strong mid-table performance!',
      'That had some wobble on the ball! Tricky for the goalkeeper!',
      'A respectable dunk! Not a slam, but the hoop felt it!',
      'Steady paddle, steady pace! The canoe team approves!',
      'Good lap time! We are moving up the leaderboard of my heart!',
      'Nice serve! It clipped the net and still went over!',
      'A sturdy tackle! Clean, fair and slightly squeaky!',
      'Smart play! Let us see the replay... yep, that is a keeper!',
    ],
    [
      'He winds up... AND IT IS A HOME RUN, FOLKS!',
      'What a strike! Top corner! The goalkeeper is still looking for it!',
      'Let us see that in slow-mo... look at the WOBBLE on that!',
      'Big power from the baseline! Ace! Ace! Ace!',
      'Touchdown! The mascot is doing a happy dance!',
      'That is a slam dunk, and the backboard is wobbling!',
      'Massive effort! The crowd is on its feet! The penguins are on their feet!',
      'Gold medal form on that toot! The judges are nodding!',
      'Breakaway! Nobody can catch that toot!',
      'The commentary box is shaking! What a play!',
      'Hat trick! Three wobbles in one toot! Is that even legal?',
      'Incredible footwork on that squeak! Pure talent!',
    ],
    [
      'OH MY GOODNESS! That toot just broke the stadium record!',
      'Slow-mo replay... and you can SEE the air ripple! Unbelievable!',
      'That was a triple backflip with a twist! Perfect tens across the board!',
      'Grand slam! Bases loaded! The hot-dog seller dropped his tongs!',
      'He shoots from the halfway line... GOOOAL! What a beauty!',
      'The scoreboard just caught fire. Figuratively! It is fine! It is great!',
      'This is a championship-winning toot, folks! Get the confetti cannon!',
      'Power, precision, wobble! That is the full package!',
      'I have been commentating for forty years and I have never seen THAT!',
      'Somebody call the record books! And then call your grandma!',
      'A thunder-dunk from the free-throw line! Hall of Fame stuff!',
      'The crowd is doing the wave! The ocean is doing the wave!',
    ],
    [
      'IT IS THE GREATEST TOOT IN THE HISTORY OF SPORT! I AM CRYING!',
      'World record! Olympic record! Galactic record! Somebody hold me!',
      'They will build a statue for this toot! A big brass statue!',
      'The final whistle blows and it is a LEGENDARY VICTORY!',
      'Slow-mo replay... in super slow-mo... in ULTRA slow-mo... PERFECTION!',
      'That toot just won the World Cup, the Super Bowl and the egg-and-spoon race!',
      'Ladies and gentlemen, we are witnessing GREATNESS!',
      'Hand that toot the trophy! Hand it ALL the trophies!',
      'I am throwing my headset in the air! WHAT A FINISH!',
      'The crowd has lifted the champion onto their shoulders! Gently! Safely!',
      'That is a perfect game, folks! Not a single wobble out of place!',
      'Retire the jersey! Nobody will ever toot like that again!',
    ],
  ],
};

export const PAIRINGS = [
  'Pairs beautifully with a whoopee cushion and a very serious meeting of penguins.',
  'Pairs nicely with a rainy afternoon and a bowl of popcorn.',
  'Best enjoyed during a quiet game of chess.',
  'Pairs well with a grandparent pretending not to hear it.',
  'Serve chilled, next to a sleeping cat.',
  'Recommended with a tuba solo and a slice of birthday cake.',
  'Pairs perfectly with an innocent whistle and a straight face.',
  'Best served right after someone says, "Did you hear that?"',
  'Goes wonderfully with a marching band and a parade of ducks.',
  'Pairs with a fancy hat and a very confused butler.',
  'Excellent with a squeaky chair and a family photo.',
  'Best enjoyed in a hall with excellent echo.',
  'Pairs well with pancakes and a surprised dog.',
  'Delightful alongside a game of musical chairs.',
  'Pairs nicely with a library book about trumpets.',
  'Best enjoyed with a cup of cocoa and a cheeky grin.',
  'Recommended with a bouncy castle and a polite round of applause.',
  'Pairs beautifully with a tiny orchestra and a big bow.',
  'Serve with a side of giggles and a sprinkle of confetti.',
  'Pairs well with a penguin in a bow tie.',
];

export const RARE_REACTIONS = [
  { id: 'glasses', title: 'The glasses flew off!', line: 'My spectacles have left the building! That toot was too powerful for glass!' },
  { id: 'confetti', title: 'Tootometer explosion!', line: 'KA-PFFT! The Tootometer has exploded into confetti. Worth it.' },
  { id: 'nobel', title: 'Nobel Toot Prize!', line: 'A tiny orchestra plays as you receive the golden Nobel Toot Prize. Please bow.' },
];

export function bandFor(score) {
  return BANDS.findIndex((b) => score >= b.min && score <= b.max);
}

// Deterministic choice with no repeat within the last 15 reviews.
export function chooseLine(judgeId, score, seed, recent) {
  const band = bandFor(score);
  const lines = LINES[judgeId][band];
  let idx = seed % lines.length;
  for (let k = 0; k < lines.length; k++) {
    const id = `${judgeId}:${band}:${(idx + k) % lines.length}`;
    if (!recent.includes(id)) { idx = (idx + k) % lines.length; break; }
  }
  const pairingIdx = Math.floor(seed / 7) % PAIRINGS.length;
  return { band, badge: BANDS[band].badge, line: lines[idx], lineId: `${judgeId}:${band}:${idx}`, pairing: PAIRINGS[pairingIdx] };
}

// Group-specific remarks: one extra pre-written line about the kind of sound (real CC0 sample groups).
// 3 lines per group per judge. Chosen deterministically from the analysis seed.
export const GROUP_LINES = {
  prof: {
    whoopee: ['Aha, the classic cushion! A true laboratory standard.', 'Whoopee cushion detected. My research grant was worth it.', 'The cushion of science has spoken. Peer review: giggles.'],
    squeak: ['A high squeak! My glasses nearly fogged up.', 'Squeak frequency: very high. Mouse community: impressed.', 'Such a squeaky specimen. I shall file it under Tiny Trumpets.'],
    tuba: ['A deep brassy note. The tuba section would be proud.', 'Low and round, like a tuba humming in its sleep.', 'Brass detected! I must polish my Tootometer.'],
    classic: ['A textbook toot. I shall put it in my textbook.', 'The classic recipe: short, sharp and scientific.', 'Exactly the toot from my lecture slides. Splendid.'],
    cartoon: ['It echoes! Like a toot in a very large cartoon canyon.', 'Boing, boing, echo. This toot belongs on Saturday morning TV.', 'Echo detected. The toot is still bouncing around my lab.'],
    wet: ['A bubbly blurp! Like a straw slurping the last of a milkshake.', 'Very bubbly. Hand me my rubber duck for scale.', 'Gurgle level: high. Swimming lessons recommended.'],
    tiny: ['A micro-toot! I need my magnifying glass.', 'Small but mighty, like an ant playing the trumpet.', 'Barely there. A ninja toot. Most impressive stealth.'],
    double: ['Two toots for the price of one. Excellent value for science.', 'A double act! Toot and its little echo, best friends.', 'Encore detected! The toot came back for a bow.'],
    sequence: ['A whole parade of toots! I lost count at four.', 'A toot in several chapters. I await the sequel.', 'Toot, toot, toot! It is practically Morse code.'],
    ripper: ['A long rumbling ripper! My beakers are still wobbling.', 'Rumble detected on all my instruments. Hold on to your lab coat.', 'That one went on and on, like a very proud motorbike.'],
  },
  reggie: {
    whoopee: ['Ah, the cushion classic. A dish served at every fine party.', 'A whoopee cushion of rare pedigree. I tip my hat.', 'Simple ingredients, perfectly pressed. A cushion masterpiece.'],
    squeak: ['A delicate squeak, light as a soufflé.', 'High notes like a teacup clinking. Most refined.', 'A squeaker with real finesse. I shall dab my moustache.'],
    tuba: ['Deep and velvety, like a hot chocolate in brass form.', 'A rich, low note. I detect hints of marching band.', 'Hearty and round, like a good gravy. Superb.'],
    classic: ['A classic, cooked exactly as Grandmother made it.', 'Traditional and honest. No fancy garnish needed.', 'The toot equivalent of a perfect cup of tea.'],
    cartoon: ['It echoes through the dining hall. How theatrical!', 'A toot with its own reverb. Dramatic plating.', 'One toot, served with a side of echo. Delightful.'],
    wet: ['A bubbly blurp, like soup that is very pleased with itself.', 'Rather fizzy. I shall need a larger napkin.', 'Effervescent! Like lemonade with opinions.'],
    tiny: ['An amuse-bouche of a toot. Small, but it amused me.', 'A petite portion. I could have had seconds.', 'A tiny canapé of sound. Exquisite.'],
    double: ['A two-course toot. Starter and main, both excellent.', 'Served twice, enjoyed twice. Splendid.', 'A double helping! The chef was generous today.'],
    sequence: ['A tasting menu of toots, one after another.', 'Several small courses, each a surprise. Bravo.', 'A buffet of toots. I shall try them all.'],
    ripper: ['A grand, long finish. The aftertaste goes on for days.', 'A banquet-sized rumble. Fetch the trolley!', 'Bold, booming and proud. A feast for the ears.'],
  },
  coach: {
    whoopee: ['The classic cushion play! Textbook from the whole team!', 'Whoopee on the scoreboard! The crowd goes wild!', 'Old-school cushion move, and it still works every time!'],
    squeak: ['A high squeak down the wing! What speed!', 'Squeaky sneakers on the court! Love the hustle!', 'That squeak hit the top corner of the net!'],
    tuba: ['Big brass power from the back line!', 'That low note shook the stadium seats!', 'Tuba time! The marching band just got a new captain!'],
    classic: ['A classic move, perfectly executed!', 'Straight down the middle. Fundamentals win games!', 'No tricks, just a clean toot. Coach is proud!'],
    cartoon: ['It is echoing round the stadium! Unbelievable scenes!', 'Toot, echo, echo! The replay is playing itself!', 'That one bounced off every wall in the arena!'],
    wet: ['A bubbly blurp! Somebody check the water bottle!', 'Splash play! The pool team wants you!', 'Fizzy and fearless! What a shot!'],
    tiny: ['A tiny tap-in! Small shots still count!', 'Sneaky little toot past the goalie!', 'Quick and quiet. The defence never saw it coming!'],
    double: ['A one-two combination! Brilliant teamwork!', 'Double toot! Two points on the board!', 'Bang, bang! The crowd is on its feet twice!'],
    sequence: ['A full relay of toots! Pass, pass, pass, score!', 'What a combo! Somebody count those!', 'Toot after toot after toot! Unstoppable!'],
    ripper: ['A long rumbling run down the whole field!', 'Rumble in the stadium! That went on for a whole lap!', 'Massive power, massive length, massive cheer!'],
  },
};

export function chooseGroupLine(judgeId, group, seed) {
  const lines = GROUP_LINES[judgeId] && GROUP_LINES[judgeId][group];
  if (!lines) return null;
  return lines[(Math.floor(seed / 13) >>> 0) % lines.length];
}
