import type { Issue, Rule } from '../types';

const FILLER_WORDS = ['very', 'just', 'really', 'actually', 'basically', 'literally'];
const STOPWORDS = new Set([
  'about', 'after', 'again', 'their', 'there', 'these', 'those', 'which',
  'while', 'would', 'could', 'should', 'because', 'before', 'other',
  'through', 'where', 'being', 'shall', 'still', 'every', 'first',
]);

function wordBoundaryRegex(words: string[]): RegExp {
  return new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
}

const doubledWordRule: Rule = {
  id: 'doubled-word',
  category: 'grammar',
  description: 'Flags immediately repeated words, e.g. "the the".',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const regex = /\b(\w+)([ \t]+)\1\b/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        matchedText: m[0],
        message: `Repeated word "${m[1]}"`,
        suggestion: m[1],
      });
    }
    return matches;
  },
};

const yourYoureRule: Rule = {
  id: 'your-youre',
  category: 'grammar',
  description: 'Flags likely your/you\'re confusion.',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const regex = /\byour\b\s+\b(going|doing|welcome|right|kidding|the best|amazing)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        matchedText: m[0],
        message: 'Did you mean "you\'re" (you are)?',
      });
    }
    return matches;
  },
};

const itsItsRule: Rule = {
  id: 'its-its',
  category: 'grammar',
  description: 'Flags likely its/it\'s confusion.',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const regex = /\bits\b\s+(a|the|been|not|so|very)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      matches.push({
        start: m.index,
        end: m.index + 3,
        matchedText: text.slice(m.index, m.index + 3),
        message: 'Check "its" (possessive) vs "it\'s" (it is) usage here.',
      });
    }
    return matches;
  },
};

const fillerWordRule: Rule = {
  id: 'filler-word',
  category: 'style',
  description: 'Flags common filler words that weaken writing.',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const regex = wordBoundaryRegex(FILLER_WORDS);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        matchedText: m[0],
        message: `Consider removing the filler word "${m[0]}"`,
        suggestion: '',
      });
    }
    return matches;
  },
};

const longSentenceRule: Rule = {
  id: 'long-sentence',
  category: 'clarity',
  description: 'Flags sentences over 35 words long.',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const sentenceRegex = /[^.!?]+[.!?]+|\S[^.!?]*$/g;
    let m: RegExpExecArray | null;
    while ((m = sentenceRegex.exec(text))) {
      const sentence = m[0];
      const wordCount = sentence.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 35) {
        const start = m.index;
        const end = m.index + sentence.length;
        matches.push({
          start,
          end,
          matchedText: sentence,
          message: `This sentence is long (${wordCount} words) — consider splitting it.`,
        });
      }
    }
    return matches;
  },
};

const nearbyRepeatRule: Rule = {
  id: 'nearby-repeat',
  category: 'style',
  description: 'Flags a content word repeated again within ~30 words.',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const wordRegex = /\b[a-zA-Z]{5,}\b/g;
    const seen: { word: string; index: number; end: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = wordRegex.exec(text))) {
      const word = m[0].toLowerCase();
      if (STOPWORDS.has(word)) continue;
      const prior = seen.find((s) => s.word === word);
      if (prior) {
        const wordsBetween = text
          .slice(prior.end, m.index)
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
        if (wordsBetween <= 30) {
          matches.push({
            start: m.index,
            end: m.index + m[0].length,
            matchedText: m[0],
            message: `"${m[0]}" is repeated nearby — consider a synonym.`,
          });
        }
      }
      seen.push({ word, index: m.index, end: m.index + m[0].length });
    }
    return matches;
  },
};

const passiveVoiceRule: Rule = {
  id: 'passive-voice',
  category: 'style',
  description: 'Flags a common passive-voice construction pattern.',
  test(text) {
    const matches: ReturnType<Rule['test']> = [];
    const regex = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        matchedText: m[0],
        message: 'Possible passive voice — consider an active construction.',
      });
    }
    return matches;
  },
};

export const RULES: Rule[] = [
  doubledWordRule,
  yourYoureRule,
  itsItsRule,
  fillerWordRule,
  longSentenceRule,
  nearbyRepeatRule,
  passiveVoiceRule,
];

export function checkText(text: string): Issue[] {
  const issues: Issue[] = [];
  for (const rule of RULES) {
    for (const match of rule.test(text)) {
      issues.push({
        id: `${rule.id}-${match.start}-${match.end}`,
        ruleId: rule.id,
        category: rule.category,
        message: match.message,
        start: match.start,
        end: match.end,
        matchedText: match.matchedText,
        suggestion: match.suggestion,
      });
    }
  }
  return issues.sort((a, b) => a.start - b.start);
}
