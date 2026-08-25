'use client';

import { Link } from "../../compat/router";
import { Home } from "lucide-react";

export interface InfoSection {
  title: string;
  content: string | string[];
}

interface InfoPageLayoutProps {
  title: string;
  description: string;
  sections: InfoSection[];
  lastUpdated?: string;
  links: { label: string; href: string }[];
}

const InfoPageLayout = ({ title, description, sections, lastUpdated, links }: InfoPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0f1412] text-gray-900 font-sans">
      <div className="max-w-3xl landscape:max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <Home className="w-4 h-4" />
          Home
        </Link>

        <div className="landscape:flex landscape:gap-10 landscape:items-start">
          <div className="landscape:min-w-0 landscape:flex-1">
            <header className="mb-8 pb-6 border-b border-gray-200">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{title}</h1>
              <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              {lastUpdated && (
                <p className="text-xs text-gray-400 mt-3">Last updated: {lastUpdated}</p>
              )}
            </header>

            <div className="space-y-6">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-sm font-bold text-gray-900 mb-2">{section.title}</h2>
                  {Array.isArray(section.content) ? (
                    <ul className="space-y-1.5">
                      {section.content.map((item) => (
                        <li
                          key={item}
                          className="text-sm text-gray-600 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                  )}
                </section>
              ))}
            </div>
          </div>

          <aside className="mt-10 pt-6 border-t border-gray-200 landscape:mt-0 landscape:pt-0 landscape:border-t-0 landscape:border-l landscape:pl-8 landscape:w-52 landscape:shrink-0 landscape:sticky landscape:top-10">
            <p className="text-xs text-gray-400 mb-3">Related</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 landscape:flex-col landscape:gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm text-[#1D9E75] hover:text-[#178F65] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default InfoPageLayout;
