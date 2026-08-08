import storyMagicPencil from "@/assets/story-magic-pencil.png";
import storyTeamwork from "@/assets/story-teamwork.png";
import storyBraveMouse from "@/assets/story-brave-mouse.png";
import storyMelody from "@/assets/story-melody.png";

export interface Story {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  audioUrl: string;
  paragraphs: string[];
  timestamps?: number[]; // seconds for each paragraph
}

export const stories: Story[] = [
  {
    id: "magic-pencil",
    title: "The Magic Pencil",
    description: "A magical adventure about creativity and imagination",
    duration: "2:24",
    image: storyMagicPencil,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    paragraphs: [
      "Once upon a time, in a small village, there lived a young girl named Maya who loved to draw more than anything in the world.",
      "One rainy afternoon, Maya found an old pencil hidden in her grandmother's attic. It sparkled with golden dust and felt warm in her hand.",
      "When Maya drew a butterfly with the pencil, something magical happened – the butterfly came to life and flew around her room!",
      "She discovered that anything she drew with this special pencil would become real. Maya was so excited!",
      "First, she drew a beautiful garden full of colorful flowers. Then she drew a friendly puppy who wagged its tail happily.",
      "But Maya soon learned that with great power comes great responsibility. She had to be very careful what she drew.",
      "One day, she drew a rain cloud by accident, and it rained inside her house! Maya quickly learned to think before she drew.",
      "From that day on, Maya used her magic pencil to help others – drawing food for the hungry and homes for those who needed them.",
      "And so, Maya became known as the girl with the magic pencil, spreading joy and wonder wherever she went.",
      "The end. Remember, creativity is the most magical power of all!"
    ],
    timestamps: [0, 15, 30, 45, 60, 80, 100, 115, 130, 140]
  },
  {
    id: "teamwork",
    title: "Teamwork & Leadership",
    description: "Learn the importance of working together with kindness",
    duration: "1:18",
    image: storyTeamwork,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    paragraphs: [
      "In a busy forest, there lived many animals who each had their own special talents.",
      "Bear was strong and could carry heavy logs. Rabbit was fast and could deliver messages quickly. Owl was wise and knew many things.",
      "One day, a big storm knocked down a tree that blocked the only path to the river where all the animals got their water.",
      "Bear tried to move it alone, but it was too heavy. Rabbit ran around looking for another path, but there was none.",
      "Then little Mouse had an idea. 'What if we all work together?' she suggested.",
      "So Bear pushed, while the squirrels tied ropes, and the birds called out directions. Even the smallest creatures helped!",
      "Together, they moved the tree in no time. That day, every animal learned that teamwork makes even the hardest jobs possible.",
      "The end. Remember, we are stronger together!"
    ],
    timestamps: [0, 10, 22, 35, 45, 55, 68, 76]
  },
  {
    id: "brave-mouse",
    title: "The Brave Little Mouse",
    description: "A tale of courage and overcoming fears",
    duration: "2:21",
    image: storyBraveMouse,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    paragraphs: [
      "Pip was the smallest mouse in his family, and he was afraid of almost everything.",
      "He was scared of the dark, scared of loud noises, and especially scared of the big cat who lived in the house.",
      "One night, Pip's little sister Daisy got lost in the garden. The whole family was worried sick!",
      "'Someone has to find her!' cried Mother Mouse. But Father Mouse was too big to fit through the fence, and the others were too scared.",
      "Pip's heart was pounding, but he thought of his little sister alone and afraid. 'I'll go,' he said in a tiny voice.",
      "Into the dark garden Pip went, his little legs trembling. He heard owls hooting and leaves rustling, but he kept going.",
      "Finally, he found Daisy hiding under a flower pot. 'Pip! You came for me!' she squeaked happily.",
      "When they got home safely, everyone cheered for Pip. He was still small, but now everyone knew he had the biggest heart.",
      "Pip learned that being brave doesn't mean you're not scared – it means you do what's right even when you are scared.",
      "The end. Remember, courage comes in all sizes!"
    ],
    timestamps: [0, 14, 28, 42, 58, 74, 90, 106, 122, 136]
  },
  {
    id: "melody",
    title: "The Melody of Friendship",
    description: "A heartwarming story about friendship and music",
    duration: "2:18",
    image: storyMelody,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    paragraphs: [
      "In a cozy music school, there was a piano named Ivory and a violin named Melody.",
      "Ivory could play beautiful low notes that made everyone feel calm. Melody could play high notes that made everyone want to dance.",
      "But Ivory and Melody never played together. Each thought their music was better than the other's.",
      "One day, a little girl came to the music school. She sat between them and started to play.",
      "She played a few notes on Ivory, then picked up Melody's bow and played some notes on the violin too.",
      "The sounds mixed together in the air and created the most beautiful music anyone had ever heard!",
      "Ivory and Melody were amazed. 'I never knew we could sound so wonderful together!' said Ivory.",
      "'Neither did I!' replied Melody. 'Let's always play together from now on!'",
      "And so, the piano and the violin became the best of friends, teaching everyone that different doesn't mean better – it means together we're amazing!",
      "The end. Remember, our differences make beautiful harmony!"
    ],
    timestamps: [0, 14, 28, 42, 55, 68, 82, 96, 110, 130]
  }
];
