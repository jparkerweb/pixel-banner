import emojiKeywords from 'emojilib';

// Export all emojis with their keywords for search
export const emojiData = Object.entries(emojiKeywords).map(([emoji, keywords]) => ({
  emoji,
  keywords: keywords.join(' ')
}));