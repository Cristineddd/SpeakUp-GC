import { Link, useNavigate } from "../../compat/router";
import { ArrowLeft } from "lucide-react";

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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

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

        <footer className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 mb-3">Related</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
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
        </footer>
      </div>
    </div>
  );
};

export default InfoPageLayout;
