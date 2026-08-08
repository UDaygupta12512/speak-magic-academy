import { BookOpen } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import StoryCard from "@/components/StoryCard";
import { useNavigate } from "react-router-dom";
import { stories } from "@/data/stories";

const Stories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Story Audio Book"
        showBack
        icon={<BookOpen className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {stories.map((story, index) => (
            <StoryCard
              key={story.id}
              title={story.title}
              description={story.description}
              duration={story.duration}
              image={story.image}
              delay={index}
              onClick={() => navigate(`/story/${story.id}`)}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Stories;
