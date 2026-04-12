/**
 * The Situation Library — the moat.
 *
 * Each entry maps a specific hard moment in a child's life to a carefully
 * crafted prompt-framing paragraph that tells the book-generation agent how to
 * shape the emotional arc. The topic field on the form is still what the book
 * is about on the surface (e.g. "a brave little fox who learns to share"), but
 * when a situation is picked we layer this framing on top so the story serves
 * the real emotional need (e.g. a new sibling arriving next month).
 *
 * Rules we follow across every template:
 *   1. Name the feeling honestly. Never minimize, never promise "everything
 *      will be fine." The child is trusted to carry the feeling.
 *   2. Start in the child's familiar world before the change appears, so they
 *      see their own ordinary life on the page.
 *   3. Age 2-4: use action, sensory detail, repetition, and a steady adult
 *      presence. Age 4-7: add inner reflection and a small, age-appropriate
 *      choice the protagonist makes.
 *   4. Land on "the feeling makes sense, and you are loved through it" — not
 *      on erasure of the feeling.
 *   5. No medical claims, no therapy language, no "the brain does X" framing.
 *      This is a picture book, not a bibliotherapy treatise.
 *   6. The parent's role is present but quiet — a hand, a voice, a room still
 *      lit at bedtime. We never lecture the child through the adult.
 */

export type AgeRange = '2-4' | '4-7' | 'both';

export interface Situation {
  /** URL-safe ID stored on the job doc. */
  slug: string;
  /** Label shown in the picker dropdown. */
  label: string;
  /** Short hint shown under the label — names the emotional core. */
  hint: string;
  /** Rough age band this template is tuned for. */
  ageRange: AgeRange;
  /** The prompt framing paragraph injected into the book-generation prompt. */
  promptTemplate: string;
}

