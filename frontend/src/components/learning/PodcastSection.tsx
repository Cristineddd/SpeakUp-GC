import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Headphones } from 'lucide-react';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  duration: string;
  tags: string[];
}

const podcasts: PodcastEpisode[] = [
  {
    id: "1",
    title: "Understanding Title IX and Student Rights",
    description: "A comprehensive discussion about student rights and protections under Title IX.",
    youtubeUrl: "https://www.youtube.com/embed/your-video-id-1",
    duration: "25:30",
    tags: ["Rights", "Education", "Protection"]
  },
  {
    id: "2",
    title: "Recognizing and Responding to Harassment",
    description: "Expert insights on identifying harassment and taking appropriate action.",
    youtubeUrl: "https://www.youtube.com/embed/your-video-id-2",
    duration: "32:15",
    tags: ["Awareness", "Response", "Safety"]
  },
  {
    id: "3",
    title: "Building a Safe Campus Environment",
    description: "Strategies for creating and maintaining a respectful academic community.",
    youtubeUrl: "https://www.youtube.com/embed/your-video-id-3",
    duration: "28:45",
    tags: ["Campus Safety", "Community", "Prevention"]
  },
  {
    id: "4",
    title: "Supporting Survivors: A Guide",
    description: "Understanding how to support those affected by harassment.",
    youtubeUrl: "https://www.youtube.com/embed/your-video-id-4",
    duration: "35:20",
    tags: ["Support", "Resources", "Healing"]
  }
];

const PodcastSection = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {podcasts.map((podcast) => (
          <Card key={podcast.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {podcast.title}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Duration: {podcast.duration}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {podcast.description}
                </p>
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full rounded-lg"
                    src={podcast.youtubeUrl}
                    title={podcast.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {podcast.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
  );
};

export default PodcastSection;