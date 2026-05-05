import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from 'lucide-react';

interface QuickTip {
  id: string;
  title: string;
  content: string;
  category: string;
}

const quickTips: QuickTip[] = [
  {
    id: "1",
    title: "Trust Your Instincts",
    content: "If a situation feels uncomfortable or inappropriate, trust your feelings. It's okay to remove yourself from situations that make you uneasy.",
    category: "Personal Safety"
  },
  {
    id: "2",
    title: "Document Everything",
    content: "Keep records of any concerning incidents, including dates, times, locations, and witnesses. Save relevant messages, emails, or screenshots.",
    category: "Documentation"
  },
  {
    id: "3",
    title: "Know Your Resources",
    content: "Familiarize yourself with campus support services, including counseling, security, and student advocacy offices. Save emergency contact numbers.",
    category: "Resources"
  },
  {
    id: "4",
    title: "Speak Up Safely",
    content: "If you witness harassment, speak up if it's safe to do so. Use distraction techniques or get help from authorities when needed.",
    category: "Bystander Intervention"
  },
  {
    id: "5",
    title: "Set Clear Boundaries",
    content: "Clearly communicate your boundaries and respect others' boundaries. It's okay to say 'no' to uncomfortable situations.",
    category: "Communication"
  },
  {
    id: "6",
    title: "Seek Support Early",
    content: "Don't wait for a situation to escalate. Reach out to trusted friends, mentors, or counselors for support and guidance.",
    category: "Support"
  }
];

const QuickTipsSection = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickTips.map((tip) => (
          <Card key={tip.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  {tip.title}
                </CardTitle>
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {tip.category}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {tip.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
  );
};

export default QuickTipsSection;