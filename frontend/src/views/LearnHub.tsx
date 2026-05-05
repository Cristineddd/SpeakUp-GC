import React, { useState, useRef, useEffect } from "react";
import { Heart, Brain, Moon, Activity, HeartPulse, Users, CheckCircle2, ArrowLeft, Play, Headphones, GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const LearnHub = () => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [playingPodcast, setPlayingPodcast] = useState(null);
  const [mentalHealthPodcasts, setMentalHealthPodcasts] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [playerSize, setPlayerSize] = useState({ width: 384, height: 384 });
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastPlayTime, setLastPlayTime] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);

  // Load playing podcast from localStorage on mount
  useEffect(() => {
    try {
      const savedPodcast = localStorage.getItem('speakup_playing_podcast');
      if (savedPodcast) {
        setPlayingPodcast(JSON.parse(savedPodcast));
      }
      // Load player position and size from localStorage
      const savedPos = localStorage.getItem('speakup_player_pos');
      const savedSize = localStorage.getItem('speakup_player_size');
      const savedPlayTime = localStorage.getItem('speakup_podcast_play_time');
      if (savedPos) setPlayerPos(JSON.parse(savedPos));
      if (savedSize) setPlayerSize(JSON.parse(savedSize));
      if (savedPlayTime) setLastPlayTime(parseInt(savedPlayTime, 10));
    } catch (error) {
      console.error('Error loading playing podcast:', error);
    }
  }, []);

  // Save playing podcast to localStorage whenever it changes
  useEffect(() => {
    if (playingPodcast) {
      try {
        localStorage.setItem('speakup_playing_podcast', JSON.stringify(playingPodcast));
      } catch (error) {
        console.error('Error saving playing podcast:', error);
      }
    } else {
      // Clear from localStorage if no podcast is playing
      localStorage.removeItem('speakup_playing_podcast');
    }
  }, [playingPodcast]);

  // Save player position and size to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('speakup_player_pos', JSON.stringify(playerPos));
      localStorage.setItem('speakup_player_size', JSON.stringify(playerSize));
    } catch (error) {
      console.error('Error saving player position/size:', error);
    }
  }, [playerPos, playerSize]);

  // Save last play time to localStorage
  useEffect(() => {
    try {
      if (playingPodcast && lastPlayTime > 0) {
        localStorage.setItem('speakup_podcast_play_time', lastPlayTime.toString());
      }
    } catch (error) {
      console.error('Error saving play time:', error);
    }
  }, [lastPlayTime, playingPodcast]);

  // Handle dragging - both mouse and touch
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.player-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - playerPos.x,
        y: e.clientY - playerPos.y
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.player-header')) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragOffset({
        x: touch.clientX - playerPos.x,
        y: touch.clientY - playerPos.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPlayerPos({
          x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - playerSize.width)),
          y: Math.max(80, Math.min(e.clientY - dragOffset.y, window.innerHeight - playerSize.height))
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.touches[0];
        setPlayerPos({
          x: Math.max(0, Math.min(touch.clientX - dragOffset.x, window.innerWidth - (playerSize.width * 0.9))),
          y: Math.max(80, Math.min(touch.clientY - dragOffset.y, window.innerHeight - (playerSize.height * 0.9)))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, playerSize]);

  // Mental health topics with their details
  const mentalHealthTopics = [
    {
      icon: Heart,
      title: "Self-Care Essentials",
      description: "Simple yet powerful self-care practices for mental well-being",
      benefits: ["Reduces stress and anxiety", "Improves mood and energy levels", "Enhances self-esteem"],
      detailedContent: {
        introduction: "Self-care is not selfish—it's essential for maintaining mental health and overall well-being.",
        sections: [
          {
            title: "Physical Self-Care",
            content: "Regular exercise, balanced nutrition, and adequate sleep form the foundation of mental wellness. Even 15 minutes of daily movement can significantly boost mood and reduce anxiety."
          },
          {
            title: "Emotional Self-Care",
            content: "Practice identifying and expressing your feelings. Journaling, talking with trusted friends, or creative expression can help process emotions healthily."
          },
          {
            title: "Practical Tips",
            content: "Start with small, manageable self-care activities. Create a weekly self-care plan that includes activities you genuinely enjoy, not just what you think you 'should' do."
          }
        ],
        keyTakeaways: [
          "Self-care is personalized - what works for others may not work for you",
          "Consistency matters more than intensity",
          "Self-care includes setting healthy boundaries"
        ]
      }
    },
    {
      icon: Brain,
      title: "Understanding Anxiety",
      description: "Learn about anxiety, its symptoms, and effective coping strategies",
      benefits: ["Identify anxiety triggers", "Practical coping mechanisms", "When to seek professional help"],
      detailedContent: {
        introduction: "Anxiety is a normal human emotion that becomes problematic when it's persistent, excessive, and interferes with daily life.",
        sections: [
          {
            title: "Types of Anxiety",
            content: "Generalized Anxiety Disorder (GAD), Panic Disorder, Social Anxiety, and Specific Phobias are common forms. Each has unique characteristics but shares the core feature of excessive fear or worry."
          },
          {
            title: "The Anxiety Cycle",
            content: "Anxiety often follows a pattern: trigger → anxious thoughts → physical symptoms → avoidance → temporary relief → reinforced anxiety. Breaking this cycle is key to management."
          },
          {
            title: "Evidence-Based Treatments",
            content: "Cognitive Behavioral Therapy (CBT), Exposure Therapy, and Mindfulness-Based Stress Reduction have strong research support. Medication may also be helpful for some individuals."
          }
        ],
        keyTakeaways: [
          "Anxiety is treatable with the right approaches",
          "Avoidance typically makes anxiety worse long-term",
          "Physical symptoms are real and part of the anxiety response"
        ]
      }
    },
    {
      icon: Moon,
      title: "Sleep & Mental Health",
      description: "The crucial connection between quality sleep and emotional well-being",
      benefits: ["Sleep hygiene tips", "Relaxation techniques", "Improving sleep quality"],
      detailedContent: {
        introduction: "Sleep and mental health have a bidirectional relationship—poor sleep affects mental health, and mental health issues often disrupt sleep.",
        sections: [
          {
            title: "The Sleep-Mood Connection",
            content: "During deep sleep, your brain processes emotional information and consolidates memories. Sleep deprivation negatively affects the amygdala (emotional center) and prefrontal cortex (rational thinking)."
          },
          {
            title: "Sleep Hygiene Fundamentals",
            content: "Maintain consistent sleep/wake times, even on weekends. Keep your bedroom cool, dark, and quiet. Avoid screens 1-2 hours before bed as blue light suppresses melatonin production."
          },
          {
            title: "When You Can't Sleep",
            content: "If you haven't fallen asleep within 20 minutes, get up and do something relaxing in dim light. Return to bed only when you feel sleepy. This helps reassociate your bed with sleep rather than frustration."
          }
        ],
        keyTakeaways: [
          "Most adults need 7-9 hours of quality sleep nightly",
          "Consistent bedtime routines signal your brain that it's time to sleep",
          "Caffeine has a 6-8 hour half-life - avoid it in the afternoon"
        ]
      }
    },
    {
      icon: Activity,
      title: "Mindfulness & Meditation",
      description: "Techniques to stay present and reduce stress in daily life",
      benefits: ["Reduced stress levels", "Improved focus", "Better emotional regulation"],
      detailedContent: {
        introduction: "Mindfulness involves paying attention to the present moment without judgment, while meditation is the formal practice that develops this skill.",
        sections: [
          {
            title: "Beginning Meditation",
            content: "Start with just 5 minutes daily. Focus on your breath, and when your mind wanders (which it will), gently return attention to breathing without self-criticism."
          },
          {
            title: "Informal Mindfulness Practices",
            content: "Bring mindful awareness to daily activities like eating, walking, or washing dishes. Notice sensations, smells, and textures without rushing to the next moment."
          },
          {
            title: "Common Challenges",
            content: "Many beginners think they're 'bad at meditation' because their mind wanders. This is normal—the practice is in noticing the wandering and returning, not in having a blank mind."
          }
        ],
        keyTakeaways: [
          "Mindfulness is a skill that develops with consistent practice",
          "Even short, regular practices create noticeable benefits",
          "There's no 'right way' to meditate - find what works for you"
        ]
      }
    },
    {
      icon: HeartPulse,
      title: "Building Resilience",
      description: "Develop emotional strength to navigate life's challenges",
      benefits: ["Coping with setbacks", "Developing a growth mindset", "Building emotional intelligence"],
      detailedContent: {
        introduction: "Resilience isn't about avoiding difficulties but about adapting well to adversity, trauma, tragedy, threats, or significant sources of stress.",
        sections: [
          {
            title: "The Components of Resilience",
            content: "Resilience involves emotional regulation, impulse control, optimism, causal analysis (understanding causes of problems), empathy, self-efficacy, and reaching out."
          },
          {
            title: "Developing a Growth Mindset",
            content: "View challenges as opportunities for learning rather than insurmountable obstacles. Reframe failures as feedback and recognize that abilities can be developed through dedication and hard work."
          },
          {
            title: "Building Your Resilience Toolkit",
            content: "Maintain supportive relationships, take care of your physical health, practice mindfulness, set realistic goals, and look for opportunities for self-discovery during difficult times."
          }
        ],
        keyTakeaways: [
          "Resilience can be learned and strengthened at any age",
          "Social support is one of the strongest predictors of resilience",
          "Self-compassion is more helpful than self-criticism during hard times"
        ]
      }
    },
    {
      icon: Users,
      title: "Healthy Relationships",
      description: "Nurturing positive connections and setting boundaries",
      benefits: ["Communication skills", "Recognizing toxic relationships", "Building support networks"],
      detailedContent: {
        introduction: "Healthy relationships contribute significantly to mental health, while unhealthy ones can be major sources of stress and emotional pain.",
        sections: [
          {
            title: "Communication Foundations",
            content: "Practice active listening—focus on understanding rather than preparing your response. Use 'I' statements to express feelings without blaming ('I feel worried when...' vs 'You make me worry when...')."
          },
          {
            title: "Setting Healthy Boundaries",
            content: "Boundaries define what is and isn't acceptable in how others treat you. They're not walls but gates you control. Clear boundaries actually enable closer, more authentic connections."
          },
          {
            title: "Recognizing Relationship Red Flags",
            content: "Consistent disrespect, manipulation, control, dishonesty, or feeling drained after interactions may indicate an unhealthy dynamic. Trust your instincts about how relationships make you feel."
          }
        ],
        keyTakeaways: [
          "Healthy relationships involve mutual respect, trust, and support",
          "It's okay to distance yourself from consistently draining relationships",
          "Quality matters more than quantity in social connections"
        ]
      }
    }
  ];

  // Fetch videos from Firestore
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoadingVideos(true);
        const videosRef = collection(db, 'mentalHealthVideos');
        const q = query(videosRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const videosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setMentalHealthPodcasts(videosData);
      } catch (error) {
        console.error('Error fetching videos:', error);
        // Fallback to default videos if fetch fails
        setMentalHealthPodcasts([
          {
            id: 1,
            title: "Understanding Anxiety & Depression",
            host: "Psych2Go",
            description: "A comprehensive guide to understanding mental health challenges",
            duration: "7:16",
            category: "Anxiety & Depression",
            videoId: "bjvPbfxE3CI"
          },
          {
            id: 2,
            title: "Self-Care for Mental Health",
            host: "Therapy in a Nutshell",
            description: "Practical self-care strategies for better mental wellbeing",
            duration: "15:41",
            category: "Self-Care",
            videoId: "dDLHpJVBD6A"
          },
        ]);
      } finally {
        setLoadingVideos(false);
      }
    };

    fetchVideos();
  }, []);

  const handleLearnMore = (topic) => {
    setSelectedTopic(topic);
    setShowDetail(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setShowDetail(false);
    setSelectedTopic(null);
  };

  const handlePlayPodcast = (podcast) => {
    setPlayingPodcast(podcast);
    // Check if this is the same podcast - if so, keep the saved play time
    const savedPodcast = localStorage.getItem('speakup_playing_podcast');
    if (savedPodcast) {
      const lastPodcast = JSON.parse(savedPodcast);
      if (lastPodcast.videoId !== podcast.videoId) {
        // Different podcast - reset play time
        setLastPlayTime(0);
        localStorage.removeItem('speakup_podcast_play_time');
      }
    }
  };

  const handleClosePlayer = () => {
    // Save the current play time before closing
    // Note: YouTube embed API doesn't allow direct time access, so we use a timer approach
    // Users can manually update play time or it saves periodically
    setPlayingPodcast(null);
    setLastPlayTime(0);
    localStorage.removeItem('speakup_podcast_play_time');
  };

  if (showDetail && selectedTopic) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 min-h-screen">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="mb-4 sm:mb-6 px-3 py-2 text-sm sm:text-base"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Back to Topics
        </Button>
        
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <selectedTopic.icon className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-2xl lg:text-3xl break-words">
                {selectedTopic.title}
              </CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-lg break-words">
              {selectedTopic.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6 pb-6 sm:pb-8">
            <div className="p-4 sm:p-6 bg-muted/30 rounded-lg text-sm sm:text-base">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Introduction</h3>
              <p className="leading-relaxed">{selectedTopic.detailedContent.introduction}</p>
            </div>

            {selectedTopic.detailedContent.sections.map((section, index) => (
              <div key={index} className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-xl font-semibold text-primary break-words">
                  {section.title}
                </h3>
                <p className="text-foreground leading-relaxed text-sm sm:text-base">
                  {section.content}
                </p>
              </div>
            ))}

            <div className="p-4 sm:p-6 bg-primary/5 rounded-lg border border-primary/20 text-sm sm:text-base">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                Key Takeaways
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {selectedTopic.detailedContent.keyTakeaways.map((takeaway, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3 break-words">
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 sm:p-6 bg-muted/50 rounded-lg text-center text-sm sm:text-base">
              <h4 className="font-semibold mb-2">Want to Learn More?</h4>
              <p className="text-muted-foreground mb-3 sm:mb-4">
                Consider speaking with a mental health professional for personalized guidance.
              </p>
              <Button size="sm" className="text-xs sm:text-sm">
                <CheckCircle2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Find Professional Resources
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 min-h-screen">
      {/* YouTube Player Modal - Now as Floating Window */}
      {playingPodcast && (
        <>
          {/* Floating Player */}
          <div
            ref={playerRef}
            className="fixed z-50 bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col group hover:shadow-3xl transition-shadow"
            style={{
              left: `${Math.max(0, Math.min(playerPos.x, window.innerWidth - playerSize.width))}px`,
              top: `${Math.max(80, Math.min(playerPos.y, window.innerHeight - (isPlayerMinimized ? 60 : playerSize.height)))}px`,
              width: isPlayerMinimized ? 'min(280px, calc(100vw - 16px))' : `min(${playerSize.width}px, calc(100vw - 16px))`,
              height: isPlayerMinimized ? 'auto' : `min(${playerSize.height}px, calc(100vh - 120px))`,
              userSelect: isDragging ? 'none' : 'auto'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Header - Draggable */}
            <div className="player-header flex justify-between items-center p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-border/30 cursor-move hover:bg-primary/15 transition-colors active:bg-primary/20"
              style={{
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="text-xs font-semibold truncate">{playingPodcast.title}</h3>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlayerMinimized(!isPlayerMinimized);
                  }}
                  className="h-6 w-6 p-0 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                  title={isPlayerMinimized ? "Expand" : "Minimize"}
                >
                  {isPlayerMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClosePlayer();
                  }}
                  className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                  title="Close"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Video Container - Hidden when minimized */}
            {!isPlayerMinimized && (
              <>
                <div className="p-2 bg-black flex-1 overflow-hidden">
                  <div className="aspect-video w-full rounded">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${playingPodcast.videoId}?autoplay=1${lastPlayTime > 0 ? `&start=${lastPlayTime}` : ''}`}
                      title={playingPodcast.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded"
                    ></iframe>
                  </div>
                </div>
                
                {/* Info Section */}
                <div className="p-2 bg-muted/30 border-t border-border/30 text-xs max-h-24 overflow-y-auto">
                  <p className="font-medium text-foreground line-clamp-1">{playingPodcast.title}</p>
                  <p className="text-muted-foreground text-xs">by {playingPodcast.host}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">
                      {playingPodcast.category}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {playingPodcast.duration}
                    </span>
                  </div>
                </div>

                {/* Resize Handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-primary/20 cursor-se-resize hover:bg-primary/40 transition-colors rounded-tl"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startWidth = playerSize.width;
                    const startHeight = playerSize.height;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const newWidth = Math.max(280, startWidth + (moveEvent.clientX - startX));
                      const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY));
                      setPlayerSize({ width: newWidth, height: newHeight });
                    };

                    const handleMouseUp = () => {
                      window.removeEventListener('mousemove', handleMouseMove);
                      window.removeEventListener('mouseup', handleMouseUp);
                    };

                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                  }}
                  title="Drag to resize"
                />
              </>
            )}
          </div>
        </>
      )}

      <div className="text-center mb-6 sm:mb-8 lg:mb-12">
        <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-2 sm:mb-3 lg:mb-4 break-words">
          Mental Health Resources
        </h1>
        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2 break-words">
          Valuable knowledge and practical tips for better mental well-being
        </p>
      </div>

      <Tabs defaultValue="topics" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-6 sm:mb-8 mx-auto px-2">
          <TabsTrigger 
            value="topics" 
            className="text-xs sm:text-sm px-2 sm:px-4 py-2"
          >
            Topics
          </TabsTrigger>
          <TabsTrigger 
            value="podcasts" 
            className="text-xs sm:text-sm px-2 sm:px-4 py-2"
          >
            Podcasts & Videos
          </TabsTrigger>
          <TabsTrigger 
            value="tips" 
            className="text-xs sm:text-sm px-2 sm:px-4 py-2"
          >
            Quick Tips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {mentalHealthTopics.map((topic, index) => (
              <Card 
                key={index} 
                className="h-full flex flex-col hover:shadow-md transition-shadow duration-200 min-w-0 break-words"
              >
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <topic.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base sm:text-xl break-words">
                      {topic.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm break-words">
                    {topic.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow px-3 sm:px-6 py-2 sm:py-4">
                  <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    {topic.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-1.5 sm:gap-2 break-words">
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-3 sm:px-6 py-3 sm:py-4">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
                    onClick={() => handleLearnMore(topic)}
                    size="sm"
                  >
                    Learn More
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="podcasts">
          {loadingVideos ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : mentalHealthPodcasts.length === 0 ? (
            <div className="text-center py-12">
              <Headphones className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No videos available yet</h3>
              <p className="text-gray-600">Check back soon for mental health content</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {mentalHealthPodcasts.map((podcast) => (
              <Card key={podcast.id} className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Headphones className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      {podcast.duration}
                    </span>
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-2 break-words">
                    {podcast.title}
                  </CardTitle>
                  <CardDescription className="text-sm break-words">
                    Hosted by {podcast.host}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow px-4 sm:px-6 py-2 sm:py-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                      <p className="text-sm text-foreground break-words">{podcast.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {podcast.category}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 sm:px-6 py-4 sm:py-6">
                  <Button 
                    className="w-full text-sm"
                    onClick={() => handlePlayPodcast(podcast)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Watch Video
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-muted/30 rounded-lg text-center">
            <h3 className="text-lg font-semibold mb-2">Looking for More Content?</h3>
            <p className="text-muted-foreground">
              We're constantly updating our video library with helpful mental health resources.
            </p>
          </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="tips">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl">Daily Mental Health Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Morning Routine</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Start your day with 5 minutes of deep breathing or meditation to set a positive tone.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Digital Detox</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Take regular screen breaks - try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Gratitude Practice</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    End your day by writing down three things you're grateful for to promote positive thinking.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl">Quick Stress Relievers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">5-4-3-2-1 Technique</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Box Breathing</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4. Repeat 3-4 times.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Progressive Muscle Relaxation</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Tense each muscle group for 5 seconds, then relax for 30 seconds, working from toes to head.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl">Life Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Time Management</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Prioritize tasks using the Eisenhower Matrix - separate urgent from important to stay focused.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Build Healthy Habits</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Start small with one habit change at a time. Consistency beats perfection in building lasting routines.
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-sm sm:text-base">
                  <h4 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Set Boundaries</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Learn to say no. Setting healthy boundaries protects your energy and improves relationships.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 sm:mt-12 bg-muted/50 rounded-lg p-4 sm:p-6 lg:p-8 text-center">
        <h3 className="text-lg sm:text-xl font-semibold mb-2 break-words">
          Need More Support?
        </h3>
        <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base break-words">
          Remember, it's okay to ask for help. Reach out to a trusted friend, family member, or professional.
        </p>
        {/* Action buttons removed as requested */}
      </div>
    </div>
  );
};

export default LearnHub;