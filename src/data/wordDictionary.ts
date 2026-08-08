// Bilingual (English ↔ Hindi) word dictionary used by Word Meaning.
// Each entry includes a simple kid-friendly definition and an example
// sentence in both English and Hindi.

export type WordEntry = {
  word: string;
  hi: string;              // Hindi translation / transliteration
  meaningEn: string;
  meaningHi: string;
  exampleEn: string;
  exampleHi: string;
  category: "feelings" | "nature" | "people" | "action" | "school" | "food" | "adjective";
  emoji: string;
};

export const WORD_DICTIONARY: WordEntry[] = [
  // Feelings
  { word: "Happy",     hi: "खुश",       meaningEn: "Feeling good and full of joy.",              meaningHi: "बहुत अच्छा और खुशी से भरा हुआ महसूस करना।",   exampleEn: "I feel happy when I play with my friends.", exampleHi: "जब मैं अपने दोस्तों के साथ खेलता हूँ तो मुझे खुशी होती है।", category: "feelings", emoji: "😊" },
  { word: "Brave",     hi: "बहादुर",    meaningEn: "Not afraid to do something difficult.",      meaningHi: "मुश्किल काम करने से न डरना।",                   exampleEn: "The brave girl helped the lost puppy.",     exampleHi: "बहादुर लड़की ने खोए हुए पिल्ले की मदद की।", category: "feelings", emoji: "🦁" },
  { word: "Curious",   hi: "जिज्ञासु",  meaningEn: "Wanting to learn or know more.",             meaningHi: "और अधिक जानने या सीखने की इच्छा।",             exampleEn: "She was curious about the shiny box.",      exampleHi: "वह चमकते डिब्बे के बारे में जिज्ञासु थी।",   category: "feelings", emoji: "🤔" },
  { word: "Kind",      hi: "दयालु",     meaningEn: "Nice and caring to others.",                 meaningHi: "दूसरों के साथ अच्छा और परवाह करने वाला।",       exampleEn: "Be kind to animals and people.",           exampleHi: "जानवरों और लोगों के साथ दयालु बनो।",         category: "feelings", emoji: "💗" },
  { word: "Excited",   hi: "उत्साहित",  meaningEn: "Very happy and eager about something.",      meaningHi: "किसी बात को लेकर बहुत खुश और उत्सुक।",         exampleEn: "I am excited for my birthday.",             exampleHi: "मैं अपने जन्मदिन के लिए उत्साहित हूँ।",       category: "feelings", emoji: "🎉" },
  { word: "Calm",      hi: "शांत",      meaningEn: "Quiet and peaceful, not upset.",             meaningHi: "शांत और मन में हलचल न होना।",                  exampleEn: "The lake is calm in the morning.",         exampleHi: "सुबह के समय झील शांत होती है।",              category: "feelings", emoji: "🌊" },

  // Nature
  { word: "Rainbow",   hi: "इंद्रधनुष", meaningEn: "Colorful arch in the sky after rain.",        meaningHi: "बारिश के बाद आकाश में रंगीन धनुष।",             exampleEn: "A rainbow appeared after the shower.",     exampleHi: "बारिश के बाद एक इंद्रधनुष दिखाई दिया।",     category: "nature",   emoji: "🌈" },
  { word: "Mountain",  hi: "पहाड़",     meaningEn: "A very tall piece of land.",                 meaningHi: "बहुत ऊँची ज़मीन का टुकड़ा।",                    exampleEn: "We climbed a big mountain.",               exampleHi: "हमने एक बड़ा पहाड़ चढ़ा।",                   category: "nature",   emoji: "⛰️" },
  { word: "Ocean",     hi: "समुद्र",    meaningEn: "A huge body of salty water.",                meaningHi: "नमकीन पानी का बहुत बड़ा हिस्सा।",              exampleEn: "Dolphins live in the ocean.",              exampleHi: "डॉल्फ़िन समुद्र में रहती हैं।",              category: "nature",   emoji: "🌊" },
  { word: "Forest",    hi: "जंगल",      meaningEn: "A big area full of trees.",                  meaningHi: "पेड़ों से भरा बड़ा इलाका।",                    exampleEn: "Many animals live in the forest.",         exampleHi: "जंगल में बहुत से जानवर रहते हैं।",           category: "nature",   emoji: "🌲" },
  { word: "River",     hi: "नदी",       meaningEn: "Water that flows across the land.",           meaningHi: "ज़मीन पर बहता हुआ पानी।",                       exampleEn: "The river flows to the sea.",              exampleHi: "नदी समुद्र की ओर बहती है।",                   category: "nature",   emoji: "🏞️" },
  { word: "Cloud",     hi: "बादल",      meaningEn: "White or grey shape in the sky made of tiny water drops.", meaningHi: "आकाश में पानी की बूंदों से बना सफ़ेद या भूरा आकार।", exampleEn: "The clouds look like cotton candy.",       exampleHi: "बादल रुई की मिठाई जैसे दिखते हैं।",           category: "nature",   emoji: "☁️" },

  // People / relationships
  { word: "Friend",    hi: "दोस्त",     meaningEn: "Someone you like and enjoy being with.",     meaningHi: "जिस के साथ रहना अच्छा लगे।",                    exampleEn: "My friend shares her lunch with me.",      exampleHi: "मेरी दोस्त अपना खाना मेरे साथ बाँटती है।",   category: "people",   emoji: "🤝" },
  { word: "Family",    hi: "परिवार",    meaningEn: "Your parents, brothers, sisters and relatives.", meaningHi: "आपके माता-पिता, भाई-बहन और रिश्तेदार।",     exampleEn: "I love my family very much.",              exampleHi: "मैं अपने परिवार से बहुत प्यार करता हूँ।",     category: "people",   emoji: "👨‍👩‍👧" },
  { word: "Teacher",   hi: "शिक्षक",    meaningEn: "A person who helps you learn.",              meaningHi: "एक व्यक्ति जो आपको सीखने में मदद करता है।",     exampleEn: "My teacher tells fun stories.",            exampleHi: "मेरे शिक्षक मज़ेदार कहानियाँ सुनाते हैं।",     category: "people",   emoji: "👩‍🏫" },
  { word: "Neighbor",  hi: "पड़ोसी",     meaningEn: "A person who lives next to you.",             meaningHi: "जो आपके घर के पास रहता है।",                    exampleEn: "Our neighbor has a friendly dog.",         exampleHi: "हमारे पड़ोसी के पास एक प्यारा कुत्ता है।",     category: "people",   emoji: "🏘️" },

  // Actions
  { word: "Discover",  hi: "खोजना",     meaningEn: "To find something new.",                     meaningHi: "कुछ नया ढूँढना।",                                exampleEn: "We discovered a hidden path.",             exampleHi: "हमने एक छिपा हुआ रास्ता खोजा।",              category: "action",   emoji: "🔍" },
  { word: "Imagine",   hi: "कल्पना करना",meaningEn: "To make a picture in your mind.",            meaningHi: "अपने मन में तस्वीर बनाना।",                     exampleEn: "Imagine you can fly like a bird.",         exampleHi: "कल्पना करो कि तुम पक्षी की तरह उड़ सकते हो।", category: "action",   emoji: "💭" },
  { word: "Create",    hi: "बनाना",     meaningEn: "To make something new.",                     meaningHi: "कुछ नया बनाना।",                                exampleEn: "I created a paper airplane.",              exampleHi: "मैंने एक कागज़ का हवाई जहाज़ बनाया।",         category: "action",   emoji: "🎨" },
  { word: "Explore",   hi: "खोज करना",  meaningEn: "To travel and look around a new place.",     meaningHi: "नई जगह घूमकर देखना।",                            exampleEn: "Let's explore the park today.",            exampleHi: "आज पार्क में खोज करते हैं।",                 category: "action",   emoji: "🧭" },
  { word: "Practice",  hi: "अभ्यास",    meaningEn: "To do something again and again to get better.", meaningHi: "बेहतर बनने के लिए बार-बार करना।",           exampleEn: "I practice singing every day.",            exampleHi: "मैं हर दिन गाने का अभ्यास करती हूँ।",         category: "action",   emoji: "🎯" },
  { word: "Whisper",   hi: "फुसफुसाना", meaningEn: "To speak very softly.",                      meaningHi: "बहुत धीरे से बोलना।",                            exampleEn: "She whispered the secret.",                exampleHi: "उसने राज़ फुसफुसाकर कहा।",                    category: "action",   emoji: "🤫" },

  // School
  { word: "Adventure", hi: "साहसिक कार्य", meaningEn: "An exciting and unusual experience.",    meaningHi: "एक रोमांचक और अनोखा अनुभव।",                   exampleEn: "Reading is like an adventure.",            exampleHi: "पढ़ना एक साहसिक कार्य की तरह है।",           category: "school",   emoji: "🗺️" },
  { word: "Question",  hi: "प्रश्न",    meaningEn: "Something you ask to learn more.",           meaningHi: "कुछ पूछना जिससे और सीखा जा सके।",              exampleEn: "I have a question for the teacher.",       exampleHi: "मेरे पास शिक्षक के लिए एक प्रश्न है।",        category: "school",   emoji: "❓" },
  { word: "Story",     hi: "कहानी",     meaningEn: "A tale told in words.",                      meaningHi: "शब्दों में कही गई एक कहानी।",                   exampleEn: "Grandma tells the best stories.",          exampleHi: "दादी सबसे अच्छी कहानियाँ सुनाती हैं।",        category: "school",   emoji: "📖" },

  // Food
  { word: "Delicious", hi: "स्वादिष्ट", meaningEn: "Tasting really good.",                       meaningHi: "बहुत अच्छा स्वाद।",                              exampleEn: "The mango is delicious.",                  exampleHi: "आम स्वादिष्ट है।",                            category: "food",     emoji: "😋" },
  { word: "Sweet",     hi: "मीठा",      meaningEn: "Tastes like sugar or honey.",                meaningHi: "चीनी या शहद जैसा स्वाद।",                        exampleEn: "This apple is very sweet.",                exampleHi: "यह सेब बहुत मीठा है।",                       category: "food",     emoji: "🍎" },

  // Adjectives
  { word: "Tiny",      hi: "छोटा",      meaningEn: "Very very small.",                           meaningHi: "बहुत बहुत छोटा।",                                exampleEn: "A tiny ant walked on my hand.",            exampleHi: "एक छोटी चींटी मेरे हाथ पर चली।",             category: "adjective",emoji: "🐜" },
  { word: "Giant",     hi: "विशाल",     meaningEn: "Very very big.",                             meaningHi: "बहुत बहुत बड़ा।",                                exampleEn: "The giant tree touched the sky.",          exampleHi: "विशाल पेड़ ने आकाश को छू लिया।",              category: "adjective",emoji: "🌳" },
  { word: "Bright",    hi: "चमकीला",    meaningEn: "Full of light or color.",                    meaningHi: "बहुत रोशनी या रंग वाला।",                       exampleEn: "The sun is very bright today.",            exampleHi: "आज सूरज बहुत चमकीला है।",                    category: "adjective",emoji: "☀️" },
  { word: "Silly",     hi: "मूर्ख/मज़ाकिया",meaningEn: "Funny in a playful way.",                 meaningHi: "मज़ाकिया और खिलंदड़ा।",                          exampleEn: "That silly monkey made me laugh.",         exampleHi: "उस मज़ाकिया बंदर ने मुझे हंसा दिया।",         category: "adjective",emoji: "🐒" },
];

export const WORD_INDEX: Record<string, WordEntry> = WORD_DICTIONARY.reduce(
  (acc, w) => { acc[w.word.toLowerCase()] = w; return acc; },
  {} as Record<string, WordEntry>
);

export const CATEGORY_LABEL: Record<WordEntry["category"], { en: string; hi: string }> = {
  feelings:  { en: "Feelings",  hi: "भावनाएँ" },
  nature:    { en: "Nature",    hi: "प्रकृति" },
  people:    { en: "People",    hi: "लोग" },
  action:    { en: "Actions",   hi: "क्रिया" },
  school:    { en: "School",    hi: "स्कूल" },
  food:      { en: "Food",      hi: "खाना" },
  adjective: { en: "Describing", hi: "विशेषण" },
};
