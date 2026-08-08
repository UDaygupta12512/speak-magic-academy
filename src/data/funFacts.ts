export interface FunFact {
  id: string;
  fact: string;
  emoji: string;
  category: string;
}

export const funFacts: FunFact[] = [
  {
    id: "queue",
    fact: "Queue is the only word where the last four letters are silent.",
    emoji: "🔤",
    category: "Spelling",
  },
  {
    id: "alphabet-pangram",
    fact: "The sentence 'The quick brown fox jumps over the lazy dog' contains every letter of the English alphabet.",
    emoji: "🦊",
    category: "Words",
  },
  {
    id: "longest-word",
    fact: "The longest word in English has 189,819 letters and takes over 3 hours to pronounce!",
    emoji: "📏",
    category: "Words",
  },
  {
    id: "no-rhyme",
    fact: "The words 'orange', 'silver', 'purple', and 'month' have no perfect rhymes in English.",
    emoji: "🍊",
    category: "Rhymes",
  },
  {
    id: "oldest-word",
    fact: "'Town' is one of the oldest English words, used for over 1,000 years!",
    emoji: "🏘️",
    category: "History",
  },
  {
    id: "shakespeare",
    fact: "Shakespeare invented over 1,700 words we still use today, like 'eyeball' and 'bedroom'.",
    emoji: "🎭",
    category: "Authors",
  },
  {
    id: "set-meanings",
    fact: "The word 'set' has the most definitions of any English word — over 430!",
    emoji: "📚",
    category: "Words",
  },
  {
    id: "e-most-common",
    fact: "The letter 'E' is the most commonly used letter in the English language.",
    emoji: "🔠",
    category: "Letters",
  },
  {
    id: "uncopyrightable",
    fact: "'Uncopyrightable' is the longest English word with no repeating letters.",
    emoji: "✨",
    category: "Words",
  },
  {
    id: "i-am",
    fact: "'I am' is the shortest complete sentence in the English language.",
    emoji: "💬",
    category: "Grammar",
  },
  {
    id: "dreamt",
    fact: "'Dreamt' is the only common English word that ends in the letters 'mt'.",
    emoji: "💭",
    category: "Spelling",
  },
  {
    id: "goodbye",
    fact: "The word 'goodbye' originally came from the phrase 'God be with you'!",
    emoji: "👋",
    category: "History",
  },
];
