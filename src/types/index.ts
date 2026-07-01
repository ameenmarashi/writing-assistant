export type IssueCategory = 'grammar' | 'style' | 'clarity';

export interface RuleMatch {
  start: number;
  end: number;
  matchedText: string;
  message: string;
  suggestion?: string;
}

export interface Rule {
  id: string;
  category: IssueCategory;
  description: string;
  test: (plainText: string) => RuleMatch[];
}

export interface Issue {
  id: string;
  ruleId: string;
  category: IssueCategory;
  message: string;
  start: number;
  end: number;
  matchedText: string;
  suggestion?: string;
}