export const SITUATIONS: Situation[] = [
  {
    slug: 'new-sibling',
    label: 'A new sibling is coming',
    hint: 'jealousy, identity, feeling replaced',
    ageRange: 'both',
    promptTemplate:
      'The child this book is being made for is preparing for a new baby sibling. The feeling to name is the quiet fear of being loved less, replaced, or becoming invisible — not excitement about the baby. Open inside an ordinary moment of the protagonist being cherished by their parent (a shared snack, a bedtime story, a hand on their back). Let the change arrive gently, not as news but as a soft observation the child makes about the house changing. The protagonist should feel the hard feeling plainly, without shame, and without anyone around them rushing to correct it. The resolution is not that the new baby will be fun; it is that the protagonist is still, and always, the one their parent reaches for first. End on a small, specific physical gesture (a hand, a whisper, a shared look) that belongs only to the protagonist.',
  },
  {
    slug: 'first-day-school',
    label: 'First day of school',
    hint: 'separation, strangers, new routine',
    ageRange: 'both',
    promptTemplate:
      'The child this book is being made for is about to start school (or preschool) for the first time. The feeling to name is the tight, stomach-low fear of being dropped off and not knowing how long forever is. Open inside the safe, known world of home — the smell of breakfast, the weight of a familiar blanket. Let the new place arrive as something vivid and unfamiliar but never scary in a loud way. The protagonist is allowed to feel small. They do not magically make a best friend by page three. What they discover instead is one small specific thing that belongs to them in the new place — a hook with their name on it, a patch of sunlight on the carpet, a teacher who remembers how they take their milk. End on the parent returning, because the parent always returns, and that is the thing the book actually proves.',
  },
  {
    slug: 'grief-pet',
    label: 'Losing a pet',
    hint: 'death, absence, first loss',
    ageRange: 'both',
    promptTemplate:
      "The child this book is being made for has lost (or is about to lose) a beloved pet. Do not use the word 'heaven,' and do not promise the pet is 'just sleeping' or 'waiting somewhere.' The feeling to name is the sharp confusion of an empty spot — the bowl, the corner of the bed, the sound of nails on the floor. Use the pet's kind in the story, not the real name (the agent will personalize the protagonist name separately). Let the protagonist remember one specific, ordinary thing the pet did — how they sighed before sleep, how they followed the sun across the floor. The resolution is not that the pet comes back or lives on in the stars. It is that love doesn't disappear when the body does — the protagonist still loves their pet, out loud, and that love has a real place to live in the story. End on the protagonist saying goodbye in their own words, small and honest.",
  },
  {
    slug: 'grief-grandparent',
    label: 'A grandparent is gone',
    hint: 'death, memory, the big goodbye',
    ageRange: '4-7',
    promptTemplate:
      "The child this book is being made for has lost a grandparent. Do not name a cause of death, do not use 'heaven,' do not frame the death as a journey or a sleep. The feeling to name is the strange quiet of a person-shaped hole — a chair nobody sits in, a phone that doesn't ring, a smell that is slowly fading from a sweater. Build the story around one small ritual the protagonist and the grandparent shared (a song at the sink, a walk to a bench, a way of cracking eggs). Let the protagonist practice the ritual alone once in the story, and feel the ache of it, and also feel that the ritual is still real because they are still doing it. The resolution is not 'they live on forever in your heart,' which is too abstract. It is 'you get to keep what they taught your hands.' End on the protagonist teaching the ritual to someone else — a sibling, a friend, a stuffed animal.",
  },
  {
    slug: 'divorce',
    label: 'Parents separating',
    hint: 'two homes, stability, guilt',
    ageRange: '4-7',
    promptTemplate:
      "The child this book is being made for is living through their parents separating or divorcing. The three feelings to name, gently and without clinical words: (1) the fear that it's their fault, (2) the confusion of two homes, (3) the sadness of the old one ending. The template must explicitly reassure — through story, not lecture — that the protagonist did not cause this and cannot undo it. Show both homes as real places with real love in them, not one good and one bad. Give the protagonist a single object that travels with them between the two homes — a stuffed animal, a drawing, a small rock — so they can feel continuous even when the address changes. The resolution is not that the parents get back together, and it is not that two homes is secretly fun. It is that love does not split when a house does. End on the protagonist being tucked in, in whichever home the story lands in, by a parent who is fully present.",
  },
  {
    slug: 'moving',
    label: 'Moving to a new home',
    hint: 'leaving friends, unfamiliar place',
    ageRange: 'both',
    promptTemplate:
      'The child this book is being made for is moving to a new home, possibly a new city. The feeling to name is the specific grief of leaving a place your body has memorized — the creak on the third stair, the window that caught the morning sun, the neighbor who waved. Do not skip over the goodbye. Let the protagonist touch the old walls, one by one, and say goodbye on the page. The new place should arrive strange and slightly too quiet, not as an upgrade. The protagonist discovers one small specific thing in the new place that they can claim — a patch of ceiling paint, a spot at the window where the light lands the same way. The resolution is that the old home lives in the protagonist now, and new homes are things you get to make slowly, not things that replace old ones. End on the protagonist unpacking one specific object from the old house and finding it a place on purpose.',
  },
  {
    slug: 'nightmares',
    label: 'Bad dreams & the dark',
    hint: 'fear at night, monsters, sleep',
    ageRange: '2-4',
    promptTemplate:
      "The child this book is being made for is afraid of the dark or waking from bad dreams. Do not dismiss the fear as silly, and do not have a grown-up explain that monsters aren't real — explanation does not work against fear. The feeling to name is the full-body alertness of a child in a quiet room where shapes move. Build the story around a small, specific brave thing the protagonist can do with their body — press their feet to the floor, count the edges of the blanket, name three things they can hear. The dark is not defeated in the story, because the dark comes back every night. Instead the protagonist learns that the dark does not get to decide how they feel inside of it. The parent figure appears once, steady and quiet, not to banish anything but to be there. End on the protagonist closing their eyes on their own terms, not because the fear is gone but because they are allowed to rest.",
  },
  {
    slug: 'doctor-visit',
    label: 'A doctor visit is coming',
    hint: 'shots, strangers, being examined',
    ageRange: 'both',
    promptTemplate:
      "The child this book is being made for has a doctor's visit coming up, possibly with a shot. Do not promise it won't hurt, and do not frame the doctor as a friend who makes things fun. The feeling to name is the loss of control — other people touching your body, cold rooms, bright lights, being looked at. Walk the protagonist through the visit in concrete sensory detail: the crinkle of paper on the table, the stethoscope being warmed, the specific moment of the shot. Acknowledge that the shot hurts for a small second. The protagonist's parent is in the room the whole time — a hand to hold, a face to look at. The resolution is not bravery as the absence of fear; it is staying, with the fear, because the parent is staying too. End on the protagonist walking out of the office on their own two feet, still the same child.",
  },
  {
    slug: 'dentist-visit',
    label: 'First dentist visit',
    hint: 'mouth, strangers, strange tools',
    ageRange: '2-4',
    promptTemplate:
      'The child this book is being made for has a dentist visit coming up. The feeling to name is the specific weirdness of a stranger looking inside your mouth — the bright light, the gloved hand, the whirring sound, the taste of the cleaning paste. Walk through the visit as a sequence of small sensory moments, each named gently. Do not pretend the chair is a spaceship, and do not promise the protagonist will love it. The dentist is a real person doing a real job, and the protagonist is a real child tolerating a strange thing. Give the protagonist a single small tool to help them — a slow breath, a squeeze of a parent hand, counting the ceiling tiles. End on the protagonist walking out with a clean mouth and the quiet pride of having stayed.',
  },
  {
    slug: 'potty-regression',
    label: 'Potty training struggles',
    hint: 'accidents, shame, starting over',
    ageRange: '2-4',
    promptTemplate:
      "The child this book is being made for has been having accidents again after being potty trained, or is struggling through the first weeks of training. The feeling to name is shame — not mess. Do not make the story about success, and do not make the parent disappointed. Accidents happen in the story without any shaming language, and the parent's response is slow, kind, and without a lecture. The protagonist notices the small physical signals of their body in a friendly way (no medical words, just 'a little wiggle down low,' 'a warm feeling in the tummy'). The resolution is not that they get a sticker chart and never have an accident again. It is that their body is learning and they are allowed to learn slowly. End on the protagonist being held — not praised, held — because the goal was never dry pants; it was a child who feels safe in their body.",
  },
  {
    slug: 'parent-travel',
    label: "A parent is going away",
    hint: 'short absence, missing, will they come back',
    ageRange: 'both',
    promptTemplate:
      "The child this book is being made for has a parent going away for a work trip or a short absence. The feeling to name is the wobble under the question 'will they really come back?' — a question that cannot be reassured with words alone. Open on an ordinary evening with the traveling parent, anchored by a small ritual (a song, a specific goodnight, a handshake). Let the departure happen in the story, sad and real. The protagonist practices the ritual without the parent once, and feels the ache of it, and also feels that the ritual still works. The travel is shown as a real place — not a scary place, just a place — so the protagonist has a picture to hold for the missing days. The resolution is the parent coming back, shown clearly on the page, doing the exact same ritual. End on the ritual, not on the suitcase.",
  },
  {
    slug: 'deployment',
    label: "A parent is deployed",
    hint: 'military, long absence, uncertainty',
    ageRange: '4-7',
    promptTemplate:
      "The child this book is being made for has a parent deployed or on a long military absence. Do not romanticize the uniform, and do not dramatize danger. The feeling to name is the long shape of waiting — the way time stretches when someone you love is far away for a reason you can't fully see. Build the story around one shared object that belongs to both the child and the deployed parent (a song, a drawing, a phrase they say at bedtime). The protagonist practices it on their own days and feels the parent still reachable through it. Include one ordinary home scene that also exists in the deployed parent's world — the same moon, the same stars, the same sound of a spoon in a cup — so the two places feel stitched together. The resolution is not the parent coming home in the story's final pages (the story should work even if reunion is far away). The resolution is that love travels in straight lines across distance. End on the protagonist falling asleep held by someone who is home, and known.",
  },
  {
    slug: 'big-feelings',
    label: 'Big feelings they can\u2019t name',
    hint: 'overwhelm, meltdowns, not knowing why',
    ageRange: '2-4',
    promptTemplate:
      "The child this book is being made for is having big feelings they can't name yet — the kind that spill out as tears, or hitting, or lying flat on the floor. The feeling to name is the overwhelm itself, not any one specific emotion. Do not teach the protagonist to label feelings as 'anger' or 'sadness' — that is a step too advanced. Instead, give the big feeling a weather shape: a rumbling cloud, a wave, a thunder in the chest. The protagonist is not bad for having the big feeling. The parent figure does not try to stop the feeling — they sit beside it, quietly, until it passes. The resolution is that the weather always passes, and the child is still the child underneath. End on the protagonist being held after the storm, soft and still, in a quiet that is earned.",
  },
  {
    slug: 'tantrums',
    label: 'Tantrums & hard moments',
    hint: 'loss of control, after-the-meltdown',
    ageRange: '2-4',
    promptTemplate:
      "The child this book is being made for is working through tantrums — the shame of the moment after, the confusion of 'why did I do that,' the fear that the parent is angry. Do not center the tantrum itself. Center the moment after. The feeling to name is the specific tender embarrassment of a small body that has just been out of control. The parent in the story is not angry — not because tantrums are fine, but because the protagonist being ashamed is already enough. The parent kneels and meets the protagonist at eye level. Nothing is explained. A hand is offered. The resolution is that love does not disappear when behavior does. End on the protagonist accepting the hand and being small inside a parent's arms, which are not a reward and not a punishment but simply home.",
  },
  {
    slug: 'new-pet',
    label: 'Welcoming a new pet',
    hint: 'responsibility, gentleness, fear',
    ageRange: 'both',
    promptTemplate:
      "The child this book is being made for is about to welcome a new pet into the home. The feeling to name is a mix of excitement and the nervous kind of tender — 'what if I do it wrong, what if I scare it, what if it doesn't like me.' Do not make the story about teaching responsibility; a picture book is not a chore chart. Walk the protagonist through the first quiet hour with the new pet, when the pet is also afraid. The protagonist discovers that being still and soft is its own language. They do not make the pet love them in the story — they make the pet feel safe. The resolution is that friendships build at the speed of trust. End on the protagonist and the new pet, side by side, not touching, both at rest.",
  },
  {
    slug: 'lost-friend',
    label: 'A friend moved away',
    hint: 'distance, first best friend gone',
    ageRange: '4-7',
    promptTemplate:
      "The child this book is being made for has had a close friend move away. The feeling to name is the specific loneliness of a playground with one missing person — the bench that sat two, the inside joke with no one to say it to. Do not promise they'll make a new best friend. Let the protagonist grieve the friend on the page. The story should include a small ritual the two friends used to share (a handshake, a song, a rhyme). The protagonist practices it alone once and feels the ache. Then they find a small, specific way to send the ritual to the faraway friend — a drawing, a letter, a voice note. The resolution is that distance doesn't break the thing; it just changes the shape. End on the protagonist holding what they sent and what they got back.",
  },
  {
    slug: 'new-school',
    label: 'Switching to a new school',
    hint: 'starting over mid-year, strangers',
    ageRange: '4-7',
    promptTemplate:
      'The child this book is being made for is changing schools mid-year. This is different from a first day of school — the protagonist already knows what school is, and knows what they had. The feeling to name is the grief of the old classroom plus the dread of the new one, stacked on top of each other. Do not skip the old school. Spend real time on what is being left — a friend, a teacher, a hook with their name on it. The new school arrives as unfamiliar but not scary. On day one, the protagonist does not find a new best friend; they find one small, specific thing to hold onto (a kind face, a quiet corner, a book they recognize). The resolution is not that the new school is better. It is that they are allowed to carry the old school with them, and still slowly, slowly, make room for this one. End on them hanging their coat on a new hook, on purpose.',
  },
  {
    slug: 'new-language',
    label: 'A new language at home or school',
    hint: 'feeling different, not being understood',
    ageRange: '4-7',
    promptTemplate:
      "The child this book is being made for is living in a world that speaks a language they are still learning — new country, new school, or a bilingual household. The feeling to name is the loneliness of words that don't come out right, and the exhaustion of listening all day long in a second language. Do not frame bilingualism as a gift in the story; that is a grown-up framing. For a child, right now, it is hard. Acknowledge that. Build the story around one moment when the protagonist doesn't understand and goes quiet, and another moment when they do understand — a single word, a single phrase. The resolution is not fluency. It is the small, warm experience of being understood one time. End on the protagonist holding that one word like a seed.",
  },
  {
    slug: 'parent-illness',
    label: 'A parent is unwell',
    hint: 'illness at home, fear, confusion',
    ageRange: '4-7',
    promptTemplate:
      "The child this book is being made for has a parent who is unwell. Do not name any specific illness, do not promise recovery, do not hide that something has changed. The feeling to name is the confusion of a house where the grown-ups are being quieter than usual and the rules have shifted without a meeting. Reassure, inside the story, two things: (1) the child did not cause the illness, and (2) the child is not expected to fix it. Show a small moment of ordinary tenderness between the protagonist and the unwell parent — a hand held, a story read slowly, a head on a shoulder. The well parent (or another adult) is present and steady in the story. The resolution is not recovery. It is that love is still the atmosphere of the house, even when everything else is uncertain. End on the protagonist being tucked in by an adult who is fully there.",
  },
];

/** Lookup a situation by slug. Returns null for unknown slugs. */
export function getSituation(slug: string | null | undefined): Situation | null {
  if (!slug) return null;
  return SITUATIONS.find((s) => s.slug === slug) ?? null;
}

/** The string value used on the form when the parent picks "Other". */
export const SITUATION_OTHER = 'other';
