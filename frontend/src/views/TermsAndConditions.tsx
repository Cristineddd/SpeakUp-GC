import { useNavigate } from '../compat/router'
import { ArrowLeft, Shield, FileCheck, Users, Copyright, AlertTriangle, RefreshCw, ArrowRight, Users2 } from 'lucide-react'
import { Button } from '../components/ui/button'

const TermsAndConditions = () => {
  const navigate = useNavigate()

  const sections = [
    {
      icon: FileCheck,
      title: "Acceptable Use",
      content: "SpeakUp GC is a platform for reporting gender-based violence and harassment incidents in accordance with Philippine law. You agree to use this platform only for legitimate reporting purposes and not for false, malicious, or defamatory complaints."
    },
    {
      icon: Users,
      title: "Eligibility",
      content: "This platform is available to students, faculty, staff, and authorized personnel of Gordon College. By using SpeakUp GC, you confirm that you are eligible to file complaints under the Gordon College Committee on Decorum and Investigation (CODI)."
    },
    {
      icon: AlertTriangle,
      title: "Prohibited Actions",
      content: "You may not use SpeakUp GC to: (a) submit false or fabricated reports; (b) harass, threaten, or defame any individual; (c) violate any applicable laws or regulations; or (d) interfere with the proper functioning of the platform."
    },
    {
      icon: Shield,
      title: "Governing Law",
      content: "This platform operates under Republic Act No. 11313 (Safe Spaces Act), Republic Act No. 7877 (Anti-Sexual Harassment Act), and the Gordon College Committee on Decorum and Investigation (GC-CODI) procedures. All complaints are subject to investigation and resolution in accordance with these legal frameworks."
    },
    {
      icon: RefreshCw,
      title: "Modifications",
      content: "Gordon College reserves the right to modify these terms at any time. Continued use of the platform constitutes acceptance of any changes."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-emerald-50/50">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200 hover:border-green-500 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-lg shadow-green-500/30">
            <FileCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Terms & Conditions
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Welcome to SpeakUp GC. By using our platform, you agree to these terms and conditions. Please read them carefully to understand your rights and responsibilities.
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-16">
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 pt-1">
                    {section.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed ml-14">
                  {section.content}
                </p>
              </div>
            )
          })}
        </div>

        {/* Last Updated */}
        <p className="text-center text-sm text-gray-400 mt-12">
          Last updated: March 17, 2026
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end mt-12 pt-8 border-t border-gray-200">
          <Button
            onClick={() => navigate('/privacy')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <span>Privacy Policy</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/mission')}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <span>Mission</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TermsAndConditions
